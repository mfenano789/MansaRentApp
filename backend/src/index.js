// ============================================================
// MansaRent — API backend (Express + Prisma + PostgreSQL)
// Démarrage : cp .env.example .env → renseignez vos clés
//   → npm install → npx prisma db push → npm run seed → npm run dev
// ============================================================
import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import propertyRoutes from "./routes/properties.js";
import favoriteRoutes from "./routes/favorites.js";
import conversationRoutes from "./routes/conversations.js";
import reviewRoutes from "./routes/reviews.js";
import agentRoutes from "./routes/agents.js";
import adminRoutes from "./routes/admin.js";
import settingsRoutes from "./routes/settings.js";
import proRoutes from "./routes/pro.js";
import deviceRoutes from "./routes/devices.js";
import { syncIntegrationsToEnv } from "./lib/integrations.js";
import { UPLOADS_DIR } from "./lib/storage.js";

const app = express();
// Origines autorisées : le site (APP_URL) + l'appli mobile Capacitor
// (Android : https://localhost · iPhone : capacitor://localhost).
const APP_ORIGINS = ["https://localhost", "http://localhost", "capacitor://localhost", "ionic://localhost"];
const webOrigins = (process.env.APP_URL || "").split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
app.use(cors({ origin: webOrigins.length ? [...webOrigins, ...APP_ORIGINS] : true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ---- Santé -------------------------------------------------
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "mansarent-backend" }));

// ---- Images enregistrées localement (quand R2 n'est pas configuré) ----
app.use("/api/uploads", express.static(UPLOADS_DIR, { maxAge: "7d", fallthrough: false }));

// ---- Routes ------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/devices", deviceRoutes); // jetons push de l'appli mobile
app.use("/api/pro", proRoutes); // espace agent / vendeur-propriétaire
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes); // public : ajustements frontend pilotés par l'admin

// ---- 404 ---------------------------------------------------
app.use("/api", (_req, res) => res.status(404).json({ error: "Route introuvable" }));

// ---- Erreurs ------------------------------------------------
 // eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur interne" });
});

// Une erreur oubliée (e-mail, base momentanément indisponible…) ne doit jamais arrêter l'API.
process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e?.message || e));
process.on("uncaughtException", (e) => console.error("[uncaughtException]", e?.message || e));

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`MansaRent backend → http://localhost:${PORT}`);
  // Les clés saisies dans l'admin (chiffrées en base) prennent le pas sur le .env.
  syncIntegrationsToEnv().catch((e) => console.warn("[integrations] sync au démarrage :", e.message));
});
