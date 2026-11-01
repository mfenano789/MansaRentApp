// ============================================================
// MansaRent — Règles des transactions
//  · Vente         : l'acheteur parle à MansaRent (admin), l'agent reste caché.
//  · Location      : client ↔ agent / propriétaire directement.
//  · Court séjour  : voyageur ↔ hôte, réservation avec dates (type Airbnb).
// ============================================================
import { prisma } from "./db.js";
import { Mailer } from "./email.js";
import { Push } from "./push.js";

export const SALE = "Vente";
export const SHORT_STAY = "Court séjour";
export const HOTEL = "Hôtel";
export const isSale = (p) => p?.rentalType === SALE;
export const isHotel = (p) => p?.rentalType === HOTEL;
/** Réservable à la nuit avec dates : court séjour ou chambre d'hôtel. */
export const isShortStay = (p) => p?.rentalType === SHORT_STAY || p?.rentalType === HOTEL;

/** L'agent n'est visible que par lui-même et par l'admin sur un bien à vendre. */
export const canSeeOwner = (p, viewer) =>
  !isSale(p) || (viewer && (viewer.role === "admin" || viewer.id === p.landlordId));

/** Retire téléphones et e-mails d'un texte public (évite de contourner MansaRent). */
export function maskContacts(text) {
  if (!text) return text;
  return String(text)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[contact via MansaRent]")
    .replace(/(?:\+?\d[\s.\-()]*){8,}/g, "[contact via MansaRent]");
}

/** Admin qui reçoit les nouvelles demandes d'achat (le plus ancien compte admin). */
export async function leadAdmin() {
  return prisma.user.findFirst({ where: { role: "admin" }, orderBy: { createdAt: "asc" } });
}

export async function notifyAdmins({ title, body, data = {} }) {
  const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true, email: true, name: true } });
  for (const a of admins) {
    Push.toUser(a.id, { title, body, data }).catch(() => {});
    if (a.email) Mailer.adminAlert(a.email, title, body).catch(() => {});
  }
}

/**
 * Demande d'achat : crée (ou retrouve) le dossier et la conversation
 * acheteur ↔ MansaRent. Renvoie { lead, conversation, created }.
 */
export async function openLead({ property, buyer, message = "", visitAt = null }) {
  const existing = await prisma.lead.findUnique({
    where: { propertyId_buyerId: { propertyId: property.id, buyerId: buyer.id } },
  });
  if (existing) {
    const conversation = await prisma.conversation.findUnique({ where: { id: existing.buyerConvId } });
    if (visitAt && !existing.visitAt) await prisma.lead.update({ where: { id: existing.id }, data: { visitAt } });
    if (message) await prisma.message.create({ data: { conversationId: existing.buyerConvId, senderId: buyer.id, text: message } });
    return { lead: existing, conversation, created: false };
  }
  const admin = await leadAdmin();
  if (!admin) throw new Error("Aucun compte admin pour recevoir la demande");
  const conversation = await prisma.conversation.create({
    data: { kind: "sale", propertyId: property.id, tenantId: buyer.id, landlordId: admin.id },
  });
  const lead = await prisma.lead.create({
    data: { propertyId: property.id, buyerId: buyer.id, agentId: property.landlordId, buyerConvId: conversation.id, visitAt },
  });
  const lines = [message?.trim()].filter(Boolean);
  if (visitAt) lines.push(`📅 Demande de visite : ${new Date(visitAt).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Conakry" })}`);
  if (lines.length) {
    await prisma.message.create({ data: { conversationId: conversation.id, senderId: buyer.id, text: lines.join("\n\n") } });
  }
  notifyAdmins({
    title: "Nouvelle demande d'achat",
    body: `${buyer.name} · ${property.title}`,
    data: { type: "lead", leadId: lead.id, conversationId: conversation.id },
  }).catch(() => {});
  return { lead, conversation, created: true };
}

// ---- Dates de réservation ---------------------------------------------------
const DAY = 86400000;
/** "2026-11-14" → Date à minuit UTC (null si invalide). */
export function parseDay(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ""));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
export const todayUTC = () => { const n = new Date(); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())); };
export const nightsBetween = (a, b) => Math.round((b - a) / DAY);
export const dayStr = (d) => new Date(d).toISOString().slice(0, 10);

/** Réservations acceptées qui chevauchent [checkIn, checkOut). */
export function overlapping(propertyId, checkIn, checkOut, statuses = ["accepted"]) {
  return prisma.booking.findMany({
    where: { propertyId, status: { in: statuses }, checkIn: { lt: checkOut }, checkOut: { gt: checkIn } },
  });
}

/**
 * Chambres encore libres sur toute la période (le minimum sur chaque nuit).
 * Logement classique : units = 1 → 0 ou 1.
 */
export async function freeUnits(property, checkIn, checkOut, excludeId = null) {
  const total = Math.max(1, property.units || 1);
  const rows = (await overlapping(property.id, checkIn, checkOut)).filter((b) => b.id !== excludeId);
  if (!rows.length) return total;
  let minFree = total;
  for (let t = checkIn.getTime(); t < checkOut.getTime(); t += 86400000) {
    const used = rows.filter((b) => b.checkIn.getTime() <= t && b.checkOut.getTime() > t).reduce((s, b) => s + (b.units || 1), 0);
    minFree = Math.min(minFree, total - used);
  }
  return Math.max(0, minFree);
}

/** Nuits complètes (toutes les chambres prises) → plages bloquées [from, to). */
export async function blockedRanges(property, horizonDays = 365) {
  const start = todayUTC();
  const end = new Date(start.getTime() + horizonDays * 86400000);
  const rows = await overlapping(property.id, start, end);
  const total = Math.max(1, property.units || 1);
  const full = [];
  for (let t = start.getTime(); t < end.getTime(); t += 86400000) {
    const used = rows.filter((b) => b.checkIn.getTime() <= t && b.checkOut.getTime() > t).reduce((s, b) => s + (b.units || 1), 0);
    if (used >= total) full.push(t);
  }
  const ranges = [];
  for (const t of full) {
    const last = ranges[ranges.length - 1];
    if (last && last.to === t) last.to = t + 86400000;
    else ranges.push({ from: t, to: t + 86400000 });
  }
  return ranges.map((r) => ({ from: dayStr(r.from), to: dayStr(r.to) }));
}

/**
 * Statut affiché :
 *  accepted + non payée → « à payer » (awaiting_payment) · accepted + payée → « confirmée »
 *  séjour payé dont le départ est passé → « terminée ».
 */
export function bookingStatus(b) {
  if (b.status !== "accepted") return b.status;
  // « on_arrival » : paiement en ligne en pause, le voyageur paie sur place.
  const paid = b.paymentStatus === "paid" || b.paymentStatus === "on_arrival";
  if (paid && new Date(b.checkOut) <= todayUTC()) return "completed";
  return paid ? "confirmed" : "awaiting_payment";
}
