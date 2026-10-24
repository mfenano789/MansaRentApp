// ============================================================
// MansaRent — Réglages du site pilotés par l'admin
// L'admin ajuste le frontend (annonce, image hero, images catégories,
// contact) sans redéployer : le frontend lit GET /api/settings.
// ============================================================
import { prisma } from "./db.js";

export const SETTING_DEFS = {
  announcement: { public: true, def: { enabled: false, textFr: "", textEn: "" } },
  hero: { public: true, def: { image: "" } },
  categories: { public: true, def: {} }, // { Maison: "https://…", … }
  contact: { public: true, def: { phone: "", email: "" } },
};

export async function getAllSettings() {
  const out = {};
  for (const [k, d] of Object.entries(SETTING_DEFS)) out[k] = { ...d.def };
  try {
    const rows = await prisma.siteSetting.findMany();
    for (const r of rows) if (SETTING_DEFS[r.key]) out[r.key] = { ...SETTING_DEFS[r.key].def, ...(r.value || {}) };
  } catch { /* base indisponible : défauts */ }
  return out;
}

export async function getPublicSettings() {
  const all = await getAllSettings();
  const pub = {};
  for (const [k, d] of Object.entries(SETTING_DEFS)) if (d.public) pub[k] = all[k];
  return pub;
}

export async function saveSetting(key, value) {
  if (!SETTING_DEFS[key]) throw new Error("Réglage inconnu");
  const merged = { ...SETTING_DEFS[key].def, ...(value || {}) };
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: merged },
    update: { value: merged },
  });
  return { key, value: merged };
}
