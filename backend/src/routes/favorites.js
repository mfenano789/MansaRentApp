// ============================================================
// MansaRent — Favoris
// ============================================================
import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ---- Liste des favoris --------------------------------------
router.get("/", requireAuth, async (req, res) => {
  try {
    const favs = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: {
        property: { include: { landlord: { select: { id: true, name: true, avatar: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ favorites: favs.map((f) => f.property) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Favoris impossibles à charger" });
  }
});

// ---- Basculer un favori --------------------------------------
router.post("/:id", requireAuth, async (req, res) => {
  try {
    const propertyId = req.params.id;
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return res.status(404).json({ error: "Annonce introuvable" });
    const existing = await prisma.favorite.findUnique({
      where: { userId_propertyId: { userId: req.user.id, propertyId } },
    });
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return res.json({ favorited: false });
    }
    await prisma.favorite.create({ data: { userId: req.user.id, propertyId } });
    res.json({ favorited: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Favori impossible" });
  }
});

export default router;
