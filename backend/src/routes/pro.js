// ============================================================
// MansaRent — Espace professionnel (agent / vendeur-propriétaire)
//   GET  /api/pro/me         → profil + statut de vérification
//   PUT  /api/pro/me         → soumettre / mettre à jour le profil (→ en attente)
//   GET  /api/pro/dashboard  → annonces + statistiques du tableau de bord
// ============================================================
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { encryptSecret, decryptSecret } from "../lib/secrets.js";
import { isPro, statsFor } from "../lib/pro.js";

const router = Router();
router.use(requireAuth);

const ID_TYPES = ["national_id", "passport", "driver_license", "voter_card"];

const profileSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(4).max(240),
  city: z.string().trim().min(2).max(80),
  idType: z.enum(ID_TYPES),
  idNumber: z.string().trim().min(4).max(40).optional(), // absent = garder l'actuel
  yearsExperience: z.number().int().min(0).max(70).optional().default(0),
  agencyName: z.string().trim().max(120).optional().nullable(),
  licenseNumber: z.string().trim().max(60).optional().nullable(),
  bio: z.string().trim().max(1500).optional().nullable(),
});

const mask = (v) => {
  if (!v) return "";
  const s = String(v);
  return s.length <= 4 ? "••••" : `••••${s.slice(-4)}`;
};

function view(user, profile) {
  let idNumberMasked = "";
  if (profile?.idNumber) {
    try { idNumberMasked = mask(decryptSecret(profile.idNumber)); } catch { idNumberMasked = "••••"; }
  }
  return {
    role: user.role,
    verification: user.verification,
    profile: profile
      ? {
          kind: profile.kind,
          fullName: profile.fullName,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          idType: profile.idType,
          idNumberMasked,
          yearsExperience: profile.yearsExperience,
          agencyName: profile.agencyName,
          licenseNumber: profile.licenseNumber,
          bio: profile.bio,
          rejectionReason: user.verification === "rejected" ? profile.rejectionReason : null,
          submittedAt: profile.submittedAt,
          reviewedAt: profile.reviewedAt,
        }
      : null,
  };
}

router.get("/me", async (req, res) => {
  try {
    const profile = await prisma.proProfile.findUnique({ where: { userId: req.user.id } });
    res.json(view(req.user, profile));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Profil impossible à charger" });
  }
});

router.put("/me", async (req, res) => {
  if (!isPro(req.user)) {
    return res.status(403).json({ error: "Réservé aux agents et propriétaires", code: "ROLE_REQUIRED" });
  }
  const parsed = profileSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
  }
  const d = parsed.data;
  try {
    const existing = await prisma.proProfile.findUnique({ where: { userId: req.user.id } });
    if (!existing && !d.idNumber) {
      return res.status(400).json({ error: "Numéro de pièce d'identité requis", code: "ID_REQUIRED" });
    }
    const data = {
      kind: req.user.role,
      fullName: d.fullName,
      phone: d.phone,
      address: d.address,
      city: d.city,
      idType: d.idType,
      yearsExperience: req.user.role === "agent" ? d.yearsExperience : 0,
      agencyName: d.agencyName || null,
      licenseNumber: d.licenseNumber || null,
      bio: d.bio || null,
      rejectionReason: null,
      reviewedAt: null,
      submittedAt: new Date(),
      ...(d.idNumber ? { idNumber: encryptSecret(d.idNumber) } : {}),
    };
    const profile = existing
      ? await prisma.proProfile.update({ where: { userId: req.user.id }, data })
      : await prisma.proProfile.create({ data: { ...data, userId: req.user.id } });
    // Toute soumission (ou modification) repasse par la vérification de l'admin.
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { verification: "pending", phone: d.phone },
    });
    res.json(view(user, profile));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Enregistrement impossible" });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: { landlordId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { favorites: true, conversations: true, reviews: true } } },
    });
    const stats = (await statsFor([req.user.id]))[req.user.id];
    res.json({
      verification: req.user.verification,
      stats,
      properties: properties.map(({ _count, ...p }) => ({
        ...p,
        favoritesCount: _count.favorites,
        messagesCount: _count.conversations,
        reviewsCount: _count.reviews,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Tableau de bord indisponible" });
  }
});

export default router;
