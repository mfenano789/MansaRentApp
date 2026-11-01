// ============================================================
// MansaRent — Professionnels (agents & vendeurs/propriétaires)
// Statistiques d'annonces, profil public, classement.
// ============================================================
import { prisma } from "./db.js";

export const PRO_ROLES = ["agent", "landlord", "hotel"];
export const isPro = (u) => !!u && PRO_ROLES.includes(u.role);
export const isApprovedPro = (u) => !!u && (u.role === "admin" || (isPro(u) && u.verification === "approved"));

/** Montant retenu pour une annonce conclue : prix final saisi, sinon prix affiché. */
const dealValue = (p) => (p.dealPrice && p.dealPrice > 0 ? p.dealPrice : p.price);

/** Profil public : jamais d'adresse, d'e-mail ni de pièce d'identité. */
export function publicPro(user) {
  if (!user) return null;
  const pp = user.proProfile || null;
  return {
    id: user.id,
    name: user.name,
    username: user.username || null,
    avatar: user.avatar || null,
    role: user.role,
    verified: user.verification === "approved",
    memberSince: user.createdAt,
    city: pp?.city || null,
    yearsExperience: pp?.yearsExperience ?? null,
    agencyName: pp?.agencyName || null,
    bio: pp?.bio || null,
    stars: pp?.stars ?? null,
  };
}

/** Agrège les chiffres des annonces + avis pour une liste d'utilisateurs. */
export async function statsFor(userIds) {
  const ids = [...new Set(userIds)].filter(Boolean);
  const empty = () => ({
    listings: 0, active: 0, rented: 0, sold: 0, closed: 0, stays: 0,
    rentedValue: 0, soldValue: 0, staysValue: 0, totalValue: 0,
    views: 0, favorites: 0, messages: 0, rating: 0, reviewCount: 0,
  });
  const out = Object.fromEntries(ids.map((id) => [id, empty()]));
  if (!ids.length) return out;

  const props = await prisma.property.findMany({
    where: { landlordId: { in: ids } },
    select: {
      id: true, landlordId: true, status: true, price: true, dealPrice: true, views: true,
      _count: { select: { favorites: true, conversations: true } },
    },
  });
  const ownerOf = {};
  for (const p of props) {
    const s = out[p.landlordId];
    ownerOf[p.id] = p.landlordId;
    s.listings += 1;
    s.views += p.views;
    s.favorites += p._count.favorites;
    s.messages += p._count.conversations;
    if (p.status === "rented") { s.rented += 1; s.rentedValue += dealValue(p); }
    else if (p.status === "sold") { s.sold += 1; s.soldValue += dealValue(p); }
    else s.active += 1;
  }
  // Courts séjours et hôtels : séjours terminés (payés en ligne ou à l'arrivée)
  const stays = await prisma.booking.groupBy({
    by: ["hostId"],
    where: { hostId: { in: ids }, status: "accepted", paymentStatus: { in: ["paid", "on_arrival"] }, checkOut: { lte: new Date() } },
    _count: { _all: true },
    _sum: { hostAmount: true },
  });
  for (const r of stays) {
    out[r.hostId].stays = r._count._all;
    out[r.hostId].staysValue = r._sum.hostAmount || 0;
  }
  const propIds = Object.keys(ownerOf);
  const reviews = await prisma.review.findMany({
    where: { OR: [{ agentId: { in: ids } }, ...(propIds.length ? [{ propertyId: { in: propIds } }] : [])] },
    select: { agentId: true, propertyId: true, rating: true },
  });
  const sums = {};
  for (const r of reviews) {
    const owner = r.agentId && out[r.agentId] ? r.agentId : ownerOf[r.propertyId];
    if (!owner) continue;
    sums[owner] = sums[owner] || { n: 0, total: 0 };
    sums[owner].n += 1;
    sums[owner].total += r.rating;
  }
  for (const id of ids) {
    const s = out[id];
    s.closed = s.rented + s.sold + s.stays;
    s.totalValue = s.rentedValue + s.soldValue + s.staysValue;
    if (sums[id]) {
      s.reviewCount = sums[id].n;
      s.rating = Math.round((sums[id].total / sums[id].n) * 10) / 10;
    }
  }
  return out;
}

/**
 * Classement : transactions conclues d'abord, puis note moyenne,
 * puis nombre d'avis, puis valeur totale.
 */
export function rank(rows) {
  return rows
    .sort((a, b) =>
      b.stats.closed - a.stats.closed
      || b.stats.rating - a.stats.rating
      || b.stats.reviewCount - a.stats.reviewCount
      || b.stats.totalValue - a.stats.totalValue)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
