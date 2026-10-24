# MansaRent — Product Status

> Living progress note. Update on every milestone.
> Last updated: 2026-10-11
> Owner: aliyaweb — Repo: `https://github.com/aliyaweb/MansaRent`
> PRD source of truth: `PRD.md`

## 1. Snapshot

| Area | Status | Notes |
|------|--------|-------|
| Frontend (React 18 + Vite 5 + Tailwind 3, `src/MansaRent.jsx`) | ✅ Complete | Runs fully offline in demo mode with `SEED_PROPERTIES` |
| API service layer (`src/services/api.js`) | ✅ Ready | 1:1 with PRD query params, needs `VITE_API_URL` to go live |
| i18n (`src/i18n.js` + `src/locales/en.json`, `fr.json`) | ✅ Complete | French primary, English ready |
| Payment backend Express (`server/` — 4 providers) | ✅ Complete | `cinetpay`, `hub2`, `orange`, `mtnmomo` in `server/providers/` |
| Main backend API (`backend/` Express + Prisma + PostgreSQL) | ✅ Code complete, 🔲 Not deployed | Routes: auth, properties, agents, favorites, reviews, conversations, subscriptions, admin, webhooks |
| Database | 🔲 In-memory only | `server/store.js` active. Needs PostgreSQL (Neon/Supabase) + `npx prisma db push` + `npm run seed` |
| Real-time messaging | 🔲 Simulated | ~1s fake agent reply in React state. Needs WebSocket/Pusher/Firebase |
| Google OAuth | 🔲 Demo mode | Needs `VITE_GOOGLE_CLIENT_ID` (front) + `GOOGLE_CLIENT_ID` verify on backend (`POST /auth/google`) |
| Image upload | 🔲 Placeholder | Unsplash URLs in `MansaRent.jsx` (`POOL`, `CATEGORIES`, `CITY_CARDS`, `REVIEWS`). Needs Cloudinary/S3 or R2 |
| Production deploy | 🔲 Pending | `netlify.toml` ready (`npm run build` → `dist`), no `.netlify/` link confirmed |

## 2. Repo & Deploy Connections

- **GitHub:** connected — `origin = https://github.com/aliyaweb/MansaRent`, branch `main` tracks `origin/main`.
- **Netlify:** config ready, link unverified — `netlify.toml` present, no `.netlify/` folder, no CI workflow. To connect: Netlify Dashboard → Add site → Import from Git → select `aliyaweb/MansaRent` → build `npm run build`, publish `dist`.
- **Frontend env:** `.env.example` is all-optional (empty `VITE_API_URL` = demo mode).
- **Backend envs:** `backend/.env.example` (DATABASE_URL, ZeptoMail, R2, provider keys) and `server/.env.example` — both unfilled locally.

## 3. Done

- [x] Property browse / search / filter (city, type, rental, beds, price, q, sort: `rel|price-asc|price-desc|new`)
- [x] Property detail + gallery + amenities + landlord info + similar
- [x] Auth UI (email + Google button demo) + trial logic (`trialEndsAt = +30d`, `canPost()`)
- [x] Favorites (auth-gated, in-memory)
- [x] Internal messaging UI (`MessagesPage`, `startConversation`, `sendMessage`, `markConversationRead`)
- [x] Reviews on properties + agent profiles (auth-gated)
- [x] Subscription paywall (50,000 GNF/mo) + `PaymentForm` (Orange + Visa demo)
- [x] Agent profiles + city cards + featured tags
- [x] Backend routes + Prisma schema + seed (admin@mansarent.com / admin123)
- [x] Payment provider modules (redirect: CinetPay/Orange, push/poll: MTN/Hub2) + webhook handlers

## 4. In Progress / Next Up

1. **DB live:** create Neon/Supabase Postgres → set `backend/.env DATABASE_URL` → `npx prisma db push` → `npm run seed` → verify `GET /api/health`.
2. **Frontend → backend:** set root `.env: VITE_API_URL=http://localhost:4000/api` → replace `useState(SEED_PROPERTIES)`, `addProperty`, `login/logout`, `toggleFavorite` with `PropertyAPI/AuthAPI/FavoriteAPI`.
3. **Real images:** replace `images.unsplash.com` in `MansaRent.jsx`, wire Cloudflare R2 (`R2_*` vars) or Cloudinary.
4. **Google real login:** create OAuth Client ID, set `VITE_GOOGLE_CLIENT_ID` + backend verify with `google-auth-library`.
5. **Payments live:** fill `server/.env` or `backend/.env` provider keys, expose HTTPS webhooks (ngrok in dev), test checkout → webhook → `subscribedUntil=+30d`.
6. **Deploy frontend:** import repo in Netlify, confirm auto-deploy from `main`.
7. **Deploy backend:** Railway/Render/Fly + Postgres, set `APP_URL`, `PUBLIC_URL`, `SUBSCRIPTION_PRICE`.

## 5. Blockers & Risks

- No Postgres yet → data loss on restart (`server/store.js` memory).
- No HTTPS webhook URL yet → cannot validate CinetPay/Orange in prod.
- No merchant onboarding (RCCM/NIF) → provider keys still sandbox.
- No error tracking / analytics (add Sentry + GA/Plausible per PRD §16).

## 6. Changelog

| Date | Change | By |
|------|--------|----|
| 2026-10-11 | Created `product_status.md`, confirmed GitHub remote, Netlify config-only | OpenCode |
| 2026-10-11 | Restored `.env` (root), `backend/.env`, `server/.env` from examples; deps blocked — Node.js not installed | OpenCode |
| 2026-10-11 | Installed Node v24.20.0 + npm 11.19.0; `npm install` OK (root 137, backend 181, server 71 pkgs); frontend dev server started | OpenCode |
| 2026-10-11 | PWA app-shell per PRD+mockup (teal/gold kept): TopBar, BottomNav (5 tabs), Discover, Profile, Chat/Notifications toggle+badges, detail auto-slider+counter+stats, Favorites Properties/Agents tabs, install banner w/ dismiss; manifest+SW via vite-plugin-pwa, icons generated; build OK | OpenCode |
| 2026-10-11 | Android: Capacitor 7 (`com.mansarent.app`, minSdk 23, target 35), Mansa launcher icons/adaptive/splash/colors, Gradle release-signing via gitignored `keystore.properties`, reusable `build-apk.ps1`; JDK17+SDK downloads in progress, keystore+assembleRelease pending | OpenCode |
| 2026-10-11 | Shell fixes: TopBar overflow (compact logo), menu +Find an Agent, Profile MansaRent Pro card; agent self-registration (Discover dropdown → live registry + own agent page); sub card now lists all 5 paid benefits; Docker added (frontend+backend Dockerfiles, nginx SPA conf, compose stack w/ Postgres, .dockerignores) — Docker Desktop itself NOT installed (needs admin+WSL2) | OpenCode |
| 2026-10-11 | Admin control: AES-256-GCM `Integration` store (7 providers, secrets encrypted, DB>env live sync) + `SiteSetting` (announcement/hero/categories/contact) + admin image upload (R2) + public GET /api/settings; frontend AdminPage (admin role), announcement banner, hero/category overrides via API; fixed pre-existing broken User.reviews relation (schema now valid); Netlify DB (Neon) connect guide in backend/README | OpenCode |
| 2026-10-11 | APK DONE: `release/MansaRent-v1.0.apk` (3,313,547 B, SHA256 BC09C250…1B6A50), signed CN=MansaRent RSA-2048, com.mansarent.app v1.0/1, minSdk23→target35, MainActivity verified (apksigner+aapt). Needed JDK 21 (Cap 7.6 targets 21). On-device install test still pending | OpenCode |
| 2026-10-12 | Pushed to GitHub: commit 102ad04 (PWA shell, admin control, Docker, Android) → origin/main; token used once via redacted one-shot push, NOT stored anywhere | OpenCode |
| 2026-10-14 | Neon live: removed channel_binding (Prisma 5 incompatible) → seed OK (admin + 4 listings); backend stable on :4000 via npm start (--watch looped on node_modules); admin login verified (role=admin); frontend rebuilt with VITE_API_URL, preview back on :4173 | OpenCode |
| 2026-10-14 | Login fixed end-to-end: AuthModal + new profile-dropdown LoginForm hit real backend (role flows through, token stored, logout clears); footer visible on mobile with admin-only Administration link; profile avatar opens dropdown (info + links + sign out, or inline login) | OpenCode |
| 2026-10-14 | Footer admin link removed per request; AdminPage gained Users tab (search + assign tenant/landlord/agent/admin, self-change locked, verified 200 live); Online admin = yes once deployed with VITE_API_URL + Neon DATABASE_URL (both already live locally) | OpenCode |
| 2026-10-14 | Push fixed (cause: zero saved GitHub creds on PC) via fresh one-shot token: remote now 8b0684c, tree clean; token NOT stored, revoke it | OpenCode |
| — | _Add next entry here_ | — |

## 7. How to Update This File

- Move item from §4 → §3 when merged to `main` and verified (`npm run build` + `GET /api/health`).
- Update Snapshot table + add Changelog row with date.
- Keep PRD (§14 Roadmap) and this file in sync.
