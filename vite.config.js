import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import os from "node:os";
import fs from "node:fs";

// En local (npm run dev) : si aucun VITE_API_URL n'est défini, l'app appelle /api
// et Vite relaie vers le backend local (http://localhost:4000) — même origine, pas de CORS.
// Appli mobile (npm run build:mobile) : l'app est embarquée dans le téléphone,
// elle appelle donc le backend par une URL complète. Sans MOBILE_API_URL,
// on prend l'adresse de ce PC sur le Wi-Fi (le téléphone doit être sur le même réseau).
// Réglages de l'appli : fichier « mobile.env » (CLÉ=valeur), à côté de ce fichier.
function readMobileEnv() {
  const out = {};
  try {
    for (const line of fs.readFileSync(new URL("./mobile.env", import.meta.url), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* fichier absent : valeurs par défaut */ }
  return out;
}

function lanApiUrl() {
  // Carte Wi-Fi / Ethernet réelle d'abord (on écarte WSL, Hyper-V, VirtualBox, VPN…).
  const nets = Object.entries(os.networkInterfaces())
    .filter(([name]) => !/vethernet|virtual|vmware|vbox|wsl|docker|hyper-v|loopback|tailscale|zerotier/i.test(name))
    .flatMap(([, list]) => list || [])
    .filter((n) => n.family === "IPv4" && !n.internal);
  const pick = (re) => nets.find((n) => re.test(n.address));
  const priv = pick(/^192\.168\./) || pick(/^10\./) || pick(/^172\.(1[6-9]|2\d|3[01])\./) || nets[0];
  return `http://${priv ? priv.address : "10.0.2.2"}:4000/api`;
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const mobile = mode === "mobile";
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/?$/;
  if (mobile) {
    const menv = readMobileEnv();
    if (process.env.VITE_PUSH_ENABLED == null) process.env.VITE_PUSH_ENABLED = menv.VITE_PUSH_ENABLED || env.VITE_PUSH_ENABLED || "0";
    // « localhost » ou « /api » ne marchent pas depuis un téléphone : ignorés ici.
    const usable = (u) => (u && /^https?:\/\//.test(u) && !local.test(u) ? u : "");
    const api = usable(process.env.MOBILE_API_URL) || usable(menv.MOBILE_API_URL) || usable(env.MOBILE_API_URL) || usable(env.VITE_API_URL) || lanApiUrl();
    process.env.VITE_API_URL = api.replace(/\/$/, "");
    console.log(`\n  📱 Appli mobile → API : ${process.env.VITE_API_URL} · push : ${process.env.VITE_PUSH_ENABLED === "1" ? "oui" : "non"}\n`);
  } else if (command === "serve" && (!process.env.VITE_API_URL || local.test(process.env.VITE_API_URL))) process.env.VITE_API_URL = "/api";
  return {
  plugins: [
    react(),
    // Pas de service worker dans l'appli native : les fichiers sont déjà dans le téléphone.
    !mobile && VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "MansaRent — Trouvez. Louez. Emménagez.",
        short_name: "MansaRent",
        description:
          "Marketplace de location immobilière en Guinée : maisons, appartements, chambres, villas, bureaux et courts séjours.",
        lang: "fr",
        start_url: "/?source=pwa",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0b5a3a",
        background_color: "#f8f7f3",
        categories: ["real estate", "lifestyle", "travel"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "unsplash-images", expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-webfonts", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  base: "/",
  server: {
    proxy: { "/api": { target: "http://localhost:4000", changeOrigin: true } },
  },
};
});
