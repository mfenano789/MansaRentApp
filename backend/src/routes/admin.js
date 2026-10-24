// ============================================================
// MansaRent — Administration (réservé au rôle admin)
// C'est ici que vous « voyez et gérez tout » : stats,
// utilisateurs, annonces, abonnements.
// ============================================================
import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { Storage } from "../lib/storage.js";
import { listIntegrations, saveIntegration } from "../lib/integrations.js";
import { getAllSettings, saveSetting } from "../lib/settings.js";
import { decryptSecret } from "../lib/secrets.js";
import { Mailer } from "../lib/email.js";
import { Push } from "../lib/push.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// ---- Tableau de bord : chiffres clés -------------------------------
router.get("/stats", async (_req, res) => {
  try {
    const [users, properties, messages, reviews, pendingVerifications] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.message.count(),
      prisma.review.count(),
      prisma.user.count({ where: { verification: "pending" } }),
    ]);
    res.json({ users, properties, messages, reviews, pendingVerifications });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Stats impossibles" });
  }
});

// ---- Utilisateurs ----------------------------------------------------
router.get("/users", async (req, res) => {
  try {
    const { page, limit, q } = req.query;
    const take = Math.min(Number(limit) || 25, 100);
    const skip = ((Number(page) || 1) - 1) * take;
    const where = q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
      : {};
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, take, skip, orderBy: { createdAt: "desc" } }),
    ]);
    res.json({ users: users.map(({ password, ...u }) => u), total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Utilisateurs impossibles à charger" });
  }
});

router.put("/users/:id/role", async (req, res) => {
  const { role } = req.body || {};
  if (!["tenant", "landlord", "agent", "admin"].includes(role)) {
    return res.status(400).json({ error: "Rôle invalide" });
  }
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    const { password, ...safe } = user;
    res.json({ user: safe });
  } catch {
    res.status(404).json({ error: "Utilisateur introuvable" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Utilisateur introuvable" });
  }
});

// ---- Annonces ----------------------------------------------------------
router.get("/properties", async (req, res) => {
  try {
    const { page, limit, q } = req.query;
    const take = Math.min(Number(limit) || 25, 100);
    const skip = ((Number(page) || 1) - 1) * take;
    const where = q
      ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { landlord: { name: { contains: q, mode: "insensitive" } } }] }
      : {};
    const [total, properties] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where, take, skip, orderBy: { createdAt: "desc" },
        include: { landlord: { select: { id: true, name: true, email: true } } },
      }),
    ]);
    res.json({ properties, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Annonces impossibles à charger" });
  }
});

router.put("/properties/:id/featured", async (req, res) => {
  try {
    const p = await prisma.property.update({
      where: { id: req.params.id },
      data: { featured: req.body?.featured ?? true },
    });
    res.json({ property: p });
  } catch {
    res.status(404).json({ error: "Annonce introuvable" });
  }
});

router.delete("/properties/:id", async (req, res) => {
  try {
    await prisma.property.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Annonce introuvable" });
  }
});

// ---- Vérification des agents et vendeurs/propriétaires -----------------
// L'admin voit la pièce d'identité en clair pour contrôler le dossier.
router.get("/verifications", async (req, res) => {
  try {
    const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : "pending";
    const users = await prisma.user.findMany({
      where: { verification: status, proProfile: { isNot: null } },
      include: { proProfile: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    res.json({
      status,
      verifications: users.map((u) => {
        const pp = u.proProfile;
        let idNumber = "";
        try { idNumber = decryptSecret(pp.idNumber); } catch { idNumber = "(illisible — APP_ENCRYPTION_KEY a changé)"; }
        return {
          userId: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          verification: u.verification,
          createdAt: u.createdAt,
          profile: { ...pp, idNumber },
        };
      }),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Vérifications impossibles à charger" });
  }
});

router.put("/verifications/:userId", async (req, res) => {
  const { decision, reason } = req.body || {};
  if (!["approve", "reject"].includes(decision)) return res.status(400).json({ error: "Décision invalide" });
  if (decision === "reject" && !String(reason || "").trim()) {
    return res.status(400).json({ error: "Motif du refus requis" });
  }
  try {
    const u = await prisma.user.findUnique({ where: { id: req.params.userId }, include: { proProfile: true } });
    if (!u?.proProfile) return res.status(404).json({ error: "Dossier introuvable" });
    const approved = decision === "approve";
    await prisma.$transaction([
      prisma.user.update({ where: { id: u.id }, data: { verification: approved ? "approved" : "rejected" } }),
      prisma.proProfile.update({
        where: { userId: u.id },
        data: { reviewedAt: new Date(), rejectionReason: approved ? null : String(reason).trim().slice(0, 500) },
      }),
    ]);
    (approved ? Mailer.verificationApproved(u.email, u.name) : Mailer.verificationRejected(u.email, u.name, String(reason).trim()))
      .catch((e) => console.warn("[mail]", e.message));
    Push.toUser(u.id, approved
      ? { title: "Compte vérifié ✅", body: "Vous pouvez maintenant publier vos annonces sur MansaRent.", data: { type: "verification", status: "approved" } }
      : { title: "Vérification refusée", body: String(reason).trim().slice(0, 140), data: { type: "verification", status: "rejected" } },
    ).catch((e) => console.warn("[push]", e.message));
    res.json({ ok: true, verification: approved ? "approved" : "rejected" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Décision impossible à enregistrer" });
  }
});


// ---- Intégrations API (paiement, e-mail, stockage, OAuth…) -------------
// L'admin connecte les fournisseurs ici : clés chiffrées en base,
// prioritaires sur le .env, appliquées sans redémarrage.
router.get("/integrations", async (_req, res) => {
  try {
    res.json({ integrations: await listIntegrations() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Intégrations impossibles à charger" });
  }
});

router.put("/integrations/:provider", async (req, res) => {
  try {
    const saved = await saveIntegration(req.params.provider, req.body || {});
    res.json(saved);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message || "Sauvegarde impossible" });
  }
});

// ---- Réglages du site (contenu frontend) --------------------------------
router.get("/settings", async (_req, res) => {
  try {
    res.json({ settings: await getAllSettings() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Réglages impossibles à charger" });
  }
});

router.put("/settings/:key", async (req, res) => {
  try {
    res.json(await saveSetting(req.params.key, req.body?.value));
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message || "Sauvegarde impossible" });
  }
});

// ---- Upload d'image (hero, catégories…) → URL publique ------------------
router.post("/uploads", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucune image reçue (champ « image »)" });
    const ext = (req.file.mimetype.split("/")[1] || "jpg").split("+")[0];
    const r = await Storage.upload(req.file.buffer, { contentType: req.file.mimetype, ext, prefix: "site" });
    if (r.demo) return res.status(503).json({ error: "Stockage R2 non configuré (connectez-le dans Intégrations)" });
    res.json({ url: r.url, key: r.key });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upload impossible" });
  }
});

export default router;
