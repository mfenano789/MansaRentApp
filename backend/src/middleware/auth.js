// ============================================================
// MansaRent — Middleware d'authentification (JWT)
// ============================================================
import { verifyToken, extractToken } from "../lib/auth.js";
import { prisma } from "../lib/db.js";

function sanitize(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

/** Exige un JWT valide. Remplit req.user. */
export async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Authentification requise" });
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: "Utilisateur introuvable" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

/** Exige le rôle admin. À utiliser après requireAuth. */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Accès réservé à l'administrateur" });
  }
  next();
}

/** Expose req.user si un token valide est présent, sinon continue en anonyme. */
export async function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user) req.user = user;
  } catch {
    // token invalide → on reste anonyme
  }
  next();
}

export { sanitize };
