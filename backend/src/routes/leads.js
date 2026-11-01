// ============================================================
// MansaRent — Demandes d'achat (réservé à l'équipe admin)
// L'acheteur écrit à MansaRent ; l'admin voit tout le dossier de l'agent
// (coordonnées, pièce d'identité, autres annonces) et peut lui écrire.
// ============================================================
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { decryptSecret } from "../lib/secrets.js";
import { Push } from "../lib/push.js";

const router = Router();
router.use(requireAuth, requireAdmin);

export const LEAD_STATUSES = ["new", "contacted", "visit", "offer", "sold", "lost"];

const USER_FIELDS = { id: true, name: true, username: true, email: true, phone: true, avatar: true, role: true, verification: true, createdAt: true };

function agentCard(u) {
  if (!u) return null;
  const pp = u.proProfile;
  let idNumber = "";
  if (pp?.idNumber) { try { idNumber = decryptSecret(pp.idNumber); } catch { idNumber = "(illisible)"; } }
  return {
    id: u.id, name: u.name, username: u.username, email: u.email, avatar: u.avatar,
    role: u.role, verification: u.verification, memberSince: u.createdAt,
    phone: pp?.phone || u.phone || null,
    fullName: pp?.fullName || null,
    address: pp?.address || null,
    city: pp?.city || null,
    agencyName: pp?.agencyName || null,
    licenseNumber: pp?.licenseNumber || null,
    yearsExperience: pp?.yearsExperience ?? null,
    idType: pp?.idType || null,
    idNumber: idNumber || null,
  };
}

async function hydrate(leads) {
  if (!leads.length) return [];
  const userIds = [...new Set(leads.flatMap((l) => [l.buyerId, l.agentId]))];
  const convIds = leads.flatMap((l) => [l.buyerConvId, l.agentConvId].filter(Boolean));
  const [users, admins, lastMsgs, listingCounts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { ...USER_FIELDS, proProfile: true } }),
    prisma.user.findMany({ where: { role: "admin" }, select: { id: true } }),
    prisma.message.findMany({ where: { conversationId: { in: convIds } }, orderBy: { createdAt: "desc" }, distinct: ["conversationId"] }),
    prisma.property.groupBy({ by: ["landlordId"], where: { landlordId: { in: leads.map((l) => l.agentId) } }, _count: { _all: true } }),
  ]);
  const adminIds = admins.map((a) => a.id);
  const unread = await prisma.message.groupBy({
    by: ["conversationId"],
    where: { conversationId: { in: convIds }, read: false, senderId: { notIn: adminIds } },
    _count: { _all: true },
  });
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  const lastBy = Object.fromEntries(lastMsgs.map((m) => [m.conversationId, m]));
  const unreadBy = Object.fromEntries(unread.map((u) => [u.conversationId, u._count._all]));
  const countBy = Object.fromEntries(listingCounts.map((c) => [c.landlordId, c._count._all]));
  return leads.map((l) => {
    const buyer = byId[l.buyerId];
    const last = [lastBy[l.buyerConvId], lastBy[l.agentConvId]].filter(Boolean).sort((a, b) => b.createdAt - a.createdAt)[0];
    return {
      ...l,
      property: l.property,
      buyer: buyer ? { id: buyer.id, name: buyer.name, username: buyer.username, email: buyer.email, phone: buyer.phone, avatar: buyer.avatar, memberSince: buyer.createdAt } : null,
      agent: { ...agentCard(byId[l.agentId]), listings: countBy[l.agentId] || 0 },
      lastMessage: last ? { text: last.text, at: last.createdAt } : null,
      unread: (unreadBy[l.buyerConvId] || 0) + (unreadBy[l.agentConvId] || 0),
      lastAt: last?.createdAt || l.updatedAt,
    };
  });
}

const PROPERTY_FIELDS = { id: true, title: true, price: true, city: true, neighborhood: true, images: true, status: true, type: true };

// ---- Liste (filtre ?status=) + compteurs par statut --------------------------
router.get("/", async (req, res) => {
  try {
    const status = LEAD_STATUSES.includes(req.query.status) ? req.query.status : null;
    const [rows, counts] = await Promise.all([
      prisma.lead.findMany({
        where: status ? { status } : {},
        include: { property: { select: PROPERTY_FIELDS } },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
      prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    const leads = await hydrate(rows);
    leads.sort((a, b) => (b.unread > 0) - (a.unread > 0) || new Date(b.lastAt) - new Date(a.lastAt));
    res.json({ leads, counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Demandes impossibles à charger" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id }, include: { property: { select: PROPERTY_FIELDS } } });
    if (!lead) return res.status(404).json({ error: "Demande introuvable" });
    const [full] = await hydrate([lead]);
    res.json({ lead: full });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Demande impossible à charger" });
  }
});

// ---- Statut, notes internes, date de visite -------------------------------
const updateSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().max(5000).optional().nullable(),
  visitAt: z.string().datetime().optional().nullable(),
  dealPrice: z.number().int().positive().optional().nullable(),
});

router.put("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });
  const { status, notes, visitAt, dealPrice } = parsed.data;
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ error: "Demande introuvable" });
    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(visitAt !== undefined ? { visitAt: visitAt ? new Date(visitAt) : null } : {}),
      },
      include: { property: { select: PROPERTY_FIELDS } },
    });
    // Vendu : le bien est marqué vendu → tableau de bord et classement de l'agent à jour.
    if (status === "sold" && lead.status !== "sold") {
      await prisma.property.update({
        where: { id: lead.propertyId },
        data: { status: "sold", closedAt: new Date(), ...(dealPrice ? { dealPrice } : {}) },
      });
      await prisma.lead.updateMany({
        where: { propertyId: lead.propertyId, id: { not: lead.id }, status: { notIn: ["sold", "lost"] } },
        data: { status: "lost" },
      });
      Push.toUser(lead.agentId, {
        title: "Bien vendu 🎉",
        body: `« ${updated.property.title} » est marqué vendu par MansaRent.`,
        data: { type: "verification" },
      }).catch(() => {});
    }
    const [full] = await hydrate([updated]);
    res.json({ lead: full });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Mise à jour impossible" });
  }
});

// ---- Ouvrir la conversation avec l'agent (créée une fois par dossier) ------
router.post("/:id/agent-chat", async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id }, include: { property: { select: { title: true } } } });
    if (!lead) return res.status(404).json({ error: "Demande introuvable" });
    if (lead.agentConvId) {
      const conv = await prisma.conversation.findUnique({ where: { id: lead.agentConvId } });
      if (conv) return res.json({ conversation: conv });
    }
    const conv = await prisma.conversation.create({
      data: { kind: "agent", propertyId: lead.propertyId, tenantId: req.user.id, landlordId: lead.agentId },
    });
    await prisma.lead.update({ where: { id: lead.id }, data: { agentConvId: conv.id } });
    res.status(201).json({ conversation: conv });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Conversation impossible" });
  }
});

export default router;
