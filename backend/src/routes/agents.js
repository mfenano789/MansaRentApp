// ============================================================
// MansaRent — Profils publics des agents et vendeurs/propriétaires
//   GET /api/agents/leaderboard?kind=agent|landlord  → classement
//   GET /api/agents/:id                              → profil public
// ============================================================
import { Router } from "express";
import { prisma } from "../lib/db.js";
import { publicPro, statsFor, rank } from "../lib/pro.js";

const router = Router();

// ---- Classement : transactions conclues, puis note, puis avis ------------
router.get("/leaderboard", async (req, res) => {
  try {
    const kind = ["landlord", "hotel"].includes(req.query.kind) ? req.query.kind : "agent";
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const users = await prisma.user.findMany({
      where: { role: kind, verification: "approved" },
      include: { proProfile: true },
    });
    const stats = await statsFor(users.map((u) => u.id));
    const rows = rank(users.map((u) => ({ ...publicPro(u), stats: stats[u.id] })));
    res.json({ kind, leaderboard: rows.slice(0, limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Classement indisponible" });
  }
});

// ---- Profil public + annonces + avis --------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const agent = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { proProfile: true },
    });
    if (!agent) return res.status(404).json({ error: "Agent introuvable" });
    const [properties, stats] = await Promise.all([
      prisma.property.findMany({
        // Les biens à vendre passent par MansaRent : ils n'apparaissent pas sur le profil public.
        where: { landlordId: agent.id, rentalType: { not: "Vente" } },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: { _count: { select: { favorites: true } } },
      }),
      statsFor([agent.id]),
    ]);
    const propIds = properties.map((p) => p.id);
    const reviews = await prisma.review.findMany({
      where: { OR: [{ agentId: agent.id }, ...(propIds.length ? [{ propertyId: { in: propIds } }] : [])] },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    // Rang dans le classement de sa catégorie (agents vérifiés uniquement).
    let rankPos = null;
    if (["agent", "landlord", "hotel"].includes(agent.role) && agent.verification === "approved") {
      const peers = await prisma.user.findMany({
        where: { role: agent.role, verification: "approved" },
        select: { id: true },
      });
      const peerStats = await statsFor(peers.map((u) => u.id));
      rankPos = rank(peers.map((u) => ({ id: u.id, stats: peerStats[u.id] }))).find((r) => r.id === agent.id)?.rank ?? null;
    }
    const s = stats[agent.id];
    res.json({
      agent: publicPro(agent),
      stats: s,
      rank: rankPos,
      rating: s.rating,
      reviewCount: s.reviewCount,
      properties: properties.map(({ _count, ...p }) => ({ ...p, favoritesCount: _count.favorites })),
      reviews,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Profil impossible à charger" });
  }
});

export default router;
