// ============================================================
// MansaRent — Téléphones enregistrés pour les notifications push
// ============================================================
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const schema = z.object({
  token: z.string().min(10).max(4096),
  platform: z.enum(["android", "ios"]).optional().default("android"),
});

// Un jeton = un téléphone ; s'il change de compte, il suit le dernier connecté.
router.post("/", requireAuth, async (req, res) => {
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Jeton invalide" });
  const { token, platform } = parsed.data;
  try {
    await prisma.deviceToken.upsert({
      where: { token },
      create: { token, platform, userId: req.user.id },
      update: { platform, userId: req.user.id },
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Enregistrement impossible" });
  }
});

// Déconnexion : ce téléphone ne reçoit plus les notifications du compte.
router.delete("/", requireAuth, async (req, res) => {
  const token = String(req.body?.token || "");
  if (!token) return res.status(400).json({ error: "Jeton requis" });
  try {
    await prisma.deviceToken.deleteMany({ where: { token, userId: req.user.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Suppression impossible" });
  }
});

export default router;
