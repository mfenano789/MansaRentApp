// ============================================================
// MansaRent — MansaSend (notre propre service de paiement)
// Réglages saisis dans Admin → Intégrations → MansaSend (copiés dans process.env).
// Contrat d'API complet : backend/MANSASEND_API.md
//
//  · Encaissement : MansaRent crée un « checkout », le voyageur paie sur la page
//    MansaSend (Orange Money, MTN MoMo, carte…), MansaSend appelle notre callback,
//    puis MansaRent revérifie le statut auprès de MansaSend avant de confirmer.
//  · Versement à l'hôte et remboursement : API MansaSend si activée,
//    sinon file « à envoyer » de l'admin (envoi manuel).
// ============================================================
import crypto from "node:crypto";

const env = (k, d = "") => (process.env[k] ?? "").toString().trim() || d;

async function call(method, path, body) {
  const res = await fetch(`${MansaSend.base()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${env("MANSASEND_API_KEY")}`,
      "X-Merchant-Id": env("MANSASEND_MERCHANT_ID"),
      ...(body && body.reference ? { "Idempotency-Key": String(body.reference) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(raw.message || raw.error || `MansaSend a refusé la demande (HTTP ${res.status})`);
  return raw;
}

const methodOf = (m) => {
  const s = String(m || "").toLowerCase();
  return /momo|mtn/.test(s) ? "momo" : /card|carte|visa|master/.test(s) ? "card" : /orange|^om$/.test(s) ? "om" : s || null;
};

export const MansaSend = {
  configured() {
    return !!(env("MANSASEND_API_URL") && env("MANSASEND_API_KEY") && env("MANSASEND_MERCHANT_ID"));
  },
  payoutEnabled() {
    return this.configured() && env("MANSASEND_PAYOUTS", "on") !== "off";
  },
  base() {
    return env("MANSASEND_API_URL").replace(/\/$/, "");
  },

  /** → { payId, paymentUrl, raw } */
  async createPayment({ amount, currency = "GNF", reference, description, returnUrl, callbackUrl, customer }) {
    if (!this.configured()) throw new Error("MansaSend n'est pas configuré (Admin → Intégrations)");
    const raw = await call("POST", "/v1/checkouts", {
      amount: Math.round(amount), currency, reference, description,
      return_url: returnUrl, callback_url: callbackUrl, customer,
    });
    if (!raw.checkout_url) throw new Error("MansaSend n'a pas renvoyé de lien de paiement");
    return { payId: raw.id, paymentUrl: raw.checkout_url, raw };
  },

  /** Statut officiel d'un checkout (on ne fait jamais confiance au seul callback). */
  async getPayment(payId) {
    const raw = await call("GET", `/v1/checkouts/${encodeURIComponent(payId)}`);
    return { payId: raw.id, success: raw.status === "succeeded", failed: ["failed", "expired", "cancelled"].includes(raw.status), amount: Number(raw.amount) || null, method: methodOf(raw.method), raw };
  },

  /** Signature HMAC-SHA256 du corps brut (en-tête X-MansaSend-Signature). */
  checkSignature(rawBody, signature) {
    const secret = env("MANSASEND_WEBHOOK_SECRET");
    if (!secret) return true; // secret non défini : on s'appuie sur le jeton d'URL + revérification
    if (!rawBody || !signature) return false;
    const want = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(want), b = Buffer.from(String(signature).replace(/^sha256=/, ""));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },

  parseCallback(body = {}) {
    return { payId: body.id || body.checkout_id, success: body.status === "succeeded", amount: Number(body.amount) || null, method: methodOf(body.method), raw: body };
  },

  /** Versement vers Orange Money / MTN. → { manual:true } ou { providerRef, raw } */
  async payout({ amount, operator, phone, reference, description }) {
    if (!this.payoutEnabled()) return { manual: true };
    const raw = await call("POST", "/v1/payouts", {
      amount: Math.round(amount), currency: "GNF", reference, description,
      method: operator === "momo" ? "momo" : "om",
      phone: String(phone).replace(/[^\d+]/g, ""),
    });
    if (["failed", "rejected"].includes(raw.status)) throw new Error(raw.message || "Versement refusé par MansaSend");
    return { providerRef: raw.id || null, raw };
  },

  /** Remboursement d'un paiement. → { manual:true } ou { providerRef, raw } */
  async refund({ payId, amount, reference, reason }) {
    if (!this.payoutEnabled() || !payId) return { manual: true };
    const raw = await call("POST", "/v1/refunds", { checkout_id: payId, amount: Math.round(amount), reference, reason });
    if (["failed", "rejected"].includes(raw.status)) throw new Error(raw.message || "Remboursement refusé par MansaSend");
    return { providerRef: raw.id || null, raw };
  },
};
