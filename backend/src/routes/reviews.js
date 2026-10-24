// ============================================================
// MansaRent — Avis (reviews) sur annonces et agents
// Règles : connexion requise, 1 avis par personne et par cible,
// impossible de noter son propre profil ou sa propre annonce.
// ============================================================
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const reviewSchema = z.object({
  propertyId: z.string().optional(),
  agentId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().max(2000).optional().default(""),
});

// ---- Liste des avis ------------------------------------------
// GET /reviews?propertyId=xxx  ou  ?agentId=xxx
router.get("/", async (req, res) => {
  try {
    const { propertyId, agentId } = req.query;
    const where = {};
    if (propertyId) where.propertyId = propertyId;
    if (agentId) {
      // Avis liés aux annonces de l'agent + avis directs sur l'agent
      const props = await prisma.property.findMany({
        where: { landlordId: agentId },
        select: { id: true },
      });
      const ids = props.map((p) => p.id);
      where.OR = [{ agentId }, ...(ids.length ? [{ propertyId: { in: ids } }] : [])];
    }
    if (!propertyId && !agentId) return res.status(400).json({ error: "propertyId ou agentId requis" });
    const reviews = await prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    res.json({ reviews });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Avis impossibles à charger" });
  }
});

// ---- Publier un avis (connexion requise) -----------------------
router.post("/", requireAuth, async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body || {});
  if (!parsed.success || (!parsed.data.propertyId && !parsed.data.agentId)) {
    return res.status(400).json({ error: "propertyId ou agentId + note requis" });
  }
  const { propertyId, agentId, rating, text } = parsed.data;
  try {
    if (agentId) {
      const target = await prisma.user.findUnique({ where: { id: agentId }, select: { id: true } });
      if (!target) return res.status(404).json({ error: "Agent introuvable" });
      if (agentId === req.user.id) return res.status(400).json({ error: "Vous ne pouvez pas noter votre propre profil", code: "SELF_REVIEW" });
    }
    if (propertyId) {
      const prop = await prisma.property.findUnique({ where: { id: propertyId }, select: { landlordId: true } });
      if (!prop) return res.status(404).json({ error: "Annonce introuvable" });
      if (prop.landlordId === req.user.id) return res.status(400).json({ error: "Vous ne pouvez pas noter votre propre annonce", code: "SELF_REVIEW" });
    }
    const dup = await prisma.review.findFirst({
      where: { authorId: req.user.id, ...(agentId ? { agentId } : { propertyId }) },
      select: { id: true },
    });
    if (dup) return res.status(409).json({ error: "Vous avez déjà laissé un avis", code: "ALREADY_REVIEWED" });
    const review = await prisma.review.create({
      data: { propertyId: propertyId || null, agentId: agentId || null, rating, text, author: req.user.name, authorId: req.user.id },
    });
    res.status(201).json({ review });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Publication impossible" });
  }
});

export default router;
