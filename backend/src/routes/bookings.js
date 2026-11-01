// ============================================================
// MansaRent — Réservations court séjour (type Airbnb)
// Le voyageur choisit ses dates → demande → l'hôte accepte → le voyageur
// paie dans l'appli (24 h) → dates confirmées. Prix voyageur = prix hôte + 10 %.
// ============================================================
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { Mailer } from "../lib/email.js";
import { Push } from "../lib/push.js";
import {
  isShortStay, isHotel, parseDay, todayUTC, nightsBetween, dayStr, overlapping, bookingStatus, freeUnits, blockedRanges,
} from "../lib/deals.js";
import { quote, refundOnCancel, PAY_WINDOW_H, REFUND_WINDOW_H } from "../lib/payments.js";
import { MansaSend } from "../lib/mansasend.js";

const router = Router();
const MAX_NIGHTS = 90;

const fmt = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const gnf = (n) => `${new Intl.NumberFormat("fr-FR").format(n).replace(/\u202f|\u00a0/g, " ")} GNF`;

/** Conversation directe voyageur ↔ hôte (réutilisée si elle existe). */
async function directConv(propertyId, guestId, hostId) {
  const existing = await prisma.conversation.findFirst({ where: { kind: "direct", propertyId, tenantId: guestId, landlordId: hostId } });
  return existing || prisma.conversation.create({ data: { kind: "direct", propertyId, tenantId: guestId, landlordId: hostId } });
}

function notify(userId, title, body, data = {}) {
  Push.toUser(userId, { title, body, data: { type: "booking", ...data } }).catch(() => {});
  prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
    .then((u) => u?.email && Mailer.bookingUpdate(u.email, u.name, title, body).catch(() => {}))
    .catch(() => {});
}

const PROPERTY_FIELDS = { id: true, title: true, city: true, neighborhood: true, images: true, price: true, checkInTime: true, checkOutTime: true, rentalType: true };

/** Paiement en ligne actif (MansaSend) ? Sinon : paiement à l'arrivée. */
const payOnline = () => MansaSend.configured();
const PERSON = { id: true, name: true, username: true, avatar: true };

async function present(rows) {
  if (!rows.length) return [];
  const ids = [...new Set(rows.flatMap((b) => [b.guestId, b.hostId]))];
  const [people, convs] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: PERSON }),
    prisma.conversation.findMany({
      where: { kind: "direct", OR: rows.map((b) => ({ propertyId: b.propertyId, tenantId: b.guestId, landlordId: b.hostId })) },
      select: { id: true, propertyId: true, tenantId: true, landlordId: true },
    }),
  ]);
  const byId = Object.fromEntries(people.map((u) => [u.id, u]));
  const convOf = (b) => convs.find((c) => c.propertyId === b.propertyId && c.tenantId === b.guestId && c.landlordId === b.hostId)?.id || null;
  return rows.map((b) => ({
    ...b,
    guestPricePerNight: b.nights ? Math.round(b.total / b.nights) : b.total,
    canPayOnline: MansaSend.configured(),
    payBy: b.acceptedAt ? new Date(new Date(b.acceptedAt).getTime() + PAY_WINDOW_H * 3600000) : null,
    refundUntil: new Date(new Date(b.checkIn).getTime() - REFUND_WINDOW_H * 3600000),
    conversationId: convOf(b),
    checkIn: dayStr(b.checkIn),
    checkOut: dayStr(b.checkOut),
    status: bookingStatus(b),
    guest: byId[b.guestId] || null,
    host: byId[b.hostId] || null,
  }));
}

// ---- Dates déjà prises (public) -----------------------------------------------
router.get("/availability/:propertyId", async (req, res) => {
  try {
    const p = await prisma.property.findUnique({ where: { id: req.params.propertyId }, select: { id: true, units: true } });
    if (!p) return res.status(404).json({ error: "Annonce introuvable" });
    // Hôtel : une nuit n'est bloquée que si toutes les chambres de ce type sont prises.
    res.json({ blocked: await blockedRanges(p), units: p.units, payOnline: payOnline() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Disponibilités impossibles à charger" });
  }
});

// ---- Demande de réservation -----------------------------------------------------
const createSchema = z.object({
  propertyId: z.string().min(1),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().min(1).max(200),
  units: z.number().int().min(1).max(50).optional().default(1), // hôtel : chambres
  message: z.string().max(1500).optional().default(""),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });
  const { propertyId, guests, message } = parsed.data;
  let units = parsed.data.units;
  const checkIn = parseDay(parsed.data.checkIn);
  const checkOut = parseDay(parsed.data.checkOut);
  if (!checkIn || !checkOut) return res.status(400).json({ error: "Dates invalides", code: "BAD_DATES" });
  try {
    const p = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!p) return res.status(404).json({ error: "Annonce introuvable" });
    if (!isShortStay(p)) return res.status(400).json({ error: "Réservation possible uniquement en court séjour" });
    if (p.status !== "available") return res.status(400).json({ error: "Ce logement n'est plus disponible" });
    if (p.landlordId === req.user.id) return res.status(400).json({ error: "Vous êtes l'hôte de ce logement" });
    if (checkIn < todayUTC()) return res.status(400).json({ error: "La date d'arrivée est passée", code: "PAST" });
    const nights = nightsBetween(checkIn, checkOut);
    if (nights < 1) return res.status(400).json({ error: "Le départ doit être après l'arrivée", code: "BAD_DATES" });
    if (nights < p.minNights) return res.status(400).json({ error: `Minimum ${p.minNights} nuit(s)`, code: "MIN_NIGHTS", minNights: p.minNights });
    if (nights > MAX_NIGHTS) return res.status(400).json({ error: `Maximum ${MAX_NIGHTS} nuits`, code: "MAX_NIGHTS" });
    const hotel = isHotel(p);
    if (!hotel) units = 1;
    if (units > Math.max(1, p.units || 1)) return res.status(400).json({ error: `Maximum ${p.units} chambre(s)`, code: "MAX_UNITS" });
    const maxGuests = (p.maxGuests || 1) * units;
    if (guests > maxGuests) return res.status(400).json({ error: `Maximum ${maxGuests} voyageur(s)`, code: "MAX_GUESTS", maxGuests });
    const free = await freeUnits(p, checkIn, checkOut);
    if (free < units) {
      return res.status(409).json({ error: free > 0 ? `Plus que ${free} chambre(s) libre(s) à ces dates` : "Ces dates sont déjà réservées", code: "DATES_TAKEN", free });
    }
    const dup = await prisma.booking.findFirst({
      where: { propertyId: p.id, guestId: req.user.id, status: "pending", checkIn: { lt: checkOut }, checkOut: { gt: checkIn } },
    });
    if (dup) return res.status(409).json({ error: "Vous avez déjà une demande en attente pour ces dates", code: "DUPLICATE" });

    // Le voyageur paie le prix de l'hôte + la commission MansaRent (10 %), par chambre.
    const { hostAmount, commission, total } = quote(p.price * units, nights);
    // Hôtel : confirmation immédiate (chambres libres vérifiées). Logement : l'hôte accepte.
    const online = payOnline();
    const booking = await prisma.booking.create({
      data: {
        propertyId: p.id, guestId: req.user.id, hostId: p.landlordId, checkIn, checkOut, nights, guests, units,
        pricePerNight: p.price, hostAmount, commission, total, message: message?.trim() || null,
        ...(hotel ? { status: "accepted", acceptedAt: new Date(), paymentStatus: online ? "unpaid" : "on_arrival" } : {}),
      },
    });
    const conv = await directConv(p.id, req.user.id, p.landlordId);
    const rooms = hotel ? ` · ${units} chambre(s)` : "";
    const payNote = online ? (hotel ? "à payer dans l'appli sous 24 h" : "paiement dans l'appli après acceptation") : "paiement à l'arrivée";
    const summary = `📅 ${hotel ? "Réservation" : "Demande de réservation"}\n${fmt(checkIn)} → ${fmt(checkOut)} · ${nights} nuit(s) · ${guests} voyageur(s)${rooms}\nTotal : ${gnf(total)} — ${payNote}`;
    await prisma.message.create({
      data: { conversationId: conv.id, senderId: req.user.id, text: message?.trim() ? `${summary}\n\n${message.trim()}` : summary },
    });
    notify(p.landlordId, hotel ? "Nouvelle réservation confirmée 🛎️" : "Nouvelle demande de réservation",
      `${req.user.name} · ${p.title} · ${fmt(checkIn)} → ${fmt(checkOut)}${rooms} · votre part : ${gnf(hostAmount)} (réservé via MansaRent).`,
      { bookingId: booking.id, conversationId: conv.id });
    const [out] = await present([booking]);
    res.status(201).json({ booking: out, conversationId: conv.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Réservation impossible" });
  }
});

// ---- Mes séjours (voyageur) / Réservations reçues (hôte) -----------------------
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const rows = await prisma.booking.findMany({
      where: { guestId: req.user.id },
      include: { property: { select: PROPERTY_FIELDS } },
      orderBy: { checkIn: "desc" },
      take: 100,
    });
    res.json({ bookings: await present(rows) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Réservations impossibles à charger" });
  }
});

router.get("/host", requireAuth, async (req, res) => {
  try {
    const rows = await prisma.booking.findMany({
      where: { hostId: req.user.id },
      include: { property: { select: PROPERTY_FIELDS } },
      orderBy: [{ status: "asc" }, { checkIn: "asc" }],
      take: 200,
    });
    const out = await present(rows);
    res.json({ bookings: out, pending: out.filter((b) => b.status === "pending").length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Réservations impossibles à charger" });
  }
});

// ---- Accepter / refuser (hôte) · annuler (voyageur ou hôte) --------------------
router.put("/:id", requireAuth, async (req, res) => {
  const action = req.body?.action;
  if (!["accept", "decline", "cancel"].includes(action)) return res.status(400).json({ error: "Action invalide" });
  try {
    const b = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { property: { select: { title: true } } } });
    if (!b) return res.status(404).json({ error: "Réservation introuvable" });
    const isHost = b.hostId === req.user.id || req.user.role === "admin";
    const isGuest = b.guestId === req.user.id;
    if (!isHost && !isGuest) return res.status(403).json({ error: "Non autorisé" });

    let status;
    if (action === "accept" || action === "decline") {
      if (!isHost) return res.status(403).json({ error: "Seul l'hôte peut répondre" });
      if (b.status !== "pending") return res.status(400).json({ error: "Cette demande a déjà reçu une réponse" });
      if (action === "accept") {
        const prop = await prisma.property.findUnique({ where: { id: b.propertyId }, select: { id: true, units: true } });
        if ((await freeUnits(prop, b.checkIn, b.checkOut, b.id)) < (b.units || 1)) {
          return res.status(409).json({ error: "Ces dates sont déjà prises par une autre réservation", code: "DATES_TAKEN" });
        }
      }
      status = action === "accept" ? "accepted" : "declined";
    } else {
      if (!["pending", "accepted"].includes(b.status)) return res.status(400).json({ error: "Réservation déjà close" });
      if (b.status === "accepted" && new Date(b.checkIn) <= todayUTC()) return res.status(400).json({ error: "Le séjour a déjà commencé" });
      status = "cancelled";
    }
    const updated = await prisma.booking.update({
      where: { id: b.id },
      data: {
        status,
        // Paiement en ligne en pause : réservation confirmée, le voyageur paie sur place.
        ...(status === "accepted" ? { acceptedAt: new Date(), ...(payOnline() ? {} : { paymentStatus: "on_arrival" }) } : {}),
        ...(status === "cancelled" ? { cancelReason: req.user.id === b.guestId ? "Annulée par le voyageur" : "Annulée par l'hôte" } : {}),
      },
    });
    // Séjour déjà payé et annulé : remboursement selon la règle des 48 h (toujours intégral si c'est l'hôte).
    let refund = { refunded: 0 };
    if (status === "cancelled" && b.paymentStatus === "paid") refund = await refundOnCancel(b, { byHost: req.user.id !== b.guestId });

    // Dates confirmées : les autres demandes sur ces dates sont refusées automatiquement.
    if (status === "accepted") {
      const prop = await prisma.property.findUnique({ where: { id: b.propertyId }, select: { id: true, units: true } });
      const clashes = [];
      for (const c of await overlapping(b.propertyId, b.checkIn, b.checkOut, ["pending"])) {
        if ((await freeUnits(prop, c.checkIn, c.checkOut)) < (c.units || 1)) clashes.push(c);
      }
      for (const c of clashes) {
        await prisma.booking.update({ where: { id: c.id }, data: { status: "declined" } });
        notify(c.guestId, "Dates indisponibles", `Votre demande pour « ${b.property.title} » (${fmt(c.checkIn)} → ${fmt(c.checkOut)}) n'a pas pu être acceptée : ces dates viennent d'être réservées.`);
      }
    }
    const conv = await directConv(b.propertyId, b.guestId, b.hostId);
    const label = {
      accepted: payOnline() ? `✅ Demande acceptée — payez dans l'appli sous ${PAY_WINDOW_H} h pour confirmer` : "✅ Réservation confirmée — paiement à l'arrivée",
      declined: "❌ Réservation refusée",
      cancelled: refund.refunded ? `Réservation annulée · remboursement de ${gnf(refund.refunded)}` : "Réservation annulée",
    }[status];
    await prisma.message.create({
      data: { conversationId: conv.id, senderId: req.user.id, text: `${label} · ${fmt(b.checkIn)} → ${fmt(b.checkOut)}` },
    });
    const otherId = req.user.id === b.guestId ? b.hostId : b.guestId;
    notify(otherId, label, `« ${b.property.title} » · ${fmt(b.checkIn)} → ${fmt(b.checkOut)}`, { bookingId: b.id, conversationId: conv.id });
    const [out] = await present([await prisma.booking.findUnique({ where: { id: b.id }, include: { property: { select: PROPERTY_FIELDS } } })]);
    res.json({ booking: out, refunded: refund.refunded });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Mise à jour impossible" });
  }
});

export default router;
