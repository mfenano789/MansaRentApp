// ============================================================
// MansaRent — Routes d'authentification
// Email/password (bcrypt + JWT) + Google OAuth (vérifié côté serveur)
// Les tables User/Account/Session sont compatibles Better Auth.
// ============================================================
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/db.js";
import { signToken } from "../lib/auth.js";
import { requireAuth, sanitize } from "../middleware/auth.js";
import { Mailer } from "../lib/email.js";
import upload from "../middleware/upload.js";
import { Storage } from "../lib/storage.js";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "");

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(160),
  password: z.string().min(6).max(128),
  role: z.enum(["tenant", "landlord", "agent"]).optional().default("tenant"),
});

// « email » accepte aussi le nom d'utilisateur (avec ou sans @).
const loginSchema = z.object({
  email: z.string().trim().min(3),
  password: z.string().min(1),
});

// ---- Inscription -------------------------------------------
router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });
  const { name, email, password, role } = parsed.data;
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Cet e-mail est déjà utilisé" });
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hash, role },
    });
    // E-mail de bienvenue (non bloquant)
    Mailer.welcome(email, name).catch((e) => console.warn("[mail]", e.message));
    const token = signToken(user);
    res.status(201).json({ user: sanitize(user), token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Inscription impossible" });
  }
});

// ---- Connexion ----------------------------------------------
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });
  const { email, password } = parsed.data;
  try {
    const id = email.replace(/^@/, "");
    const user = id.includes("@")
      ? await prisma.user.findFirst({ where: { email: { equals: id, mode: "insensitive" } } })
      : await prisma.user.findUnique({ where: { username: id.toLowerCase() } });
    if (!user?.password) return res.status(401).json({ error: "Identifiants invalides" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Identifiants invalides" });
    const token = signToken(user);
    res.json({ user: sanitize(user), token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Connexion impossible" });
  }
});

// ---- Google Sign-In (ID token vérifié côté serveur) ---------
router.post("/google", async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: "credential requis" });
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub, email, name, picture } = ticket.getPayload();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name || email.split("@")[0],
          email,
          googleId: sub,
          avatar: picture || null,
          emailVerified: true,
        },
      });
      Mailer.welcome(email, user.name).catch((e) => console.warn("[mail]", e.message));
    } else if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: sub } });
    }
    const token = signToken(user);
    res.json({ user: sanitize(user), token });
  } catch (e) {
    console.error(e);
    res.status(401).json({ error: "Token Google invalide" });
  }
});

// ---- Utilisateur courant ------------------------------------
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: sanitize(req.user) });
});

// ---- Modifier son profil : nom + nom d'utilisateur (tous les rôles) ------
// Le rôle (acheteur / agent / vendeur) ne change pas ici : seul l'admin le modifie.
const profileSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80).optional(),
  username: z.string().trim().toLowerCase()
    .regex(/^[a-z0-9._]{3,30}$/, "3 à 30 caractères : lettres, chiffres, point ou tiret bas")
    .optional().nullable(),
});

router.put("/me", requireAuth, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Données invalides" });
  }
  const { name, username } = parsed.data;
  try {
    if (username) {
      const taken = await prisma.user.findFirst({ where: { username, NOT: { id: req.user.id } }, select: { id: true } });
      if (taken) return res.status(409).json({ error: "Ce nom d'utilisateur est déjà pris", code: "USERNAME_TAKEN" });
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { ...(name ? { name } : {}), ...(username !== undefined ? { username: username || null } : {}) },
    });
    res.json({ user: sanitize(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Mise à jour impossible" });
  }
});

// ---- Photo de profil ----------------------------------------------------
router.post("/me/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucune image reçue" });
    const ext = (req.file.mimetype.split("/")[1] || "jpg").split("+")[0];
    const r = await Storage.upload(req.file.buffer, { contentType: req.file.mimetype, ext, prefix: "avatars" });
    if (!r.url) return res.status(500).json({ error: "Image non enregistrée" });
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { avatar: r.url } });
    res.json({ user: sanitize(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Envoi de la photo impossible" });
  }
});

router.delete("/me/avatar", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { avatar: null } });
    res.json({ user: sanitize(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Suppression impossible" });
  }
});

// ---- Choix du rôle après l'inscription ----------------------
// tenant = acheteur / locataire · agent · landlord = vendeur / propriétaire.
// Choisi une seule fois ; ensuite seul l'admin peut changer le rôle.
router.post("/role", requireAuth, async (req, res) => {
  const role = req.body?.role;
  if (!["tenant", "agent", "landlord"].includes(role)) {
    return res.status(400).json({ error: "Rôle invalide" });
  }
  if (req.user.role === "admin") return res.status(400).json({ error: "Le rôle admin ne change pas ici" });
  if (req.user.roleChosen) {
    return res.status(409).json({ error: "Rôle déjà choisi", code: "ROLE_ALREADY_CHOSEN", user: sanitize(req.user) });
  }
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { role, roleChosen: true, verification: "none" },
    });
    res.json({ user: sanitize(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Impossible d'enregistrer le rôle" });
  }
});

// ---- Mot de passe oublié -----------------------------------
// Lien signé (1 h) lié à l'empreinte du mot de passe actuel : il ne sert
// qu'une fois et survit aux redémarrages du serveur (pas d'état en mémoire).
const RESET_SECRET = () => process.env.JWT_SECRET || "mansarent-dev-secret";
const pwFingerprint = (user) => (user.password || "google").slice(-12);

router.post("/forgot-password", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "E-mail requis" });
  try {
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    // Réponse identique que l'utilisateur existe ou non (anti-énumération)
    if (user) {
      const token = jwt.sign({ sub: user.id, purpose: "reset", fp: pwFingerprint(user) }, RESET_SECRET(), { expiresIn: "1h" });
      const base = (process.env.APP_URL || "http://localhost:5173").split(",")[0].replace(/\/$/, "");
      const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
      Mailer.passwordReset(user.email, link, user.name).catch((e) => console.warn("[mail]", e.message));
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Demande impossible" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || String(password).length < 6) {
    return res.status(400).json({ error: "Token et mot de passe (6+ caractères) requis" });
  }
  try {
    const payload = jwt.verify(token, RESET_SECRET());
    if (payload.purpose !== "reset") throw new Error("bad purpose");
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || payload.fp !== pwFingerprint(user)) {
      return res.status(400).json({ error: "Lien expiré ou déjà utilisé", code: "RESET_INVALID" });
    }
    const hash = await bcrypt.hash(String(password), 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
    // E-mail de confirmation (alerte si ce n'était pas l'utilisateur)
    const appUrl = (process.env.APP_URL || "").split(",")[0];
    Mailer.passwordChanged(user.email, user.name, appUrl).catch((e) => console.warn("[mail]", e.message));
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "Lien expiré ou invalide", code: "RESET_INVALID" });
  }
});

export default router;
