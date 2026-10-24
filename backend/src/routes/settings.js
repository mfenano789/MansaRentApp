// ============================================================
// MansaRent — Réglages publics du site (sans auth, clés publiques only)
// Le frontend lit cette route pour appliquer les ajustements admin
// (annonce, image hero, images catégories, contact).
// ============================================================
import { Router } from "express";
import { getPublicSettings } from "../lib/settings.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    res.json({ settings: await getPublicSettings() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Réglages indisponibles" });
  }
});

export default router;
