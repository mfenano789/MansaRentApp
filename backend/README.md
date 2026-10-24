# MansaRent — Backend API

Express + Prisma + PostgreSQL. Authentification (Better Auth + JWT), e-mails ZeptoMail, images Cloudflare R2, paiements CinetPay / Hub2 / Orange Money / MTN MoMo.

## Démarrage rapide

```bash
cd backend
cp .env.example .env   # renseignez DATABASE_URL + vos clés
npm install
npx prisma db push     # crée les tables (ou: npm run prisma:migrate)
npm run seed           # crée l'admin + 4 annonces de démo
npm run dev            # http://localhost:4000
```

Vérifiez : `GET http://localhost:4000/api/health` → `{"ok":true}`.

## Compte admin (après le seed)

- E-mail : `admin@mansarent.com`
- Mot de passe : `admin123`
- ⚠️ Changez ce mot de passe en production !

## Voir et gérer les données

1. **Prisma Studio** (interface visuelle de la base) :
   ```bash
   npm run prisma:studio   # ouvre http://localhost:5555
   ```
2. **API admin** (réservée au rôle `admin`, header `Authorization: Bearer <token>`) :
   - `GET /api/admin/stats` — utilisateurs, annonces, revenus, messages, avis
   - `GET /api/admin/users` — liste des utilisateurs
   - `PUT /api/admin/users/:id/role` — changer un rôle `{ role }`
   - `DELETE /api/admin/users/:id`
   - `GET /api/admin/properties` — toutes les annonces
   - `PUT /api/admin/properties/:id/featured` — mettre en vedette `{ featured }`
   - `DELETE /api/admin/properties/:id`
   - `GET /api/admin/subscriptions` / `GET /api/admin/payments`

## Base de données (PostgreSQL gratuit)

- **Neon** : https://neon.tech → créez un projet → copiez la `DATABASE_URL`
- **Supabase** : https://supabase.com → nouveau projet → Settings → Database → Connection string
- Collez-la dans `backend/.env` : `DATABASE_URL=postgresql://...`

### Via Netlify DB (recommandé si le frontend est sur Netlify)

Netlify DB est un Postgres **Neon** géré depuis Netlify — une seule base pour
tout le projet :

1. Netlify Dashboard → votre site → **Storage** (ou l'onglet **Data**) →
   **Connect database** / **Create database** → nommez-la (ex. `mansarent-db`).
2. Une fois créée : **Settings / Connect** → copiez la **connection string**
   (prenez la version *pooled* `…-pooler…` pour l'API, la version *direct*
   pour les migrations si besoin).
3. Collez-la comme `DATABASE_URL` :
   - en local : `backend/.env` → `DATABASE_URL=postgresql://…`
   - en hébergement backend (Railway/Render/Fly) : même valeur dans les
     variables d'environnement du service.
   - Netlify n'a PAS besoin de cette variable (le frontend ne parle à la base
     qu'à travers votre API).
4. Appliquez le schéma puis seed :
   ```bash
   cd backend
   npx prisma db push   # crée les tables (Integration, SiteSetting incluses)
   npm run seed         # admin + annonces de démo
   ```
5. Vérifiez : `GET http://localhost:4000/api/health` → `{"ok":true}`,
   puis `GET /api/settings` → réglages par défaut.

## E-mails (ZeptoMail)

1. https://www.zoho.com/zeptomail → créez un compte → vérifiez votre domaine
2. Copiez la clé API (Mail Agent → API) dans `backend/.env` : `ZEPTOMAIL_API_KEY=...`
3. Sans clé, les e-mails sont simulés (log console) — l'app fonctionne quand même.

## Images (Cloudflare R2)

1. Cloudflare Dashboard → R2 → créez un bucket → API Tokens
2. Renseignez `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
3. Sans R2, l'upload répond `503` (mode démo) — le reste fonctionne.

## Brancher le frontend

Dans `MansaRent/.env` :
```
VITE_API_URL=http://localhost:4000/api
```

## Paiements

Même logique que `server/` : le statut vient du **webhook** ou du **polling**, jamais du navigateur.
- Checkout : `POST /api/subscriptions/checkout`
- Statut : `GET /api/subscriptions/payment/:ref/status`
- Webhooks : `POST /api/webhooks/{cinetpay,orange,mtnmomo,hub2}`
