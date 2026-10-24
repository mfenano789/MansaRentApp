# MansaRent — Product Requirements Document (PRD)

> **Version:** 1.0  
> **Date:** 2026  
> **Status:** MVP (Minimum Viable Product) — Frontend Complete, Backend Integration Ready  
> **Language:** French (Primary) — Guinean Market  
> **Currency:** GNF (Guinean Franc)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Goals & Objectives](#3-goals--objectives)
4. [Target Audience](#4-target-audience)
5. [User Roles](#5-user-roles)
6. [Features & Functionality](#6-features--functionality)
7. [User Flows](#7-user-flows)
8. [Technical Architecture](#8-technical-architecture)
9. [Data Models](#9-data-models)
10. [API Contract](#10-api-contract)
11. [Payment System](#11-payment-system)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Deployment](#13-deployment)
14. [Roadmap & Future Enhancements](#14-roadmap--future-enhancements)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Success Metrics](#16-success-metrics)

---

## 1. Executive Summary

**MansaRent** is Guinea's first digital property rental marketplace. It connects landlords, real estate agents, and tenants through a unified platform where users can browse, filter, and contact property owners for long-term rentals and short-stay accommodations.

**Tagline:** *Trouvez. Louez. Emménagez.* (Find. Rent. Move in.)

The platform currently supports six property types (Maison, Appartement, Chambre, Villa, Bureau, Boutique) across seven major Guinean cities, with integrated mobile money payments (Orange Money, MTN MoMo) and card payments (Visa/Mastercard) via multiple payment aggregators.

---

## 2. Product Overview

### 2.1 Problem Statement

The Guinean real estate rental market is largely informal:
- Tenants rely on word-of-mouth, physical signs, or social media to find properties
- Landlords struggle to reach qualified tenants
- No centralized platform exists for property discovery, comparison, and contact
- Payment processes are cash-based and lack transparency

### 2.2 Solution

MansaRent provides a **digital marketplace** that:
- Centralizes property listings with rich filtering (city, type, price, bedrooms, rental duration)
- Enables direct communication between tenants and landlords/agents via internal messaging
- Supports secure subscription-based listing for landlords via mobile money
- Builds trust through verified agent profiles and a review/rating system
- Offers Google Sign-In for frictionless authentication

### 2.3 Current State

| Component | Status |
|---|---|
| Frontend (React + Vite + Tailwind) | ✅ Complete |
| Demo/Seed Data | ✅ Complete |
| Payment Backend (Express) | ✅ Complete (4 providers) |
| Database | 🔲 In-memory only (needs PostgreSQL) |
| Real-time Messaging | 🔲 Simulated (needs WebSocket) |
| Google OAuth | 🔲 Demo mode (needs Client ID) |
| Production Deployment | 🔲 Pending |

---

## 3. Goals & Objectives

### 3.1 Business Goals

| Goal | Metric | Timeline |
|---|---|---|
| Launch MVP in Conakry | 500+ property listings | Q1 2026 |
| Expand to all 7 target cities | 2,000+ listings | Q2 2026 |
| Onboard 100+ verified agents | 100 agent accounts | Q2 2026 |
| Process first paid subscriptions | 50 paying landlords | Q3 2026 |
| Achieve product-market fit | 10,000 monthly active users | Q4 2026 |

### 3.2 User Goals

- **Tenants:** Find suitable housing quickly with transparent pricing and direct owner contact
- **Landlords/Agents:** List properties, reach more tenants, manage inquiries
- **All Users:** Trust the platform through reviews, verified profiles, and secure payments

---

## 4. Target Audience

### 4.1 Primary Users — Tenants

| Attribute | Detail |
|---|---|
| Age | 22–45 |
| Location | Urban Guinea (Conakry, Kankan, Kindia, Nzérékoré, Labé, Mamou, Boké) |
| Income | Middle class (500K–15M GNF/month) |
| Tech Savviness | Moderate (smartphone users, WhatsApp, Facebook) |
| Pain Point | Finding safe, affordable housing without middlemen |

### 4.2 Primary Users — Landlords & Agents

| Attribute | Detail |
|---|---|
| Age | 30–60 |
| Property Count | 1–50+ units |
| Tech Savviness | Low to moderate |
| Pain Point | Finding reliable tenants, avoiding vacancy periods |

### 4.3 Secondary Users

- **Short-stay visitors** (business travelers, diaspora) — Court séjour listings
- **Commercial renters** — Bureau and Boutique listings

---

## 5. User Roles

| Role | Description | Key Permissions |
|---|---|---|
| **Visitor** | Unauthenticated user | Browse listings, view details, search/filter |
| **Tenant** | Registered user looking for property | All visitor features + favorites, messaging, reviews, contact landlord |
| **Landlord** | Property owner | All tenant features + post listings (with subscription), manage listings |
| **Agent** | Real estate professional | All landlord features + agent profile, multiple listings, reviews |
| **Admin** | Platform administrator | Manage users, listings, subscriptions, disputes |

---

## 6. Features & Functionality

### 6.1 Property Listings

#### 6.1.1 Listing Display
- Grid and list view toggle
- Property cards showing: cover image, title, price (GNF), city, neighborhood, beds, baths, area (m²)
- Featured listings highlighted with badges ("En vedette", "Nouveau", "Premium")
- Tag system for quick categorization

#### 6.1.2 Property Types Supported
| Type | Description |
|---|---|
| Maison | Family houses |
| Appartement | Apartments |
| Chambre | Single rooms/studios |
| Villa | Luxury villas |
| Bureau | Office spaces |
| Boutique | Retail shops |

#### 6.1.3 Rental Duration
- **Location longue durée** — Long-term rental (monthly/yearly)
- **Court séjour** — Short-stay (daily/weekly, furnished)

#### 6.1.4 Property Details Page
- Image gallery (multiple photos)
- Full description
- Amenities list (Climatisation, Parking, Sécurité 24/7, Internet/Fibre, etc.)
- Location info (city, neighborhood)
- Landlord/agent contact info
- Reviews section
- Similar properties recommendations

### 6.2 Search & Filtering

| Filter | Type | Options |
|---|---|---|
| City | Dropdown | Conakry, Kankan, Kindia, Nzérékoré, Labé, Mamou, Boké |
| Property Type | Dropdown | Maison, Appartement, Chambre, Villa, Bureau, Boutique |
| Rental Type | Dropdown | Location longue durée, Court séjour |
| Bedrooms | Number | 0+ (any), 1, 2, 3, 4, 5+ |
| Min Price | Number | GNF value |
| Max Price | Number | GNF value |
| Search Query | Text | Matches title, description, neighborhood |
| Sort | Dropdown | Relevance, Price (Low→High), Price (High→Low), Newest |

### 6.3 User Accounts & Authentication

#### 6.3.1 Registration
- Email + password
- Google Sign-In (OAuth 2.0)
- Name, email, password fields
- 30-day free trial for new landlord accounts

#### 6.3.2 Login
- Email + password
- Google Sign-In
- Session persistence

#### 6.3.3 User Profile
- Name, email, avatar
- Subscription status (trial, active, expired)
- Listed properties (for landlords)
- Reviews received (for agents)

### 6.4 Favorites

- Heart icon on property cards to save/unsave
- Favorites page showing all saved properties
- Requires authentication
- Persists per user (backend integration ready)

### 6.5 Internal Messaging

- Direct messaging between tenants and landlords/agents
- "Envoyer un message" button on property detail pages
- Conversation list (inbox)
- Simulated agent auto-response (~1 second delay)
- Unread message indicators
- Requires authentication to send messages

> **Note:** Currently simulated client-side. Production requires WebSocket/Pusher/Firebase for real-time delivery.

### 6.6 Reviews & Ratings

- Star rating (1–5) + text comment
- Reviews on individual property listings
- Reviews on agent profiles
- Average rating display
- Requires authentication to submit
- Chronological display (newest first)

### 6.7 Landlord Subscription & Payments

#### 6.7.1 Subscription Model
| Plan | Price | Duration | Features |
|---|---|---|---|
| Free Trial | 0 GNF | 30 days | Post listings, receive messages |
| Pro (Monthly) | 50,000 GNF | 30 days | Post listings, receive messages, priority support |

#### 6.7.2 Payment Methods
| Method | Provider | Flow |
|---|---|---|
| Orange Money | Orange Web Payment | Redirect to Orange page |
| MTN MoMo | MTN Collections | Push to phone (OTP confirmation) |
| Visa/Mastercard | CinetPay / Hub2 | Card form (redirect) |

#### 6.7.3 Payment Flow
1. User clicks "Publier une annonce" without active subscription
2. Paywall page displays subscription options
3. User selects payment method
4. Payment initiated via backend API
5. For redirect methods: user completes payment on provider page
6. For push methods: user confirms with phone PIN
7. Webhook confirms payment → subscription activated
8. User can now post listings

#### 6.7.4 Payment Providers Supported
- **CinetPay** — Aggregator (Orange Money + MTN MoMo + Card)
- **Hub2** — Aggregator (Orange Money + MTN MoMo + Card)
- **Orange Money** — Direct integration
- **MTN MoMo** — Direct integration

### 6.8 Agent Profiles

- Dedicated profile page for real estate agents
- Agent bio, photo, role, city, years active
- List of agent's property listings
- Reviews and average rating
- Contact options (message, phone)

### 6.9 Admin Features (Planned)

- User management (suspend, delete)
- Listing moderation (approve, reject, feature)
- Subscription management
- Dispute resolution
- Platform analytics dashboard

---

## 7. User Flows

### 7.1 Tenant — Find a Property

```
Visitor → Homepage → Browse/Search → Filter Results → View Property Detail
    → (Optional) Login → Save to Favorites → Contact Landlord via Message
```

### 7.2 Landlord — List a Property

```
Visitor → Register/Login → 30-Day Trial Active → Click "Publier"
    → Fill Property Form → Submit → Listing Live

If Trial Expired → Paywall → Subscribe (50K GNF/month) → Payment → Listing Live
```

### 7.3 Agent — Build Reputation

```
Agent → Register → Complete Profile → List Properties
    → Receive Inquiries → Communicate via Messages
    → Deliver Service → Receive Reviews → Build Rating
```

### 7.4 Payment Flow (Subscription)

```
User → Subscribe Page → Select Method (Orange/Card)
    → Backend: POST /api/subscriptions/checkout
    → Provider: Redirect or Push
    → User Completes Payment
    → Webhook: POST /api/webhooks/{provider}
    → Backend: Activate Subscription
    → Frontend: Poll Status → Confirmed → Access Granted
```

---

## 8. Technical Architecture

### 8.1 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                    │
│  React 18 + Vite 5 + Tailwind CSS 3 + lucide-react      │
│  src/MansaRent.jsx (single-file application)             │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/HTTPS (REST)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js)                      │
│  Express 4 + CORS + dotenv                              │
│  server/index.js (payment API)                          │
│  server/store.js (in-memory → PostgreSQL)               │
│  server/providers/ (CinetPay, Hub2, Orange, MTN MoMo)  │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ CinetPay │ │  Orange  │ │ MTN MoMo │
    │  Hub2    │ │  Money   │ │          │
    └──────────┘ └──────────┘ └──────────┘
```

### 8.2 Frontend Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| Vite | 5.3 | Build tool & dev server |
| Tailwind CSS | 3.4 | Utility-first styling |
| lucide-react | 0.383 | Icon library |
| Google Fonts | — | Bricolage Grotesque (headings) + Plus Jakarta Sans (body) |

### 8.3 Backend Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4.19 | HTTP framework |
| CORS | 2.8 | Cross-origin support |
| dotenv | 16.4 | Environment variables |

### 8.4 Project Structure

```
MansaRent/
├── index.html              # HTML entry point
├── package.json            # Frontend dependencies
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
├── postcss.config.js       # PostCSS configuration
├── .env.example            # Environment variable template
├── .gitignore              # Git ignore rules
├── PRD.md                  # This document
├── src/
│   ├── main.jsx            # React entry point
│   ├── index.css           # Tailwind directives
│   ├── MansaRent.jsx       # ⭐ Main application (UI + logic)
│   └── services/
│       └── api.js          # API service layer (ready for backend)
└── server/
    ├── index.js            # Express payment API
    ├── package.json        # Backend dependencies
    ├── store.js            # In-memory data store
    ├── .env.example        # Backend env template
    └── providers/
        ├── cinetpay.js     # CinetPay integration
        ├── hub2.js         # Hub2 integration
        ├── orange.js       # Orange Money integration
        └── mtnmomo.js      # MTN MoMo integration
```

---

## 9. Data Models

### 9.1 Property

```jsonc
{
  "id": 1,
  "title": "Maison moderne 3 chambres",
  "type": "Maison",                       // Maison|Appartement|Chambre|Villa|Bureau|Boutique
  "rentalType": "Location longue durée",  // "Location longue durée" | "Court séjour"
  "price": 6200000,                        // integer, GNF/month
  "city": "Conakry",                       // Conakry|Kankan|Kindia|Nzérékoré|Labé|Mamou|Boké
  "neighborhood": "Kipé",
  "beds": 3,
  "baths": 2,
  "area": 180,                             // m²
  "featured": true,
  "tag": "En vedette",                     // optional short label
  "amenities": ["Climatisation", "Parking"],
  "images": ["https://.../1.jpg", "https://.../2.jpg"],
  "description": "…",
  "landlordInfo": {
    "name": "Mamadou B.",
    "phone": "+224 6XX XX XX XX"
  }
}
```

### 9.2 User

```jsonc
{
  "id": "usr_abc123",
  "name": "Mamadou Baldé",
  "email": "mamadou@example.com",
  "avatar": "https://...",
  "role": "landlord",                       // tenant | landlord | agent | admin
  "googleId": "...",                       // if Google Sign-In
  "trialEndsAt": 1735689600000,            // timestamp
  "subscribedUntil": 1738368000000,        // timestamp
  "createdAt": 1735600000000
}
```

### 9.3 Review

```jsonc
{
  "id": "rv1",
  "agentId": 0,
  "propertyId": 1,                         // null if agent-level review
  "author": "Sékou T.",
  "rating": 5,                             // 1-5
  "text": "Très professionnel…",
  "ts": 1735600000000
}
```

### 9.4 Conversation

```jsonc
{
  "id": "conv_123",
  "propertyId": 1,
  "tenantId": "usr_abc",
  "landlordId": "usr_def",
  "messages": [
    {
      "id": "msg_1",
      "senderId": "usr_abc",
      "text": "Bonjour, la maison est-elle disponible ?",
      "ts": 1735600000000,
      "read": true
    }
  ],
  "createdAt": 1735600000000
}
```

### 9.5 Subscription

```jsonc
{
  "userId": "usr_abc123",
  "plan": "Pro",
  "method": "orange",                      // orange | momo | card
  "subscribedUntil": 1738368000000
}
```

### 9.6 Payment

```jsonc
{
  "reference": "MR-uuid-123",
  "userId": "usr_abc123",
  "provider": "cinetpay",                  // cinetpay | hub2 | orange | mtnmomo
  "providerRef": "provider-transaction-id",
  "status": "pending",                     // pending | success | failed
  "amount": 50000,
  "notifToken": "..."
}
```

---

## 10. API Contract

### Base URL
```
VITE_API_URL (default: http://localhost:4000/api)
```

### Endpoints

| Method | Route | Description | Auth | Body / Query |
|---|---|---|---|---|
| `GET` | `/properties` | List filtered properties | No | Query: `city, type, rental, beds, minPrice, maxPrice, q, sort` |
| `GET` | `/properties/:id` | Get single property | No | — |
| `POST` | `/properties` | Create new listing | Yes | Property object (without `id`) |
| `POST` | `/auth/register` | Register new user | No | `{ name, email, password }` |
| `POST` | `/auth/login` | Login | No | `{ email, password }` |
| `POST` | `/auth/google` | Google Sign-In | No | `{ credential }` (Google JWT) |
| `GET` | `/auth/me` | Current user profile | Yes | — |
| `GET` | `/favorites` | User's favorite properties | Yes | — |
| `POST` | `/favorites/:id` | Toggle favorite | Yes | — |
| `GET` | `/conversations` | List user's conversations | Yes | — |
| `POST` | `/conversations` | Start conversation | Yes | `{ propertyId }` |
| `POST` | `/conversations/:id/messages` | Send message | Yes | `{ text }` |
| `GET` | `/agents/:id` | Agent profile + listings | No | — |
| `GET` | `/reviews` | Get reviews | No | Query: `propertyId` or `agentId` |
| `POST` | `/reviews` | Submit review | Yes | `{ propertyId?, agentId?, rating, text }` |
| `POST` | `/subscriptions/checkout` | Initiate payment | Yes | `{ userId, provider, method, phone, otp, customer }` |
| `GET` | `/subscriptions/payment/:ref/status` | Poll payment status | Yes | — |
| `GET` | `/subscriptions/:userId` | Get subscription status | Yes | — |
| `POST` | `/webhooks/cinetpay` | CinetPay webhook | No | Provider-specific |
| `POST` | `/webhooks/orange` | Orange Money webhook | No | Provider-specific |
| `POST` | `/webhooks/mtnmomo` | MTN MoMo webhook | No | Provider-specific |
| `POST` | `/webhooks/hub2` | Hub2 webhook | No | Provider-specific |
| `GET` | `/api/health` | Health check | No | — |

### Sort Values
| Value | Description |
|---|---|
| `rel` | Relevance (default) |
| `price-asc` | Price: Low to High |
| `price-desc` | Price: High to Low |
| `new` | Newest first |

---

## 11. Payment System

### 11.1 Architecture

```
Frontend → POST /api/subscriptions/checkout
    → Backend creates payment record (status: pending)
    → Backend calls provider.initiate()
    → Returns redirectUrl (redirect flow) or phone push (poll flow)

Redirect Flow (CinetPay, Orange):
    → Browser redirects to provider payment page
    → User completes payment
    → Provider calls webhook → Backend activates subscription
    → User redirected back to app

Push/Polling Flow (MTN MoMo, Hub2):
    → Provider sends push notification to user's phone
    → User confirms with PIN
    → Frontend polls GET /subscriptions/payment/:ref/status
    → Backend checks provider status → activates on success
```

### 11.2 Security Rules

| Rule | Implementation |
|---|---|
| Provider keys never in frontend | Keys stored only in `server/.env` |
| Payment status from webhook only | Never trust browser return URL |
| Webhook signature verification | HMAC `x-token` (CinetPay), `notif_token` (Orange) |
| HTTPS for webhooks | Required in production (ngrok for dev) |
| Google token verification | Backend verifies JWT with `google-auth-library` |

### 11.3 Subscription Renewal

- Mobile money does NOT support automatic recurring charges
- At each 30-day expiry, user must manually renew
- System should send renewal reminders (push notification / SMS)
- New checkout call required for each renewal period

---

## 12. Non-Functional Requirements

### 12.1 Performance

| Metric | Target |
|---|---|
| Page load time | < 3 seconds (4G connection) |
| Time to First Byte | < 500ms |
| API response time | < 200ms (p95) |
| Image loading | Lazy loading, WebP format |
| Lighthouse score | > 80 |

### 12.2 Compatibility

| Platform | Minimum Version |
|---|---|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Mobile browsers | iOS 14+, Android 10+ |
| Screen sizes | 320px – 2560px (responsive) |

### 12.3 Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatible (ARIA labels)
- Color contrast ratio ≥ 4.5:1

### 12.4 Security

- HTTPS everywhere (production)
- Input validation on all forms
- XSS prevention (React default escaping)
- CSRF protection for state-changing operations
- Rate limiting on auth endpoints
- Secure token storage (httpOnly cookies recommended)

### 12.5 Localization

- Primary language: French (fr-FR)
- Currency: GNF (Guinean Franc)
- Number formatting: French convention (spaces for thousands, comma for decimals)
- Date formatting: DD/MM/YYYY

---

## 13. Deployment

### 13.1 Frontend

| Platform | Command | Output |
|---|---|---|
| Vercel | `npm run build` | `dist/` folder |
| Netlify | `npm run build` | `dist/` folder |

### 13.2 Backend

| Platform | Database | Notes |
|---|---|---|
| Railway | PostgreSQL | Recommended |
| Render | PostgreSQL | Alternative |
| Fly.io | PostgreSQL | Alternative |

### 13.3 Image Storage

| Service | Purpose |
|---|---|
| Cloudinary | Property images (recommended) |
| Amazon S3 | Alternative |

### 13.4 Environment Variables

#### Frontend (`.env`)
```
VITE_API_URL=http://localhost:4000/api
VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
VITE_PAYMENT_PROVIDER=cinetpay
```

#### Backend (`server/.env`)
```
PORT=4000
APP_URL=http://localhost:5173
PUBLIC_URL=https://your-ngrok-url.ngrok.io
SUBSCRIPTION_PRICE=50000

# CinetPay
CINETPAY_API_KEY=xxx
CINETPAY_SITE_ID=xxx

# Orange Money
OM_API_KEY=xxx
OM_API_SECRET=xxx
OM_CURRENCY=GNF

# MTN MoMo
MOMO_API_KEY=xxx
MOMO_API_USER=xxx
MOMO_CURRENCY=GNF
MOMO_TARGET_ENV=sandbox

# Hub2
HUB2_API_KEY=xxx
HUB2_API_SECRET=xxx
```

---

## 14. Roadmap & Future Enhancements

### Phase 1 — MVP (Current)
- [x] Property browsing and search
- [x] User authentication (email + Google)
- [x] Favorites system
- [x] Internal messaging (simulated)
- [x] Reviews and ratings
- [x] Subscription payments (4 providers)
- [x] Agent profiles

### Phase 2 — Backend Integration
- [ ] PostgreSQL database
- [ ] Real-time messaging (WebSocket/Pusher)
- [ ] Email notifications
- [ ] Image upload (Cloudinary/S3)
- [ ] Admin dashboard
- [ ] Listing moderation workflow

### Phase 3 — Growth
- [ ] Mobile app (React Native)
- [ ] SMS notifications (Twilio/AfricasTalking)
- [ ] Map integration (Google Maps / Mapbox)
- [ ] Virtual tour support (360° images)
- [ ] Multi-language support (English, local languages)
- [ ] Advanced analytics for landlords
- [ ] Tenant background verification

### Phase 4 — Scale
- [ ] AI-powered property recommendations
- [ ] Automated pricing suggestions
- [ ] Lease agreement generation (e-signature)
- [ ] Insurance integration
- [ ] Mortgage/financing partnerships
- [ ] Expansion to other West African countries

---

## 15. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Low internet connectivity in target areas | High | High | Optimize images, lazy loading, offline-first PWA |
| Low digital literacy among landlords | High | Medium | Onboarding tutorials, WhatsApp support, agent-assisted listing |
| Payment fraud | High | Medium | Webhook verification, manual review for large amounts |
| Regulatory changes (RCCM/NIF requirements) | Medium | Medium | Legal consultation, compliance-first approach |
| Competition from classifieds platforms (Jumia, etc.) | Medium | Medium | Focus on trust, verified agents, specialized UX |
| Provider API downtime | High | Low | Multi-provider fallback, graceful degradation |
| Data loss (in-memory store) | High | High | Migrate to PostgreSQL before production |

---

## 16. Success Metrics

### 16.1 Key Performance Indicators (KPIs)

| KPI | Target (6 months) | Measurement |
|---|---|---|
| Monthly Active Users (MAU) | 10,000 | Analytics |
| Property Listings | 2,000 | Database count |
| Registered Landlords | 500 | User accounts |
| Paid Subscriptions | 100 | Payment records |
| Messages Sent | 5,000/month | Messaging system |
| Average Session Duration | > 4 minutes | Analytics |
| Conversion Rate (visitor → contact) | > 5% | Funnel analysis |
| Net Promoter Score (NPS) | > 40 | User surveys |

### 16.2 Tracking

- **Frontend:** Google Analytics / Plausible
- **Backend:** Custom logging + monitoring (Sentry for errors)
- **Payments:** Provider dashboards + internal records

---

## Appendix A: Supported Cities

| City | Region |
|---|---|
| Conakry | Capital |
| Kankan | Eastern Guinea |
| Kindia | Western Guinea |
| Nzérékoré | Forest Guinea |
| Labé | Middle Guinea |
| Mamou | Middle Guinea |
| Boké | Coastal Guinea |

## Appendix B: Supported Amenities

- Climatisation
- Eau courante
- Groupe électrogène
- Parking
- Sécurité 24/7
- Internet / Fibre
- Cuisine équipée
- Balcon
- Jardin
- Meublé
- Piscine
- Ascenseur

---

*Document prepared for MansaRent — Guinea's digital property rental marketplace.*  
*© 2026 MansaRent. All rights reserved.*
