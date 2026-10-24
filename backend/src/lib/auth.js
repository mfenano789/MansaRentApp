import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";

// ============================================================
// Better Auth — configuration avec adaptateur Prisma
// ============================================================

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 jours
    updateAge: 60 * 60 * 24, // 1 jour
  },
});

// ============================================================
// JWT — génération et vérification de tokens
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET || "mansarent-dev-secret";
const JWT_EXPIRES_IN = "30d";

/**
 * Signe un JWT pour un utilisateur
 * @param {object} user - utilisateur Prisma
 * @returns {string} token JWT
 */
export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Vérifie un JWT et retourne le payload
 * @param {string} token
 * @returns {object} payload décodé
 * @throws {Error} si le token est invalide ou expiré
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Extrait le token Bearer de l'en-tête Authorization
 * @param {object} req - requête Express
 * @returns {string|null}
 */
export function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}
