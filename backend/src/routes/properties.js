// ============================================================
// MansaRent — Routes des annonces (propriétés)
// ============================================================
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { isPro, isApprovedPro } from "../lib/pro.js";
import upload from "../middleware/upload.js";
import { Storage } from "../lib/storage.js";
import { canSeeOwner, isSale, isShortStay, maskContacts } from "../lib/deals.js";
import { guestNightly } from "../lib/payments.js";

const router = Router();

const propertySchema = z.object({
  title: z.string().min(3).max(160),
  type: z.enum(["Maison", "Appartement", "Chambre", "Villa", "Bureau", "Boutique"]),
  rentalType: z.enum(["Location longue durée", "Court séjour", "Vente", "Hôtel"]),
  price: z.number().int().positive(),
  city: z.string().min(2).max(80),
  neighborhood: z.string().max(120).optional().default(""),
  beds: z.number().int().min(0).max(30).optional().default(0),
  baths: z.number().int().min(0).max(30).optional().default(0),
  area: z.number().int().min(0).optional().default(0),
  tag: z.string().max(60).optional().nullable(),
  amenities: z.array(z.string()).optional().default([]),
  // URL publique (R2 / externe) ou image enregistrée par le backend (/api/uploads/…)
  images: z.array(z.string().max(500).refine((v) => /^https?:\/\//i.test(v) || v.startsWith("/api/uploads/"), "URL d'image invalide")).max(8).optional().default([]),
  description: z.string().min(10).max(5000),
  // Court séjour (type Airbnb)
  maxGuests: z.number().int().min(1).max(50).optional(),
  units: z.number().int().min(1).max(500).optional(), // hôtel : chambres identiques
  minNights: z.number().int().min(1).max(365).optional(),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  houseRules: z.string().max(3000).optional().nullable(),
});

// Pas de téléphone : le contact se fait uniquement par la messagerie MansaRent.
const OWNER_SELECT = { id: true, name: true, avatar: true, role: true, verification: true, proProfile: { select: { stars: true, agencyName: true } } };
const INCLUDE = { landlord: { select: OWNER_SELECT }, _count: { select: { favorites: true } } };

// Bien à vendre : l'agent reste caché (sauf pour lui-même et l'admin) —
// l'acheteur traite uniquement avec MansaRent.
const MANSARENT = { id: null, name: "MansaRent", avatar: undefined, role: "admin", verified: true, mansarent: true };

function serialize(p, viewer = null) {
  if (!p) return p;
  // Court séjour : le voyageur voit le prix de l'hôte + 10 % (commission MansaRent).
  if (isShortStay(p)) p = { ...p, guestPrice: guestNightly(p.price) };
  if (!canSeeOwner(p, viewer)) {
    const { _count, landlord, landlordId, ...rest } = p;
    return {
      ...rest,
      description: maskContacts(rest.description),
      houseRules: maskContacts(rest.houseRules),
      viaMansaRent: true,
      favoritesCount: _count?.favorites ?? undefined,
      landlordInfo: { name: MANSARENT.name },
      landlord: MANSARENT,
    };
  }
  const { _count, ...rest } = p;
  return {
    viaMansaRent: isSale(p),
    ...rest,
    favoritesCount: _count?.favorites ?? undefined,
    landlordInfo: p.landlord
      ? { name: (p.landlord.role === "hotel" && p.landlord.proProfile?.agencyName) || p.landlord.name, avatar: p.landlord.avatar || undefined }
      : undefined,
    landlord: p.landlord
      ? {
          id: p.landlord.id,
          name: p.landlord.name,
          avatar: p.landlord.avatar || undefined,
          role: p.landlord.role,
          verified: p.landlord.verification === "approved" || p.landlord.role === "admin",
          stars: p.landlord.proProfile?.stars ?? null,
        }
      : undefined,
  };
}

function hotelRule(user, rentalType) {
  if (user?.role === "admin") return null;
  if (user?.role === "hotel" && rentalType !== "Hôtel") return { error: "Un compte hôtel publie des chambres d'hôtel", code: "HOTEL_ONLY" };
  if (user?.role !== "hotel" && rentalType === "Hôtel") return { error: "Réservé aux comptes hôtel", code: "HOTEL_ROLE_REQUIRED" };
  return null;
}

// Seuls les agents et vendeurs/propriétaires vérifiés par l'admin publient.
function postingBlock(user) {
  if (user.role === "admin") return null;
  if (!isPro(user)) return { status: 403, error: "Réservé aux agents et propriétaires", code: "ROLE_REQUIRED" };
  if (!isApprovedPro(user)) {
    return { status: 403, error: "Compte en attente de vérification par l'admin", code: "VERIFICATION_REQUIRED", verification: user.verification };
  }
  return null;
}

// ---- Liste filtrée ------------------------------------------
// Query: city, type, rental, beds, minPrice, maxPrice, q, sort, page, limit
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { city, type, rental, beds, minPrice, maxPrice, q, sort, page, limit, status, owner } = req.query;
    // Par défaut : uniquement les biens encore disponibles (?status=all pour tout voir).
    const where = status === "all" ? {} : { status: ["rented", "sold"].includes(status) ? status : "available" };
    if (city) where.city = city;
    if (type) where.type = type;
    if (rental) where.rentalType = rental;
    if (owner) {
      where.landlordId = owner;
      // Les biens à vendre d'un agent ne sont listés que pour lui-même ou l'admin.
      if (!(req.user && (req.user.role === "admin" || req.user.id === owner))) where.rentalType = rental === "Vente" ? "__none__" : rental || { not: "Vente" };
    }
    if (beds && Number(beds) > 0) where.beds = { gte: Number(beds) };
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { neighborhood: { contains: q, mode: "insensitive" } },
      ];
    }
    const orderBy =
      sort === "price-asc" ? { price: "asc" }
      : sort === "price-desc" ? { price: "desc" }
      : sort === "new" ? { createdAt: "desc" }
      : [{ featured: "desc" }, { createdAt: "desc" }];

    const take = Math.min(Number(limit) || 24, 100);
    const skip = ((Number(page) || 1) - 1) * take;
    const [total, items] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        orderBy,
        take,
        skip,
        include: INCLUDE,
      }),
    ]);
    res.json({ properties: items.map((p) => serialize(p, req.user)), total, page: Number(page) || 1, limit: take });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Liste des annonces impossible" });
  }
});

// ---- Détail --------------------------------------------------
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const p = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: INCLUDE,
    });
    if (!p) return res.status(404).json({ error: "Annonce introuvable" });
    res.json({ property: serialize(p, req.user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Détail impossible" });
  }
});

// ---- Création (abonnement requis) -----------------------------
router.post("/", requireAuth, async (req, res) => {
  const block = postingBlock(req.user);
  if (block) {
    const { status, ...body } = block;
    return res.status(status).json(body);
  }
  const parsed = propertySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
  }
  // Un compte hôtel publie des chambres d'hôtel ; seuls les hôtels (ou l'admin) publient en « Hôtel ».
  const rule = hotelRule(req.user, parsed.data.rentalType);
  if (rule) return res.status(400).json(rule);
  try {
    const p = await prisma.property.create({
      data: { ...parsed.data, ...(parsed.data.rentalType === "Hôtel" ? {} : { units: 1 }), landlordId: req.user.id },
      include: INCLUDE,
    });
    res.status(201).json({ property: serialize(p, req.user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Création impossible" });
  }
});

// ---- Mise à jour (propriétaire ou admin) -----------------------
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Annonce introuvable" });
    if (existing.landlordId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }
    const parsed = propertySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Données invalides" });
    if (parsed.data.rentalType) {
      const owner = existing.landlordId === req.user.id ? req.user : await prisma.user.findUnique({ where: { id: existing.landlordId } });
      const rule = hotelRule(owner, parsed.data.rentalType);
      if (rule) return res.status(400).json(rule);
    }
    const p = await prisma.property.update({
      where: { id: req.params.id },
      data: parsed.data,
      include: INCLUDE,
    });
    res.json({ property: serialize(p, req.user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Mise à jour impossible" });
  }
});

// ---- Statut : disponible / loué / vendu (propriétaire ou admin) ---
const statusSchema = z.object({
  status: z.enum(["available", "rented", "sold"]),
  dealPrice: z.number().int().positive().optional().nullable(),
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  const parsed = statusSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Statut invalide" });
  try {
    const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Annonce introuvable" });
    if (existing.landlordId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }
    const { status, dealPrice } = parsed.data;
    const closing = status !== "available";
    const p = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        status,
        dealPrice: closing ? dealPrice || existing.price : null,
        closedAt: closing ? new Date() : null,
      },
      include: INCLUDE,
    });
    res.json({ property: serialize(p, req.user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Changement de statut impossible" });
  }
});

// ---- Compteur de vues (le propriétaire ne se compte pas lui-même) ---
router.post("/:id/view", optionalAuth, async (req, res) => {
  try {
    const existing = await prisma.property.findUnique({ where: { id: req.params.id }, select: { landlordId: true, views: true } });
    if (!existing) return res.status(404).json({ error: "Annonce introuvable" });
    if (req.user?.id === existing.landlordId) return res.json({ views: existing.views });
    const p = await prisma.property.update({
      where: { id: req.params.id },
      data: { views: { increment: 1 } },
      select: { views: true },
    });
    res.json(p);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Vue non comptée" });
  }
});

// ---- Suppression (propriétaire ou admin) -----------------------
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Annonce introuvable" });
    if (existing.landlordId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }
    await prisma.property.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Suppression impossible" });
  }
});

// ---- Upload d'images (multipart → Cloudflare R2) ----------------
router.post("/:id/images", requireAuth, upload.array("images", 8), async (req, res) => {
  try {
    const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Annonce introuvable" });
    if (existing.landlordId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }
    if (!req.files?.length) return res.status(400).json({ error: "Aucune image reçue" });
    const urls = [];
    for (const f of req.files) {
      const ext = (f.mimetype.split("/")[1] || "jpg").split("+")[0];
      const r = await Storage.upload(f.buffer, { contentType: f.mimetype, ext });
      if (r.url) urls.push(r.url);
    }
    if (!urls.length) return res.status(500).json({ error: "Images non enregistrées" });
    const current = Array.isArray(existing.images) ? existing.images : [];
    const p = await prisma.property.update({
      where: { id: req.params.id },
      data: { images: [...current, ...urls].slice(0, 8) },
      include: INCLUDE,
    });
    res.json({ property: serialize(p, req.user), uploaded: urls });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upload impossible" });
  }
});

export default router;
