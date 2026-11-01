// ============================================================
// MansaRent — Calculs d'argent (sans base de données, testables seuls)
// ============================================================
import crypto from "node:crypto";

const num = (k, d) => { const v = Number(process.env[k]); return Number.isFinite(v) && v >= 0 ? v : d; };
export const rates = () => ({
  commissionPct: num("MANSARENT_COMMISSION_PCT", 10),
  mobilePct: num("PAY_FEE_MOBILE_PCT", 2.5),
  cardPct: num("PAY_FEE_CARD_PCT", 2),
  payoutPct: num("PAY_FEE_PAYOUT_PCT", 1.5),
});

/** Prix par nuit affiché au voyageur (prix de l'hôte + commission). */
export const guestNightly = (hostPrice) => hostPrice + Math.round((hostPrice * rates().commissionPct) / 100);

/** Montants d'une réservation. */
export function quote(hostPrice, nights) {
  const perNightFee = Math.round((hostPrice * rates().commissionPct) / 100);
  const hostAmount = hostPrice * nights;
  const commission = perNightFee * nights;
  return { hostAmount, commission, total: hostAmount + commission };
}

/**
 * Versement de l'hôte : sa part moins les frais de paiement qui la concernent
 * (frais d'encaissement sur sa part + frais de versement).
 */
export function hostPayout(hostAmount, method) {
  const r = rates();
  const collectPct = method === "card" ? r.cardPct : r.mobilePct;
  const fees = Math.round((hostAmount * collectPct) / 100) + Math.round((hostAmount * r.payoutPct) / 100);
  return { fees, amount: Math.max(0, hostAmount - fees) };
}

export const REFUND_WINDOW_H = 48;
export const PAY_WINDOW_H = 24;   // le voyageur a 24 h pour payer après acceptation
export const PAYOUT_DELAY_H = 36; // midi le lendemain de l'arrivée (≈ 24 h après l'entrée dans les lieux)

export const payoutDue = (checkIn) => new Date(new Date(checkIn).getTime() + PAYOUT_DELAY_H * 3600000);

// ---- Jeton du callback (empêche les fausses notifications) -------------------
const secret = () => process.env.JWT_SECRET || "mansarent-dev-secret";
export const callbackToken = (reference) => crypto.createHmac("sha256", secret()).update(`pay:${reference}`).digest("hex").slice(0, 32);
export const checkCallbackToken = (reference, token) => {
  const a = Buffer.from(callbackToken(reference)); const b = Buffer.from(String(token || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

