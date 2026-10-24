# MansaRent — Frontend

Guinea's digital property rental marketplace. **Trouvez. Louez. Emménagez.**

React + Vite + Tailwind CSS. The entire UI and app logic lives in `src/MansaRent.jsx`.

---

## 🚀 Démarrage rapide

```bash
npm install
npm run dev
```

Then open http://localhost:5173

Other commands:

```bash
npm run build      # build de production dans /dist
npm run preview    # prévisualiser le build
```

> The app runs **fully offline** out of the box using built-in demo data
> (`SEED_PROPERTIES` inside `MansaRent.jsx`). Connect your backend when ready
> (see "Brancher le backend" below).

---

## 📁 Structure du projet

```
mansarent-frontend/
├── index.html              # point d'entrée HTML
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example            # copier en .env et définir VITE_API_URL
└── src/
    ├── main.jsx            # monte le composant React
    ├── index.css          # directives Tailwind
    ├── MansaRent.jsx       # ⭐ toute l'application (UI + logique)
    └── services/
        └── api.js          # couche service prête à brancher sur l'API
```

---

## 🖼️ Avant la mise en ligne

1. **Remplacer les images.** Les photos viennent d'Unsplash (placeholders).
   Cherchez `images.unsplash.com` dans `MansaRent.jsx` et remplacez par vos
   propres images hébergées (S3 / Cloudinary). Les tableaux `POOL`,
   `CATEGORIES`, `CITY_CARDS` et `REVIEWS` en haut du fichier centralisent les URLs.
2. **Brancher le backend** (voir ci-dessous).
3. **Numéros de téléphone** : les annonces de démo utilisent des numéros fictifs
   (`LANDLORDS`, utilisés pour le bouton « Appeler »). Les vraies données viendront de l'API.

---

## 🔌 Brancher le backend

Tous les points de données sont isolés dans `src/MansaRent.jsx`, dans le
composant racine `MansaRent()`. Remplacez l'état en mémoire par des appels à
`src/services/api.js` :

| Aujourd'hui (en mémoire)        | À remplacer par                          |
| ------------------------------- | ---------------------------------------- |
| `useState(SEED_PROPERTIES)`     | `PropertyAPI.list(filters)` dans un `useEffect` |
| `addProperty(data)`             | `PropertyAPI.create(data)`               |
| `login(u)` / `logout()`         | `AuthAPI.login()` / `AuthAPI.register()` |
| `toggleFavorite(id)`            | `FavoriteAPI.toggle(id)`                 |

L'objet `filters` correspond **1:1** aux paramètres de requête (query params).

---

## 📑 Contrat d'API attendu

Définissez `VITE_API_URL` (par défaut `http://localhost:4000/api`).

### Objet `Property`

```jsonc
{
  "id": 1,
  "title": "Maison moderne 3 chambres",
  "type": "Maison",                       // Maison|Appartement|Chambre|Villa|Bureau|Boutique
  "rentalType": "Location longue durée",  // "Location longue durée" | "Court séjour"
  "price": 6200000,                        // entier, en GNF / mois
  "city": "Conakry",                       // Conakry|Kankan|Kindia|Nzérékoré|Labé|Mamou|Boké
  "neighborhood": "Kipé",
  "beds": 3,
  "baths": 2,
  "area": 180,                             // m²
  "featured": true,
  "tag": "En vedette",                     // libellé court optionnel
  "amenities": ["Climatisation", "Parking"],
  "images": ["https://.../1.jpg", "https://.../2.jpg"],
  "description": "…",
  "landlordInfo": { "name": "Mamadou B.", "phone": "+224 6XX XX XX XX" }
}
```

### Endpoints

| Méthode | Route                | Description                              | Corps / Query |
| ------- | -------------------- | ---------------------------------------- | ------------- |
| `GET`   | `/properties`        | Liste filtrée                            | query: `city, type, rental, beds, minPrice, maxPrice, q, sort` |
| `GET`   | `/properties/:id`    | Un bien                                  | —             |
| `POST`  | `/properties`        | Créer une annonce                        | objet `Property` (sans `id`) |
| `POST`  | `/auth/register`     | Inscription → `{ token, user }`          | `{ name, email, password }` |
| `POST`  | `/auth/login`        | Connexion → `{ token, user }`            | `{ email, password }` |
| `GET`   | `/auth/me`           | Utilisateur courant                      | header Bearer |
| `GET`   | `/favorites`         | IDs favoris de l'utilisateur             | header Bearer |
| `POST`  | `/favorites/:id`     | Basculer un favori                       | header Bearer |

**Valeurs `sort` :** `rel` (pertinence) · `price-asc` · `price-desc` · `new`.

---

## ☁️ Déploiement

- **Frontend** : Vercel ou Netlify (`npm run build`, dossier `dist`).
- **Backend + base de données** : Railway, Render ou Fly.io + PostgreSQL.
- **Images** : Cloudinary ou Amazon S3.

---

## ⚙️ Pile technique

- React 18 · Vite 5 · Tailwind CSS 3 · lucide-react (icônes)
- Polices : Bricolage Grotesque (titres) + Plus Jakarta Sans (corps), via Google Fonts
- Aucune dépendance de stockage navigateur (l'état vit en React, puis dans votre backend)

© 2026 MansaRent. Tous droits réservés.

---

## 🆕 Comptes, messagerie, abonnement & avis

Ces fonctionnalités tournent **côté client (état React, en mémoire)** et sont
prêtes à être branchées sur l'API. L'état se réinitialise au rechargement tant
qu'aucun backend n'est connecté.

### Comptes & messagerie intégrée (WhatsApp supprimé)
- Le contact propriétaire/agent passe désormais par une **messagerie interne**
  (`MessagesPage`), plus de liens WhatsApp.
- Le bouton **« Envoyer un message »** d'une annonce exige une **connexion** :
  s'il n'y a pas d'utilisateur, la modale d'authentification s'ouvre.
- État : `conversations` + actions `startConversation(property)`,
  `sendMessage(convId, text)`, `markConversationRead(convId)` dans le composant
  racine `MansaRent`. Une réponse simulée de l'agent arrive après ~1 s
  (à remplacer par du temps réel : WebSocket / Pusher / Firebase).

### Abonnement propriétaire : 1 mois offert, puis 50 000 GNF / mois
- À la création du compte : `trialEndsAt = maintenant + 30 jours`.
- `canPost(user)` = essai en cours **ou** abonnement actif. Sinon la page
  *Publier* affiche un **paywall** vers `SubscribePage`.
- Constantes : `SUBSCRIPTION_PRICE` (50 000), `TRIAL_DAYS` (30).
- Paiement : **Orange Money** et **carte Visa** (`PaymentForm`). Le paiement est
  simulé puis `subscribe(method)` fixe `subscribedUntil = maintenant + 30 jours`.
  Branchez ici votre PSP (Orange Money API, Stripe/Visa…).

### Notes & avis
- Étoiles + commentaires sur **chaque annonce** et sur le **profil agent**
  (`ReviewsBlock`, `AgentProfilePage`). Laisser un avis exige une connexion.
- État : `reviews` + action `addReview({ propertyId?, agentId?, rating, text })`.

### Endpoints suggérés pour le backend
```
POST /auth/register | /auth/login          → { user, trialEndsAt }
GET  /conversations                         → liste des fils
POST /conversations                         → démarrer (propertyId)
POST /conversations/:id/messages            → envoyer un message
GET  /agents/:id                            → profil + annonces + note
GET  /reviews?propertyId= | ?agentId=       → avis
POST /reviews                               → publier un avis
POST /subscriptions/checkout                → { method: 'orange'|'visa' }
GET  /me/subscription                       → { trialEndsAt, subscribedUntil }
```

### Connexion avec Google (« créer un compte avec Gmail »)
Le bouton **« Continuer avec Google »** de la modale de connexion utilise
*Google Identity Services*.
1. Sur https://console.cloud.google.com → **APIs & Services → Identifiants**,
   créez un **ID client OAuth 2.0** de type *Application Web*.
2. Ajoutez vos **origines JavaScript autorisées** (ex. `http://localhost:5173`
   en dev, puis votre domaine en prod).
3. Copiez le **Client ID** dans `.env` :
   ```
   VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   ```
Avec un Client ID, le vrai bouton Google s'affiche et renvoie un *ID token* JWT
(nom + e-mail). **En production, vérifiez ce token côté serveur** avant de créer
la session. Sans Client ID, le bouton fonctionne en **mode démo** (connexion
simulée) pour ne pas bloquer le développement.

#### Vérification du token Google côté serveur (production)
Le front envoie l'ID token à `POST /auth/google` (`AuthAPI.loginWithGoogle`).
Côté backend, vérifiez-le **toujours** avant de créer la session :

```js
// npm i google-auth-library
import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post("/auth/google", async (req, res) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.GOOGLE_CLIENT_ID, // même Client ID que le front
    });
    const { sub, email, name, picture } = ticket.getPayload();
    // upsert de l'utilisateur (sub = identifiant Google stable),
    // puis créez votre propre session / JWT applicatif :
    const user = await upsertUser({ googleId: sub, email, name, avatar: picture });
    res.json({ user, token: signAppJwt(user) });
  } catch {
    res.status(401).json({ error: "Token Google invalide" });
  }
});
```

Le même `GOOGLE_CLIENT_ID` sert au front (`VITE_GOOGLE_CLIENT_ID`) et au backend
(`audience`). Ne faites jamais confiance au token sans cette vérification.

---

## 💳 Paiements réels (CinetPay · Hub2 · Orange Money · MTN MoMo)

⚠️ **Les clés des fournisseurs ne doivent jamais être dans le frontend.** Un petit
backend (`server/`) les détient, appelle les fournisseurs et reçoit leurs webhooks.

### Démarrer le backend
```bash
cd server
cp .env.example .env      # renseignez vos clés (CinetPay, Hub2, Orange, MTN)
npm install && npm start  # http://localhost:4000
```
Puis côté frontend, dans `.env` :
```
VITE_API_URL=http://localhost:4000/api
VITE_PAYMENT_PROVIDER=cinetpay
```
Sans `VITE_API_URL`, le guichet reste en **mode démo** (paiement simulé).

### Fournisseurs
- **CinetPay** et **Hub2** sont des *agrégateurs* : une seule intégration donne
  Orange Money Guinée + MTN MoMo Guinée + Visa/Mastercard.
- **Orange Money** (Web Payment) et **MTN MoMo** (Collections) sont aussi câblés en direct.

Chaque fournisseur a son module dans `server/providers/`. Pour en changer par
défaut : `VITE_PAYMENT_PROVIDER`.

### Deux types de flux
- **Page hébergée (redirection)** — CinetPay, Orange Money : `checkout` renvoie une
  `redirectUrl`, le client y paie (OTP/carte), puis le **webhook** confirme.
- **Push sur le téléphone (polling)** — MTN MoMo, Hub2 : le client valide avec son
  code PIN ; le frontend interroge le statut jusqu'à confirmation.

### Règle d'or
Le statut d'un paiement vient **du webhook ou du polling du statut**, jamais du
retour navigateur. Le serveur n'active l'abonnement (`subscribedUntil = +30 j`)
qu'après confirmation du fournisseur.

### Abonnement mensuel ≠ prélèvement automatique
Le mobile money n'autorise pas de prélèvement récurrent silencieux. À chaque
échéance, relancez un paiement (push/USSD) : prévoyez un rappel de renouvellement
et un nouvel appel à `/api/subscriptions/checkout`.

### À faire avant la production
- Sandbox : Orange `OM_CURRENCY=OUV` / chemin `dev` ; MTN `MOMO_CURRENCY=EUR` /
  `MOMO_TARGET_ENV=sandbox`. En production : `GNF` + vos valeurs pays.
- Webhooks en HTTPS public (ngrok en dev) ; vérifiez les signatures (HMAC `x-token`
  CinetPay, `notif_token` Orange).
- Onboarding marchand (RCCM/NIF) requis chez chaque fournisseur.
- Remplacez le `Store` en mémoire (`server/store.js`) par votre base de données,
  et liez `userId` à votre session (le flux par redirection nécessite une session
  persistée pour conclure dans l'app).
