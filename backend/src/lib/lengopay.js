// ============================================================
// MansaRent — Lengo Pay (Guinée : Orange Money, MTN MoMo, carte Visa/Mastercard)
// Réglages saisis dans Admin → Intégrations → Lengo Pay (copiés dans process.env).
//
//  · Encaissement : page de paiement hébergée par Lengo Pay (le voyageur choisit
//    Orange Money, MTN MoMo ou carte), puis notification sur notre callback.
//  · Versement à l'hôte : API de payout Lengo Pay si elle est activée sur le
//    compte (LENGO_PAYOUT_PATH) ; sinon le versement part dans la file
//    « à envoyer » de l'admin, qui confirme l'envoi manuel.
// ============================================================

const env = (k, d = "") => (process.env[k] ?? "").toString().trim() || d;

export const LengoPay = {
  configured() {
    return !!(env("LENGO_LICENSE_KEY") && env("LENGO_WEBSITE_ID"));
  },
  payoutEnabled() {
    return this.configured() && !!env("LENGO_PAYOUT_PATH");
  },
  base() {
    return env("LENGO_BASE_URL", "https://sandbox.lengopay.com/api/v1").replace(/\/$/, "");
  },
  headers() {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${env("LENGO_LICENSE_KEY")}`,
    };
  },

  /**
   * Crée un paiement et renvoie l'URL de la page Lengo Pay.
   * → { payId, paymentUrl, raw }
   */
  async createPayment({ amount, currency = "GNF", returnUrl, callbackUrl }) {
    if (!this.configured()) throw new Error("Lengo Pay n'est pas configuré (Admin → Intégrations)");
    const res = await fetch(`${this.base()}${env("LENGO_PAY_PATH", "/payments")}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        websiteid: env("LENGO_WEBSITE_ID"),
        amount: Math.round(amount),
        currency,
        return_url: returnUrl,
        callback_url: callbackUrl,
      }),
    });
    const raw = await res.json().catch(() => ({}));
    const payId = raw.pay_id || raw.payId || raw.data?.pay_id;
    const paymentUrl = raw.payment_url || raw.paymentUrl || raw.data?.payment_url;
    if (!res.ok || !paymentUrl) {
      throw new Error(raw.message || raw.error || `Lengo Pay a refusé le paiement (HTTP ${res.status})`);
    }
    return { payId, paymentUrl, raw };
  },

  /** Lit la notification Lengo Pay → { payId, success, amount, method, raw } */
  parseCallback(body = {}) {
    const status = String(body.status || "").toUpperCase();
    const acc = String(body.type_account || body.typeAccount || body.method || "").toLowerCase();
    // « lp-momo-gn » contient « om » : on teste MTN avant Orange Money.
    const method = /momo|mtn/.test(acc) ? "momo"
      : /card|carte|visa|master/.test(acc) ? "card"
      : /(^|[^a-z])om([^a-z]|$)|orange/.test(acc) ? "om"
      : null;
    return { payId: body.pay_id || body.payId, success: status === "SUCCESS", amount: Number(body.amount) || null, method, raw: body };
  },

  /**
   * Versement vers un numéro Orange Money / MTN MoMo.
   * → { manual: true } si l'API de payout n'est pas activée, sinon { providerRef, raw }.
   */
  async payout({ amount, operator, phone, reference }) {
    if (!this.payoutEnabled()) return { manual: true };
    const res = await fetch(`${this.base()}${env("LENGO_PAYOUT_PATH")}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        websiteid: env("LENGO_WEBSITE_ID"),
        amount: Math.round(amount),
        currency: "GNF",
        type_account: operator === "momo" ? "lp-momo-gn" : "lp-om-gn",
        account: String(phone).replace(/\D/g, ""),
        reference,
      }),
    });
    const raw = await res.json().catch(() => ({}));
    const ok = res.ok && !/fail|error|echec|échec/i.test(String(raw.status || ""));
    if (!ok) throw new Error(raw.message || raw.error || `Versement refusé (HTTP ${res.status})`);
    return { providerRef: raw.pay_id || raw.id || raw.reference || null, raw };
  },
};
