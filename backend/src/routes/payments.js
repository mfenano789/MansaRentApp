// ============================================================
// MansaRent — Paiements des courts séjours (MansaSend)
// ============================================================
import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { MansaSend } from "../lib/mansasend.js";
import { callbackToken, checkCallbackToken, markPaid, rates, tell, runPaymentJobs } from "../lib/payments.js";

const router = Router();

const appUrl = () => (process.env.APP_URL || "http://localhost:5173").split(",")[0].replace(/\/$/, "");
const apiUrl = () => (process.env.PUBLIC_URL || "http://localhost:4000").replace(/\/$/, "");

// ---- Taux en vigueur (affichage) ------------------------------------------------
router.get("/config", (_req, res) => {
  res.json({ ...rates(), online: MansaSend.configured(), methods: ["om", "momo", "card"] });
});

// ---- Payer une réservation acceptée ---------------------------------------------
router.post("/booking/:id", requireAuth, async (req, res) => {
  try {
    const b = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { property: { select: { title: true } } } });
    if (!b) return res.status(404).json({ error: "Réservation introuvable" });
    if (b.guestId !== req.user.id) return res.status(403).json({ error: "Non autorisé" });
    if (b.status !== "accepted") return res.status(400).json({ error: "L'hôte doit d'abord accepter votre demande", code: "NOT_ACCEPTED" });
    if (b.paymentStatus === "paid") return res.status(400).json({ error: "Déjà payée", code: "ALREADY_PAID" });
    if (!MansaSend.configured()) return res.status(503).json({ error: "Le paiement en ligne n'est pas encore activé", code: "PAYMENTS_OFF" });

    const reference = `MR-${b.id.slice(-8)}-${crypto.randomBytes(3).toString("hex")}`.toUpperCase();
    const callbackUrl = `${apiUrl()}/api/payments/callback?ref=${encodeURIComponent(reference)}&t=${callbackToken(reference)}`;
    const returnUrl = `${appUrl()}/?payment=${encodeURIComponent(b.id)}`;
    const { payId, paymentUrl, raw } = await MansaSend.createPayment({
      amount: b.total, reference, returnUrl, callbackUrl,
      description: `MansaRent · ${b.property.title} · ${b.nights} nuit(s)`,
      customer: { name: req.user.name, email: req.user.email, phone: req.user.phone || undefined },
    });
    await prisma.payment.create({
      data: { bookingId: b.id, reference, providerRef: payId || null, amount: b.total, paymentUrl, raw },
    });
    await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: "pending" } });
    res.json({ paymentUrl, reference });
  } catch (e) {
    console.error("[payments]", e.message);
    res.status(502).json({ error: e.message || "Paiement impossible" });
  }
});

// ---- État (page de retour après paiement) ----------------------------------------
router.get("/booking/:id", requireAuth, async (req, res) => {
  try {
    const b = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { property: { select: { title: true } } } });
    if (!b) return res.status(404).json({ error: "Réservation introuvable" });
    if (![b.guestId, b.hostId].includes(req.user.id) && req.user.role !== "admin") return res.status(403).json({ error: "Non autorisé" });
    res.json({ id: b.id, title: b.property.title, status: b.status, paymentStatus: b.paymentStatus, total: b.total, payMethod: b.payMethod });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "État indisponible" });
  }
});

// ---- Notification MansaSend (callback serveur à serveur) --------------------------
router.post("/callback", async (req, res) => {
  try {
    const ref = String(req.query.ref || "");
    if (!ref || !checkCallbackToken(ref, req.query.t)) return res.status(403).json({ error: "Jeton invalide" });
    const payment = await prisma.payment.findUnique({ where: { reference: ref } });
    if (!payment) return res.status(404).json({ error: "Paiement inconnu" });
    if (!MansaSend.checkSignature(req.rawBody, req.get("X-MansaSend-Signature"))) return res.status(401).json({ error: "Signature invalide" });
    const hint = MansaSend.parseCallback(req.body || {});
    if (hint.payId && payment.providerRef && hint.payId !== payment.providerRef) return res.status(400).json({ error: "id différent" });
    // Source de vérité : on redemande le statut à MansaSend.
    const cb = payment.providerRef ? await MansaSend.getPayment(payment.providerRef) : hint;
    if (!cb.success && !cb.failed) return res.json({ ok: true, pending: true });
    if (cb.success) {
      if (cb.amount && cb.amount < payment.amount) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed", raw: cb.raw } });
        return res.json({ ok: false, error: "Montant insuffisant" });
      }
      await markPaid(payment, { method: cb.method, raw: cb.raw });
    } else if (payment.status === "pending") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed", raw: cb.raw } });
      await prisma.booking.updateMany({ where: { id: payment.bookingId, paymentStatus: "pending" }, data: { paymentStatus: "unpaid" } });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("[payments callback]", e);
    res.status(500).json({ error: "Erreur" });
  }
});

// =================================================================================
// ADMIN — argent encaissé, versements, remboursements
// =================================================================================
const admin = Router();
admin.use(requireAuth, requireAdmin);

admin.get("/overview", async (_req, res) => {
  try {
    const [paid, queue, recent] = await Promise.all([
      prisma.booking.aggregate({
        where: { paymentStatus: { in: ["paid", "refund_pending", "refunded"] } },
        _sum: { total: true, commission: true, payoutAmount: true, refundAmount: true },
        _count: { _all: true },
      }),
      prisma.payout.findMany({
        where: { status: { in: ["manual", "failed", "processing"] } },
        include: { booking: { include: { property: { select: { title: true } } } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.booking.findMany({
        where: { paymentStatus: { not: "unpaid" } },
        include: { property: { select: { title: true } } },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
    ]);
    const ids = [...new Set([...queue.map((q) => q.userId), ...recent.flatMap((b) => [b.guestId, b.hostId])])];
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true, phone: true } });
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    const scheduled = await prisma.booking.aggregate({ where: { payoutStatus: "scheduled" }, _sum: { payoutAmount: true }, _count: { _all: true } });
    res.json({
      online: MansaSend.configured(),
      payoutApi: MansaSend.payoutEnabled(),
      rates: rates(),
      totals: {
        bookingsPaid: paid._count._all,
        collected: paid._sum.total || 0,
        commission: paid._sum.commission || 0,
        refunds: paid._sum.refundAmount || 0,
        scheduledPayouts: scheduled._sum.payoutAmount || 0,
        scheduledCount: scheduled._count._all,
      },
      queue: queue.map((q) => ({ ...q, user: byId[q.userId] || null, title: q.booking?.property?.title, booking: undefined })),
      recent: recent.map((b) => ({ ...b, guest: byId[b.guestId] || null, host: byId[b.hostId] || null })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Paiements indisponibles" });
  }
});

// Confirmer un envoi manuel (versement hôte ou remboursement) · réessayer un versement
admin.put("/payouts/:id", async (req, res) => {
  const parsed = z.object({ action: z.enum(["sent", "retry"]), providerRef: z.string().max(120).optional() }).safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Action invalide" });
  try {
    const po = await prisma.payout.findUnique({ where: { id: req.params.id }, include: { booking: { include: { property: { select: { title: true } } } } } });
    if (!po) return res.status(404).json({ error: "Versement introuvable" });
    if (po.status === "paid") return res.status(400).json({ error: "Déjà envoyé" });
    const b = po.booking;
    if (parsed.data.action === "retry") {
      if (po.kind !== "host") return res.status(400).json({ error: "Seuls les versements hôte se relancent" });
      await prisma.payout.update({ where: { id: po.id }, data: { status: "failed", error: `${po.error || ""} (relancé)` } });
      await prisma.booking.update({ where: { id: b.id }, data: { payoutStatus: "scheduled", payoutDueAt: new Date() } });
      await runPaymentJobs();
      return res.json({ ok: true });
    }
    await prisma.payout.update({ where: { id: po.id }, data: { status: "paid", sentAt: new Date(), sentBy: req.user.id, providerRef: parsed.data.providerRef || po.providerRef } });
    const gnf = (n) => `${new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ")} GNF`;
    if (po.kind === "host") {
      await prisma.booking.update({ where: { id: b.id }, data: { payoutStatus: "paid", payoutAt: new Date() } });
      tell(po.userId, "Versement envoyé 💸", `${gnf(po.amount)} ont été envoyés pour « ${b.property.title} ». Paiement effectué via MansaRent.`, { bookingId: b.id });
    } else {
      await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: "refunded" } });
      tell(po.userId, "Remboursement envoyé", `${gnf(po.amount)} vous ont été remboursés pour « ${b.property.title} ».`, { bookingId: b.id });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Mise à jour impossible" });
  }
});

// ---- Commissions à encaisser (séjours payés à l'arrivée) -----------------------
admin.get("/commissions", async (_req, res) => {
  try {
    const rows = await prisma.booking.findMany({
      where: { commissionStatus: "due" },
      include: { property: { select: { title: true, rentalType: true } } },
      orderBy: { checkOut: "asc" },
    });
    const hostIds = [...new Set(rows.map((b) => b.hostId))];
    const [hosts, profiles] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: hostIds } }, select: { id: true, name: true, email: true, role: true } }),
      prisma.proProfile.findMany({ where: { userId: { in: hostIds } }, select: { userId: true, phone: true, payoutPhone: true, payoutOperator: true, agencyName: true } }),
    ]);
    const hostBy = Object.fromEntries(hosts.map((h) => [h.id, h]));
    const ppBy = Object.fromEntries(profiles.map((p) => [p.userId, p]));
    const groups = {};
    for (const b of rows) {
      const g = (groups[b.hostId] ||= { host: { ...hostBy[b.hostId], phone: ppBy[b.hostId]?.phone || ppBy[b.hostId]?.payoutPhone || null, company: ppBy[b.hostId]?.agencyName || null }, total: 0, bookings: [] });
      g.total += b.commission;
      g.bookings.push({ id: b.id, title: b.property.title, hotel: b.property.rentalType === "Hôtel", checkIn: b.checkIn, checkOut: b.checkOut, nights: b.nights, units: b.units, commission: b.commission, total: b.total });
    }
    const list = Object.values(groups).sort((a, b) => b.total - a.total);
    res.json({ hosts: list, total: list.reduce((s, g) => s + g.total, 0) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Commissions indisponibles" });
  }
});

admin.put("/commissions/:hostId", async (req, res) => {
  const action = req.body?.action === "waive" ? "waived" : "collected";
  try {
    const r = await prisma.booking.updateMany({
      where: { hostId: req.params.hostId, commissionStatus: "due" },
      data: { commissionStatus: action, commissionCollectedAt: new Date() },
    });
    res.json({ ok: true, count: r.count });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Mise à jour impossible" });
  }
});

router.use("/admin", admin);
export default router;
