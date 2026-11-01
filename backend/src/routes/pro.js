// ============================================================
// MansaRent — Espace professionnel (agent / vendeur-propriétaire)
//   GET  /api/pro/me         → profil + statut de vérification
//   PUT  /api/pro/me         → soumettre / mettre à jour le profil (→ en attente)
//   GET  /api/pro/dashboard  → annonces + statistiques du tableau de bord
// ============================================================
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { encryptSecret, decryptSecret } from "../lib/secrets.js";
import { isPro, statsFor } from "../lib/pro.js";

const router = Router();
router.use(requireAuth);

const ID_TYPES = ["national_id", "passport", "driver_license", "voter_card"];

const profileSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(4).max(240),
  city: z.string().trim().min(2).max(80),
  idType: z.enum(ID_TYPES),
  idNumber: z.string().trim().min(4).max(40).optional(), // absent = garder l'actuel
  yearsExperience: z.number().int().min(0).max(70).optional().default(0),
  agencyName: z.string().trim().max(120).optional().nullable(),
  licenseNumber: z.string().trim().max(60).optional().nullable(),
  bio: z.string().trim().max(1500).optional().nullable(),
  stars: z.number().int().min(1).max(5).optional().nullable(), // hôtel
});

const mask = (v) => {
  if (!v) return "";
  const s = String(v);
  return s.length <= 4 ? "••••" : `••••${s.slice(-4)}`;
};

function view(user, profile) {
  let idNumberMasked = "";
  if (profile?.idNumber) {
    try { idNumberMasked = mask(decryptSecret(profile.idNumber)); } catch { idNumberMasked = "••••"; }
  }
  return {
    role: user.role,
    verification: user.verification,
    profile: profile
      ? {
          kind: profile.kind,
          fullName: profile.fullName,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          idType: profile.idType,
          idNumberMasked,
          yearsExperience: profile.yearsExperience,
          agencyName: profile.agencyName,
          licenseNumber: profile.licenseNumber,
          bio: profile.bio,
          stars: profile.stars ?? null,
          rejectionReason: user.verification === "rejected" ? profile.rejectionReason : null,
          submittedAt: profile.submittedAt,
          reviewedAt: profile.reviewedAt,
        }
      : null,
  };
}

router.get("/me", async (req, res) => {
  try {
    const profile = await prisma.proProfile.findUnique({ where: { userId: req.user.id } });
    res.json(view(req.user, profile));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Profil impossible à charger" });
  }
});

router.put("/me", async (req, res) => {
  if (!isPro(req.user)) {
    return res.status(403).json({ error: "Réservé aux agents et propriétaires", code: "ROLE_REQUIRED" });
  }
  const parsed = profileSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
  }
  const d = parsed.data;
  try {
    const existing = await prisma.proProfile.findUnique({ where: { userId: req.user.id } });
    if (!existing && !d.idNumber) {
      return res.status(400).json({ error: "Numéro de pièce d'identité requis", code: "ID_REQUIRED" });
    }
    const data = {
      kind: req.user.role,
      fullName: d.fullName,
      phone: d.phone,
      address: d.address,
      city: d.city,
      idType: d.idType,
      yearsExperience: req.user.role === "agent" ? d.yearsExperience : 0,
      agencyName: d.agencyName || null,
      licenseNumber: d.licenseNumber || null,
      bio: d.bio || null,
      stars: req.user.role === "hotel" ? d.stars ?? null : null,
      rejectionReason: null,
      reviewedAt: null,
      submittedAt: new Date(),
      ...(d.idNumber ? { idNumber: encryptSecret(d.idNumber) } : {}),
    };
    const profile = existing
      ? await prisma.proProfile.update({ where: { userId: req.user.id }, data })
      : await prisma.proProfile.create({ data: { ...data, userId: req.user.id } });
    // Toute soumission (ou modification) repasse par la vérification de l'admin.
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { verification: "pending", phone: d.phone },
    });
    res.json(view(user, profile));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Enregistrement impossible" });
  }
});

// ---- Où recevoir l'argent des courts séjours (sans repasser par la vérification) ----
const payoutSchema = z.object({
  operator: z.enum(["om", "momo"]),
  phone: z.string().trim().regex(/^\+?[\d\s.-]{8,20}$/, "Numéro invalide"),
});

router.get("/payout", async (req, res) => {
  const pp = await prisma.proProfile.findUnique({ where: { userId: req.user.id }, select: { payoutOperator: true, payoutPhone: true, phone: true } }).catch(() => null);
  res.json({ operator: pp?.payoutOperator || null, phone: pp?.payoutPhone || null, profilePhone: pp?.phone || null });
});

router.put("/payout", async (req, res) => {
  if (!isPro(req.user) && req.user.role !== "admin") return res.status(403).json({ error: "Réservé aux hôtes" });
  const parsed = payoutSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Données invalides" });
  try {
    const exists = await prisma.proProfile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!exists) return res.status(400).json({ error: "Complétez d'abord votre profil professionnel", code: "PROFILE_REQUIRED" });
    const pp = await prisma.proProfile.update({
      where: { userId: req.user.id },
      data: { payoutOperator: parsed.data.operator, payoutPhone: parsed.data.phone },
      select: { payoutOperator: true, payoutPhone: true },
    });
    // Versements bloqués faute de numéro : on les relance.
    const stuck = await prisma.booking.findMany({ where: { hostId: req.user.id, payoutStatus: "manual", paymentStatus: "paid" }, select: { id: true } });
    if (stuck.length) {
      const ids = stuck.map((b) => b.id);
      // L'ancienne ligne « à envoyer » est close, un nouvel envoi automatique part au prochain passage.
      await prisma.payout.updateMany({ where: { bookingId: { in: ids }, kind: "host", status: "manual" }, data: { status: "failed", error: "Remplacé : numéro de versement ajouté" } });
      await prisma.booking.updateMany({ where: { id: { in: ids } }, data: { payoutStatus: "scheduled" } });
    }
    res.json({ operator: pp.payoutOperator, phone: pp.payoutPhone });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Enregistrement impossible" });
  }
});

// ---- Tableau de bord hôtel : arrivées, occupation, revenus ----------------------
router.get("/hotel", async (req, res) => {
  if (req.user.role !== "hotel" && req.user.role !== "admin") return res.status(403).json({ error: "Réservé aux hôtels" });
  try {
    const DAY = 86400000;
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrow = new Date(today.getTime() + DAY);
    const in30 = new Date(today.getTime() + 30 * DAY);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const rooms = await prisma.property.findMany({
      where: { landlordId: req.user.id, rentalType: "Hôtel" },
      select: { id: true, title: true, price: true, units: true, status: true, images: true, maxGuests: true },
      orderBy: { createdAt: "asc" },
    });
    const ids = rooms.map((r) => r.id);
    const live = { propertyId: { in: ids }, status: "accepted" };
    const [arrivals, departures, inHouse, pending, upcoming, monthRows, next30] = await Promise.all([
      prisma.booking.findMany({ where: { ...live, checkIn: today }, include: { property: { select: { title: true } } } }),
      prisma.booking.count({ where: { ...live, checkOut: today } }),
      prisma.booking.findMany({ where: { ...live, checkIn: { lte: today }, checkOut: { gt: today } }, select: { units: true } }),
      prisma.booking.count({ where: { propertyId: { in: ids }, status: "pending" } }),
      prisma.booking.findMany({
        where: { ...live, checkIn: { gte: tomorrow } },
        include: { property: { select: { title: true } } },
        orderBy: { checkIn: "asc" },
        take: 8,
      }),
      prisma.booking.findMany({ where: { ...live, checkIn: { gte: monthStart } }, select: { hostAmount: true, commission: true, commissionStatus: true } }),
      prisma.booking.findMany({ where: { ...live, checkIn: { lt: in30 }, checkOut: { gt: today } }, select: { checkIn: true, checkOut: true, units: true } }),
    ]);
    const guestIds = [...new Set([...arrivals, ...upcoming].map((b) => b.guestId))];
    const guests = await prisma.user.findMany({ where: { id: { in: guestIds } }, select: { id: true, name: true, avatar: true } });
    const gBy = Object.fromEntries(guests.map((g) => [g.id, g]));
    const totalRooms = rooms.filter((r) => r.status === "available").reduce((s, r) => s + (r.units || 1), 0);
    // Occupation des 30 prochains jours : chambres-nuits vendues / disponibles
    let sold = 0;
    for (const b of next30) {
      const from = Math.max(b.checkIn.getTime(), today.getTime());
      const to = Math.min(b.checkOut.getTime(), in30.getTime());
      sold += Math.max(0, Math.round((to - from) / DAY)) * (b.units || 1);
    }
    const capacity = totalRooms * 30;
    const card = (b) => ({ id: b.id, title: b.property.title, guest: gBy[b.guestId] || null, checkIn: b.checkIn, checkOut: b.checkOut, nights: b.nights, units: b.units, guests: b.guests, hostAmount: b.hostAmount, paymentStatus: b.paymentStatus });
    res.json({
      rooms,
      totals: {
        roomTypes: rooms.length,
        rooms: totalRooms,
        arrivalsToday: arrivals.length,
        departuresToday: departures,
        occupiedTonight: inHouse.reduce((s, b) => s + (b.units || 1), 0),
        pending,
        revenueMonth: monthRows.reduce((s, b) => s + b.hostAmount, 0),
        commissionDue: monthRows.filter((b) => b.commissionStatus === "due").reduce((s, b) => s + b.commission, 0),
        occupancy30: capacity ? Math.round((sold / capacity) * 100) : 0,
      },
      arrivals: arrivals.map(card),
      upcoming: upcoming.map(card),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Tableau de bord indisponible" });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: { landlordId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { favorites: true, conversations: true, reviews: true } } },
    });
    const stats = (await statsFor([req.user.id]))[req.user.id];
    res.json({
      verification: req.user.verification,
      stats,
      properties: properties.map(({ _count, ...p }) => ({
        ...p,
        favoritesCount: _count.favorites,
        messagesCount: _count.conversations,
        reviewsCount: _count.reviews,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Tableau de bord indisponible" });
  }
});

export default router;
