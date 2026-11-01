// ============================================================
// MansaRent — Règles d'argent des courts séjours
//  · Le voyageur paie le prix de l'hôte + 10 % (commission MansaRent).
//  · L'hôte reçoit son prix moins les frais de paiement de sa part,
//    automatiquement, 24 h après l'arrivée du voyageur.
//  · Remboursement : intégral si annulation ≥ 48 h avant l'arrivée ou si
//    l'hôte refuse / annule ; aucun remboursement après.
// ============================================================
import { prisma } from "./db.js";
import { Mailer } from "./email.js";
import { Push } from "./push.js";
import { MansaSend } from "./mansasend.js";

export { rates, guestNightly, quote, hostPayout, REFUND_WINDOW_H, PAY_WINDOW_H, PAYOUT_DELAY_H, payoutDue, callbackToken, checkCallbackToken } from "./money.js";
import { hostPayout, payoutDue, REFUND_WINDOW_H, PAY_WINDOW_H } from "./money.js";

const gnf = (n) => `${new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)).replace(/ | /g, " ")} GNF`;
const day = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const opName = (op) => (op === "momo" ? "MTN MoMo" : "Orange Money");

export function tell(userId, title, body, data = {}) {
  Push.toUser(userId, { title, body, data: { type: "booking", ...data } }).catch(() => {});
  prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
    .then((u) => u?.email && Mailer.bookingUpdate(u.email, u.name, title, body).catch(() => {}))
    .catch(() => {});
}

/** Message automatique dans la conversation voyageur ↔ hôte. */
export async function chatNote(b, senderId, text) {
  const conv = await prisma.conversation.findFirst({ where: { kind: "direct", propertyId: b.propertyId, tenantId: b.guestId, landlordId: b.hostId } });
  if (conv) await prisma.message.create({ data: { conversationId: conv.id, senderId, text } }).catch(() => {});
}

// ---- Paiement confirmé ---------------------------------------------------------
export async function markPaid(payment, { method, raw } = {}) {
  if (payment.status === "success") return;
  const p = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "success", method: method || payment.method, raw: raw ?? payment.raw },
  });
  const b = await prisma.booking.findUnique({ where: { id: p.bookingId }, include: { property: { select: { title: true } } } });
  if (!b || b.paymentStatus === "paid") return;
  const m = method || p.method || "om";
  const { amount, fees } = hostPayout(b.hostAmount, m);
  const stillValid = b.status === "accepted";
  await prisma.booking.update({
    where: { id: b.id },
    data: {
      paymentStatus: stillValid ? "paid" : "refund_pending",
      ...(stillValid ? { commissionStatus: "collected", commissionCollectedAt: new Date() } : {}),
      payMethod: m,
      paidAt: new Date(),
      ...(stillValid
        ? { payoutStatus: "scheduled", payoutDueAt: payoutDue(b.checkIn), payoutAmount: amount, payoutFees: fees }
        : { refundAmount: b.total }),
    },
  });
  if (!stillValid) {
    // Payé après expiration / annulation : remboursement intégral automatique.
    await queueRefund(b, b.total, "Paiement reçu après la fin du délai");
    return;
  }
  tell(b.guestId, "Paiement confirmé ✅", `Votre séjour « ${b.property.title} » (${day(b.checkIn)} → ${day(b.checkOut)}) est confirmé. Total payé : ${gnf(b.total)}.`, { bookingId: b.id });
  tell(b.hostId, "Paiement reçu via MansaRent 💰",
    `Le voyageur a payé « ${b.property.title} » via l'appli MansaRent. Vous recevrez ${gnf(amount)} (votre prix ${gnf(b.hostAmount)} moins ${gnf(fees)} de frais de paiement) le ${day(payoutDue(b.checkIn))}, 24 h après son arrivée.`,
    { bookingId: b.id });
  await chatNote(b, b.guestId, `💳 Paiement effectué via MansaRent : ${gnf(b.total)}. Séjour confirmé.`);
}

// ---- Remboursements (file admin : renvoi Orange Money / MTN, ou carte) -----------
export async function queueRefund(b, amount, reason) {
  if (!amount || amount <= 0) return null;
  const payout = await prisma.payout.create({
    data: { bookingId: b.id, kind: "refund", userId: b.guestId, amount, status: "processing", error: reason || null },
  });
  await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: "refund_pending", refundAmount: amount } });
  // Remboursement automatique via MansaSend, sinon file manuelle de l'admin.
  const paid = await prisma.payment.findFirst({ where: { bookingId: b.id, status: "success" }, orderBy: { createdAt: "desc" } });
  try {
    const r = await MansaSend.refund({ payId: paid?.providerRef, amount, reference: payout.id, reason });
    if (!r.manual) {
      await prisma.payout.update({ where: { id: payout.id }, data: { status: "paid", providerRef: r.providerRef, sentAt: new Date() } });
      await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: "refunded" } });
      tell(b.guestId, "Remboursement envoyé", `${gnf(amount)} vous ont été remboursés via MansaSend.`, { bookingId: b.id });
      return payout;
    }
    await prisma.payout.update({ where: { id: payout.id }, data: { status: "manual" } });
  } catch (e) {
    await prisma.payout.update({ where: { id: payout.id }, data: { status: "manual", error: `${reason || ""} · ${e.message}` } });
  }
  const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } });
  for (const a of admins) tell(a.id, "Remboursement à envoyer", `${gnf(amount)} · réservation ${b.id.slice(-6)}`, { type: "payout" });
  tell(b.guestId, "Remboursement en cours", `Vous serez remboursé de ${gnf(amount)} par MansaRent.`, { bookingId: b.id });
  return payout;
}

/** Annulation d'une réservation payée : remboursement selon la règle des 48 h. */
export async function refundOnCancel(b, { byHost }) {
  if (b.paymentStatus !== "paid") return { refunded: 0 };
  const hoursLeft = (new Date(b.checkIn).getTime() - Date.now()) / 3600000;
  const full = byHost || hoursLeft >= REFUND_WINDOW_H;
  if (!full) {
    // Pas de remboursement : l'hôte reste payé comme prévu.
    return { refunded: 0 };
  }
  await prisma.booking.update({ where: { id: b.id }, data: { payoutStatus: "cancelled" } });
  await queueRefund(b, b.total, byHost ? "Annulé par l'hôte" : "Annulé par le voyageur (≥ 48 h avant)");
  return { refunded: b.total };
}

// ---- Versements automatiques -------------------------------------------------------
async function sendPayout(b) {
  const pp = await prisma.proProfile.findUnique({ where: { userId: b.hostId }, select: { payoutOperator: true, payoutPhone: true, phone: true } });
  const operator = pp?.payoutOperator || "om";
  const account = pp?.payoutPhone || pp?.phone || null;
  const claim = await prisma.booking.updateMany({ where: { id: b.id, payoutStatus: "scheduled" }, data: { payoutStatus: "processing" } });
  if (!claim.count) return; // déjà pris par un autre passage
  const po = await prisma.payout.create({
    data: { bookingId: b.id, kind: "host", userId: b.hostId, amount: b.payoutAmount, fees: b.payoutFees || 0, operator, account, status: "processing", attempts: 1 },
  });
  try {
    if (!account) throw Object.assign(new Error("Numéro de versement manquant"), { manual: true });
    const r = await MansaSend.payout({ amount: b.payoutAmount, operator, phone: account, reference: po.id, description: `MansaRent · ${b.property.title}` });
    if (r.manual) throw Object.assign(new Error("API de versement non activée : envoi manuel"), { manual: true });
    await prisma.payout.update({ where: { id: po.id }, data: { status: "paid", providerRef: r.providerRef, sentAt: new Date() } });
    await prisma.booking.update({ where: { id: b.id }, data: { payoutStatus: "paid", payoutAt: new Date() } });
    tell(b.hostId, "Versement envoyé 💸", `${gnf(b.payoutAmount)} ont été envoyés sur votre ${opName(operator)} (${account}) pour « ${b.property.title} ». Paiement effectué via MansaRent.`, { bookingId: b.id });
  } catch (e) {
    const manual = !!e.manual;
    await prisma.payout.update({ where: { id: po.id }, data: { status: manual ? "manual" : "failed", error: e.message } });
    await prisma.booking.update({ where: { id: b.id }, data: { payoutStatus: manual ? "manual" : "failed" } });
    const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } });
    for (const a of admins) tell(a.id, manual ? "Versement à envoyer" : "Versement échoué", `${gnf(b.payoutAmount)} → ${b.property.title} · ${e.message}`, { type: "payout" });
    if (!account) tell(b.hostId, "Ajoutez votre numéro de versement", "MansaRent a reçu le paiement de votre voyageur. Ajoutez votre numéro Orange Money ou MTN dans Réservations → Reçues pour recevoir votre argent.", { bookingId: b.id });
  }
}

/** Passage régulier : versements dus + demandes acceptées non payées expirées. */
export async function runPaymentJobs() {
  const now = new Date();
  // 1. Acceptée mais non payée sous 24 h → expirée (les dates se libèrent).
  const stale = await prisma.booking.findMany({
    where: { status: "accepted", paymentStatus: { in: ["unpaid", "pending"] }, acceptedAt: { lt: new Date(now.getTime() - PAY_WINDOW_H * 3600000) } },
    include: { property: { select: { title: true } } },
  });
  for (const b of stale) {
    await prisma.booking.update({ where: { id: b.id }, data: { status: "expired", cancelReason: "Non payée dans les 24 h" } });
    tell(b.guestId, "Réservation expirée", `Votre réservation « ${b.property.title} » n'a pas été payée dans les 24 h : les dates ont été libérées.`, { bookingId: b.id });
    tell(b.hostId, "Réservation expirée", `Le voyageur n'a pas payé « ${b.property.title} » à temps : vos dates sont de nouveau libres.`, { bookingId: b.id });
  }
  // 2. Paiement à l'arrivée : séjour terminé → la commission MansaRent est due par l'hôte.
  const owed = await prisma.booking.updateMany({
    where: { status: "accepted", paymentStatus: "on_arrival", commissionStatus: "none", checkOut: { lte: now } },
    data: { commissionStatus: "due" },
  });
  // 3. Versements dus.
  const due = await prisma.booking.findMany({
    where: { payoutStatus: "scheduled", paymentStatus: "paid", payoutDueAt: { lte: now } },
    include: { property: { select: { title: true } } },
    take: 50,
  });
  for (const b of due) await sendPayout(b);
  return { expired: stale.length, paidOut: due.length, commissionsDue: owed.count };
}

let timer = null;
export function startPaymentJobs(everyMs = 10 * 60 * 1000) {
  if (timer) return;
  const tick = () => runPaymentJobs().catch((e) => console.warn("[payments]", e.message));
  setTimeout(tick, 15000);
  timer = setInterval(tick, everyMs);
}
