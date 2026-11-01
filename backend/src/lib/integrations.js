// ============================================================
// MansaRent — Intégrations pilotées par l'admin
// L'admin connecte n'importe quel fournisseur (e-mail, notifications,
// stockage, OAuth…) sans toucher au code : les valeurs sont chiffrées
// en base et RECOPIÉES dans process.env (prioritaire sur le .env).
// Les modules existants (email.js, storage.js, push.js) continuent
// de lire process.env — aucune modification requise chez eux.
// ============================================================
import { prisma } from "./db.js";
import { encryptSecret, decryptSecret } from "./secrets.js";

// Registre des fournisseurs connus : champ -> variable d'environnement.
// secret: true = chiffré en base + masqué dans les réponses admin.
export const INTEGRATION_DEFS = {
  zeptomail: { label: "ZeptoMail (e-mails)", fields: [
    { key: "ZEPTOMAIL_API_KEY", label: "Clé API", secret: true },
    { key: "ZEPTOMAIL_HOST", label: "Hôte API (ex. api.zeptomail.ca)", secret: false },
    { key: "MAIL_FROM", label: "Adresse d'envoi", secret: false },
    { key: "MAIL_FROM_NAME", label: "Nom d'envoi", secret: false },
  ]},
  r2: { label: "Cloudflare R2 (images)", fields: [
    { key: "R2_ACCOUNT_ID", label: "Account ID", secret: false },
    { key: "R2_ACCESS_KEY_ID", label: "Access Key", secret: true },
    { key: "R2_SECRET_ACCESS_KEY", label: "Secret Key", secret: true },
    { key: "R2_BUCKET_NAME", label: "Bucket", secret: false },
    { key: "R2_PUBLIC_URL", label: "URL publique", secret: false },
  ]},
  mansasend: { label: "MansaSend (paiements : Orange Money, MTN, carte)", fields: [
    { key: "MANSASEND_API_URL", label: "URL de l'API MansaSend (ex. https://api.mansasend.com)", secret: false },
    { key: "MANSASEND_MERCHANT_ID", label: "Merchant ID (compte marchand MansaRent)", secret: false },
    { key: "MANSASEND_API_KEY", label: "Clé API secrète", secret: true },
    { key: "MANSASEND_WEBHOOK_SECRET", label: "Secret de signature des callbacks", secret: true },
    { key: "MANSASEND_PAYOUTS", label: "Versements & remboursements automatiques (on / off — off = envoi manuel)", secret: false },
    { key: "MANSARENT_COMMISSION_PCT", label: "Commission MansaRent % (défaut 10)", secret: false },
    { key: "PAY_FEE_MOBILE_PCT", label: "Frais Orange Money / MTN % (défaut 2,5)", secret: false },
    { key: "PAY_FEE_CARD_PCT", label: "Frais carte % (défaut 2)", secret: false },
    { key: "PAY_FEE_PAYOUT_PCT", label: "Frais de versement % (défaut 1,5)", secret: false },
  ]},
  firebase: { label: "Firebase (notifications push de l'appli)", fields: [
    { key: "FIREBASE_SERVICE_ACCOUNT", label: "Compte de service (contenu JSON complet)", secret: true },
  ]},
  google: { label: "Google OAuth", fields: [
    { key: "GOOGLE_CLIENT_ID", label: "Client ID", secret: false },
    { key: "GOOGLE_CLIENT_SECRET", label: "Client Secret", secret: true },
  ]},
};

const SECRET_KEYS = new Set(
  Object.values(INTEGRATION_DEFS).flatMap((d) => d.fields.filter((f) => f.secret).map((f) => f.key))
);

function encryptConfig(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === "" || v == null) continue;
    out[k] = SECRET_KEYS.has(k) ? encryptSecret(v) : String(v);
  }
  return JSON.stringify(out);
}

function decryptConfig(blob) {
  const raw = JSON.parse(blob || "{}");
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    try { out[k] = SECRET_KEYS.has(k) ? decryptSecret(v) : v; }
    catch { out[k] = ""; }
  }
  return out;
}

// ---- Lecture -------------------------------------------------------
// Config effective d'un fournisseur : .env d'abord, écrasé par la base admin.
export async function getIntegration(provider) {
  const def = INTEGRATION_DEFS[provider];
  const envCfg = {};
  if (def) for (const f of def.fields) if (process.env[f.key]) envCfg[f.key] = process.env[f.key];
  try {
    const row = await prisma.integration.findUnique({ where: { provider } });
    if (!row) return { provider, enabled: false, config: envCfg, fromDb: false };
    return { provider, enabled: row.enabled, config: { ...envCfg, ...decryptConfig(row.config) }, fromDb: true };
  } catch {
    return { provider, enabled: false, config: envCfg, fromDb: false };
  }
}

// ---- Liste admin (secrets masqués : on dit s'ils sont définis) -----
export async function listIntegrations() {
  return Promise.all(Object.entries(INTEGRATION_DEFS).map(async ([provider, def]) => {
    const cur = await getIntegration(provider);
    const fields = def.fields.map((f) => ({
      ...f,
      set: !!(cur.config[f.key] || process.env[f.key]),
      // Les non-secrets sont renvoyés (pratique) ; les secrets jamais.
      value: f.secret ? undefined : (cur.config[f.key] || process.env[f.key] || ""),
    }));
    return { provider, label: def.label, enabled: cur.enabled, fromDb: cur.fromDb, fields };
  }));
}

// ---- Écriture admin ------------------------------------------------
export async function saveIntegration(provider, { enabled, config }) {
  if (!INTEGRATION_DEFS[provider] && !provider.startsWith("custom_")) {
    throw new Error("Fournisseur inconnu (préfixez vos ajouts par custom_)");
  }
  const row = await prisma.integration.upsert({
    where: { provider },
    create: { provider, enabled: !!enabled, config: encryptConfig(config) },
    update: { enabled: !!enabled, config: encryptConfig(config) },
  });
  await syncIntegrationsToEnv();
  return { provider: row.provider, enabled: row.enabled };
}

// ---- Base -> process.env (la base admin gagne sur le .env) ---------
export async function syncIntegrationsToEnv() {
  try {
    const rows = await prisma.integration.findMany({ where: { enabled: true } });
    let n = 0;
    for (const row of rows) {
      const cfg = decryptConfig(row.config);
      for (const [k, v] of Object.entries(cfg)) {
        if (v !== "" && v != null) { process.env[k] = v; n++; }
      }
    }
    if (n > 0) console.log(`[integrations] ${n} variable(s) chargée(s) depuis l'admin`);
    return n;
  } catch (e) {
    console.warn("[integrations] sync impossible (base indisponible ?)", e.message);
    return 0;
  }
}
