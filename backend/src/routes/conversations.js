// ============================================================
// MansaRent — Messagerie interne (conversations + messages)
// ============================================================
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { Mailer } from "../lib/email.js";
import { Push } from "../lib/push.js";

const router = Router();

// ---- Liste des conversations de l'utilisateur -----------------
router.get("/", requireAuth, async (req, res) => {
  try {
    const convs = await prisma.conversation.findMany({
      where: { OR: [{ tenantId: req.user.id }, { landlordId: req.user.id }] },
      include: {
        property: { select: { id: true, title: true, price: true, city: true, images: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    // Nom de l'interlocuteur (l'acheteur voit l'agent, l'agent voit l'acheteur)
    const otherIds = [...new Set(convs.map((c) => (c.tenantId === req.user.id ? c.landlordId : c.tenantId)))];
    const others = await prisma.user.findMany({
      where: { id: { in: otherIds } },
      select: { id: true, name: true, avatar: true, role: true, verification: true },
    });
    const byId = Object.fromEntries(others.map((u) => [u.id, u]));
    const withUnread = await Promise.all(
      convs.map(async (c) => {
        const unread = await prisma.message.count({
          where: { conversationId: c.id, read: false, NOT: { senderId: req.user.id } },
        });
        const otherId = c.tenantId === req.user.id ? c.landlordId : c.tenantId;
        const o = byId[otherId];
        return {
          ...c,
          unread,
          myRole: c.tenantId === req.user.id ? "buyer" : "owner",
          other: o ? { id: o.id, name: o.name, avatar: o.avatar, role: o.role, verified: o.verification === "approved" || o.role === "admin" } : { id: otherId, name: "—" },
          lastAt: c.messages[0]?.createdAt || c.createdAt,
        };
      })
    );
    // Conversations les plus récentes (dernier message) en premier
    withUnread.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
    res.json({ conversations: withUnread });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Conversations impossibles à charger" });
  }
});

// ---- Démarrer une conversation ---------------------------------
router.post("/", requireAuth, async (req, res) => {
  const { propertyId } = req.body || {};
  if (!propertyId) return res.status(400).json({ error: "propertyId requis" });
  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return res.status(404).json({ error: "Annonce introuvable" });
    if (property.landlordId === req.user.id) {
      return res.status(400).json({ error: "Vous êtes le propriétaire de cette annonce" });
    }
    const existing = await prisma.conversation.findFirst({
      where: { propertyId, tenantId: req.user.id, landlordId: property.landlordId },
    });
    if (existing) return res.json({ conversation: existing });
    const conv = await prisma.conversation.create({
      data: { propertyId, tenantId: req.user.id, landlordId: property.landlordId },
    });
    res.status(201).json({ conversation: conv });
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
    if (conv.tenantId !== req.user.id && conv.landlordId !== req.user.id) {
      return res.status(403).json({ error: "Non autorisé" });
    }
    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
    });
    res.json({ messages });
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
    if (conv.tenantId !== req.user.id && conv.landlordId !== req.user.id) {
      return res.status(403).json({ error: "Non autorisé" });
    }
    const msg = await prisma.message.create({
      data: { conversationId: conv.id, senderId: req.user.id, text: parsed.data.text },
    });
    // Notification e-mail au destinataire (non bloquant)
    const otherId = conv.tenantId === req.user.id ? conv.landlordId : conv.tenantId;
    prisma.user.findUnique({ where: { id: otherId } }).then((other) => {
      if (other?.email) {
        Mailer.newMessage(other.email, req.user.name, conv.property?.title || "votre annonce").catch(() => {});
      }
      // Notification push sur son téléphone (si l'appli est installée)
      Push.toUser(otherId, {
        title: req.user.name || "MansaRent",
        body: parsed.data.text.slice(0, 140),
        data: { type: "message", conversationId: conv.id },
      }).catch((e) => console.warn("[push]", e.message));
    }).catch(() => {});
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
    if (conv.tenantId !== req.user.id && conv.landlordId !== req.user.id) {
      return res.status(403).json({ error: "Non autorisé" });
    }
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
