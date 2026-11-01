// ============================================================
// MansaRent — Messagerie interne (conversations + messages)
//  · direct : client ↔ agent (location) / voyageur ↔ hôte (court séjour)
//  · sale   : acheteur ↔ MansaRent (admin) — l'agent ne voit pas l'acheteur
//  · agent  : MansaRent (admin) ↔ agent qui a publié le bien à vendre
// ============================================================
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { Mailer } from "../lib/email.js";
import { Push } from "../lib/push.js";
import { isSale, openLead, notifyAdmins } from "../lib/deals.js";

const router = Router();
const MANSARENT = { id: "mansarent", name: "MansaRent", avatar: null, role: "admin", verified: true, mansarent: true };
const isAdmin = (u) => u?.role === "admin";

/** Qui peut lire / écrire dans cette conversation. */
function canAccess(conv, user) {
  if (conv.tenantId === user.id || conv.landlordId === user.id) return true;
  return isAdmin(user) && conv.kind !== "direct"; // toute l'équipe MansaRent suit les ventes
}

/** Interlocuteur affiché + rôle du lecteur. */
function sides(conv, user) {
  if (conv.kind === "sale") {
    // tenant = acheteur · landlord = admin
    return isAdmin(user) && conv.tenantId !== user.id
      ? { otherId: conv.tenantId, myRole: "admin" }
      : { other: MANSARENT, myRole: "buyer" };
  }
  if (conv.kind === "agent") {
    // tenant = admin · landlord = agent
    return isAdmin(user) && conv.landlordId !== user.id
      ? { otherId: conv.landlordId, myRole: "admin" }
      : { other: MANSARENT, myRole: "owner" };
  }
  return conv.tenantId === user.id
    ? { otherId: conv.landlordId, myRole: "buyer" }
    : { otherId: conv.tenantId, myRole: "owner" };
}

// ---- Liste des conversations de l'utilisateur -----------------
router.get("/", requireAuth, async (req, res) => {
  try {
    const admin = isAdmin(req.user);
    const convs = await prisma.conversation.findMany({
      where: {
        OR: [
          { tenantId: req.user.id },
          { landlordId: req.user.id },
          ...(admin ? [{ kind: { in: ["sale", "agent"] } }] : []),
        ],
      },
      include: {
        property: { select: { id: true, title: true, price: true, city: true, images: true, rentalType: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    const meta = convs.map((c) => ({ c, ...sides(c, req.user) }));
    const otherIds = [...new Set(meta.map((m) => m.otherId).filter(Boolean))];
    const convIds = convs.map((c) => c.id);
    const [others, adminIds, leads] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: otherIds } },
        select: { id: true, name: true, avatar: true, role: true, verification: true },
      }),
      admin ? prisma.user.findMany({ where: { role: "admin" }, select: { id: true } }).then((r) => r.map((u) => u.id)) : [],
      convIds.length
        ? prisma.lead.findMany({
            where: { OR: [{ buyerConvId: { in: convIds } }, { agentConvId: { in: convIds } }] },
            select: { id: true, buyerConvId: true, agentConvId: true, status: true },
          })
        : [],
    ]);
    const byId = Object.fromEntries(others.map((u) => [u.id, u]));
    const leadOf = (id) => leads.find((l) => l.buyerConvId === id || l.agentConvId === id) || null;
    const rows = await Promise.all(
      meta.map(async ({ c, other, otherId, myRole }) => {
        // Pour l'admin, les messages de l'équipe MansaRent ne comptent pas comme « non lus ».
        const notMine = myRole === "admin" ? { senderId: { notIn: adminIds } } : { NOT: { senderId: req.user.id } };
        const unread = await prisma.message.count({ where: { conversationId: c.id, read: false, ...notMine } });
        const o = other || byId[otherId];
        const lead = leadOf(c.id);
        return {
          ...c,
          unread,
          myRole,
          leadId: myRole === "admin" ? lead?.id || null : null,
          leadStatus: myRole === "admin" ? lead?.status || null : null,
          other: o?.mansarent ? o
            : o ? { id: o.id, name: o.name, avatar: o.avatar, role: o.role, verified: o.verification === "approved" || o.role === "admin" }
            : { id: otherId, name: "—" },
          lastAt: c.messages[0]?.createdAt || c.createdAt,
        };
      })
    );
    rows.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
    res.json({ conversations: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Conversations impossibles à charger" });
  }
});

// ---- Démarrer une conversation ---------------------------------
// Bien à vendre → la demande part chez MansaRent (dossier acheteur), pas chez l'agent.
const startSchema = z.object({
  propertyId: z.string().min(1),
  message: z.string().max(2000).optional().default(""),
  visitAt: z.string().datetime().optional().nullable(),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = startSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "propertyId requis" });
  const { propertyId, message, visitAt } = parsed.data;
  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return res.status(404).json({ error: "Annonce introuvable" });
    if (property.landlordId === req.user.id) {
      return res.status(400).json({ error: "Vous êtes le propriétaire de cette annonce" });
    }
    if (isSale(property)) {
      if (isAdmin(req.user)) return res.status(400).json({ error: "Ouvrez ce dossier depuis l'admin (onglet Demandes)" });
      const { conversation, lead, created } = await openLead({
        property, buyer: req.user, message, visitAt: visitAt ? new Date(visitAt) : null,
      });
      return res.status(created ? 201 : 200).json({ conversation, leadId: lead.id, viaMansaRent: true });
    }
    const existing = await prisma.conversation.findFirst({
      where: { kind: "direct", propertyId, tenantId: req.user.id, landlordId: property.landlordId },
    });
    const conv = existing || await prisma.conversation.create({
      data: { kind: "direct", propertyId, tenantId: req.user.id, landlordId: property.landlordId },
    });
    if (message?.trim()) {
      await prisma.message.create({ data: { conversationId: conv.id, senderId: req.user.id, text: message.trim() } });
    }
    res.status(existing ? 200 : 201).json({ conversation: conv });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Conversation impossible" });
  }
});

// ---- Messages d'une conversation --------------------------------
router.get("/:id/messages", requireAuth, async (req, res) => {
  try {
    const conv = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!conv) return res.status(404).json({ error: "Conversation introuvable" });
    if (!canAccess(conv, req.user)) return res.status(403).json({ error: "Non autorisé" });
    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { role: true } } },
    });
    // Les messages de l'équipe sont signés « MansaRent » (l'admin les voit comme siens).
    res.json({
      messages: messages.map(({ sender, ...m }) => ({ ...m, fromMansaRent: conv.kind !== "direct" && sender?.role === "admin" })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Messages impossibles à charger" });
  }
});

// ---- Envoyer un message -------------------------------------------
const msgSchema = z.object({ text: z.string().min(1).max(2000) });

router.post("/:id/messages", requireAuth, async (req, res) => {
  const parsed = msgSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Message invalide" });
  try {
    const conv = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: { property: { select: { title: true } } },
    });
    if (!conv) return res.status(404).json({ error: "Conversation introuvable" });
    if (!canAccess(conv, req.user)) return res.status(403).json({ error: "Non autorisé" });
    const msg = await prisma.message.create({
      data: { conversationId: conv.id, senderId: req.user.id, text: parsed.data.text },
    });
    const title = conv.property?.title || "votre annonce";
    const body = parsed.data.text.slice(0, 140);
    const data = { type: "message", conversationId: conv.id };
    const fromTeam = isAdmin(req.user) && conv.kind !== "direct";

    if (conv.kind !== "direct" && !fromTeam) {
      // Acheteur ou agent qui écrit à MansaRent → toute l'équipe admin est prévenue.
      notifyAdmins({ title: `${req.user.name} · ${title}`, body, data }).catch(() => {});
    } else {
      // Message direct, ou réponse de MansaRent à l'acheteur / à l'agent.
      const otherId = conv.kind === "sale" ? conv.tenantId
        : conv.kind === "agent" ? conv.landlordId
        : conv.tenantId === req.user.id ? conv.landlordId : conv.tenantId;
      const senderName = fromTeam ? "MansaRent" : req.user.name;
      prisma.user.findUnique({ where: { id: otherId } }).then((other) => {
        if (other?.email) Mailer.newMessage(other.email, senderName, title).catch(() => {});
        Push.toUser(otherId, { title: senderName, body, data }).catch((e) => console.warn("[push]", e.message));
      }).catch(() => {});
      // Première réponse de l'équipe à un acheteur : le dossier passe à « contacté ».
      if (fromTeam && conv.kind === "sale") {
        prisma.lead.updateMany({ where: { buyerConvId: conv.id, status: "new" }, data: { status: "contacted" } }).catch(() => {});
      }
    }
    res.status(201).json({ message: msg });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Envoi impossible" });
  }
});

// ---- Marquer comme lu ----------------------------------------------
router.put("/:id/read", requireAuth, async (req, res) => {
  try {
    const conv = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!conv) return res.status(404).json({ error: "Conversation introuvable" });
    if (!canAccess(conv, req.user)) return res.status(403).json({ error: "Non autorisé" });
    await prisma.message.updateMany({
      where: { conversationId: conv.id, NOT: { senderId: req.user.id } },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Mise à jour impossible" });
  }
});

export default router;
