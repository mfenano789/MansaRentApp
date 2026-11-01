import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { useTranslation } from "react-i18next";
import {
  Menu, X, Search, MapPin, Home, Building2, Bed, Bath, Briefcase, Store,
  DoorOpen, Hotel, ShieldCheck, Users, Wallet, BarChart3,
  Star, Facebook, Instagram, ArrowRight, ArrowLeft, Sparkles, Check,
  TrendingUp, Eye, Heart, Phone, ChevronRight, ChevronDown, SlidersHorizontal,
  ImagePlus, Maximize2, User, LogOut, Plus, Mail, Lock, Square,
  MessageSquare, Send, CreditCard, Smartphone, Clock, Crown, BadgeCheck, CalendarCheck,
  Bell, Compass, CircleUserRound, Download, History, Settings, LifeBuoy, Activity,
  Trophy, LayoutDashboard, Pencil
} from "lucide-react";
import { SettingsAPI, AdminAPI, AuthAPI, PropertyAPI, FavoriteAPI, ReviewAPI, ConversationAPI, DeviceAPI, Session } from "./services/api.js";
import { SaleContactCard, BookingWidget, ShortStayInfo, ShortStayFields, BookingsPage, AdminLeads, PriceSuffix, PaymentReturnPage, AdminPayments } from "./deals.jsx";
import { APP_MODE, PUSH_READY, setBackHandler, setPushHandlers, registerPush, success as hapticSuccess } from "./native.js";
import { RolePickerModal, ProOnboardingPage, DashboardPage, RankingPage, ProPublicProfile, AdminVerifications, AdminListings, StatusBadge, PhotoPicker, ResetPasswordPage, PeopleList, EditProfilePage } from "./pro.jsx";

const VILLES_KEYS = ["Conakry", "Kankan", "Kindia", "Nzérékoré", "Labé", "Mamou", "Boké"];
const TYPES_KEYS = ["Maison", "Appartement", "Chambre", "Villa", "Bureau", "Boutique"];
const LOCATIONS_KEYS = ["longStay", "shortStay", "sale", "hotel"];
const HAS_API = !!import.meta.env.VITE_API_URL;

const POOL = {
  Maison: ["photo-1568605114967-8130f3a36994", "photo-1564013799919-ab600027ffc6", "photo-1605276374104-dee2a0ed3cd6", "photo-1583608205776-bfd35f0d9f83"],
  Appartement: ["photo-1502672260266-1c1ef2d93688", "photo-1522708323590-d24dbb6b0267", "photo-1493809842364-78817add7ffb", "photo-1560448204-e02f11c3d0e2"],
  Villa: ["photo-1613490493576-7fde63acd811", "photo-1512917774080-9991f1c4c750", "photo-1600596542815-ffad4c1539a9", "photo-1564013799919-ab600027ffc6"],
  Chambre: ["photo-1505691938895-1758d7feb511", "photo-1522771739844-6a9f6d5f14af", "photo-1598928506311-c55ded91a20c"],
  Bureau: ["photo-1497366754035-f200968a6e72", "photo-1497366811353-6870744d04b2", "photo-1524758631624-e2822e304c36"],
  Boutique: ["photo-1604719312566-8912e9227c6a", "photo-1441986300917-64674bd600d8", "photo-1555529669-e69e7aa0ba9a"],
};
const url = (id, w = 800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
const imgs = (type, w = 800) => POOL[type].map((id) => url(id, w));

const LANDLORDS = [
  { name: "Mamadou Baldé", phone: "+224 620 11 22 33", roleKey: "landlordRoles.Propriétaire", cityKey: "cities.Conakry", since: 2021, bioKey: "landlordBios.bio1" },
  { name: "Aïssatou Diallo", phone: "+224 622 44 55 66", roleKey: "landlordRoles.Agente immobilière", cityKey: "cities.Conakry", since: 2020, bioKey: "landlordBios.bio2" },
  { name: "Ibrahima Sow", phone: "+224 628 77 88 99", roleKey: "landlordRoles.Propriétaire", cityKey: "cities.Conakry", since: 2022, bioKey: "landlordBios.bio3" },
  { name: "Fatoumata Camara", phone: "+224 621 00 11 22", roleKey: "landlordRoles.Agente immobilière", cityKey: "cities.Kindia", since: 2019, bioKey: "landlordBios.bio4" },
];
const AMEN_KEYS = ["Climatisation", "Eau courante", "Groupe électrogène", "Parking", "Sécurité 24/7", "Internet / Fibre", "Cuisine équipée", "Balcon", "Jardin", "Meublé", "Piscine", "Ascenseur"];

const SEED_PROPERTIES = [
  { id: 1, titleKey: "seedProperties.p1.title", type: "Maison", rentalTypeKey: "rentalTypes.longStay", price: 6200000, cityKey: "cities.Conakry", neighborhood: "Kipé", beds: 3, baths: 2, area: 180, featured: true, tagKey: "tags.featured", amenities: [0,1,2,3,4,6], landlord: 0 },
  { id: 2, titleKey: "seedProperties.p2.title", type: "Appartement", rentalTypeKey: "rentalTypes.longStay", price: 3400000, cityKey: "cities.Conakry", neighborhood: "Kaloum", beds: 2, baths: 1, area: 95, featured: true, tagKey: "tags.new", amenities: [0,1,5,7,11], landlord: 1 },
  { id: 3, titleKey: "seedProperties.p3.title", type: "Villa", rentalTypeKey: "rentalTypes.longStay", price: 12000000, cityKey: "cities.Conakry", neighborhood: "Camayenne", beds: 5, baths: 4, area: 420, featured: true, tagKey: "tags.premium", amenities: [0,1,2,3,4,8,10], landlord: 2 },
  { id: 4, titleKey: "seedProperties.p4.title", type: "Chambre", rentalTypeKey: "rentalTypes.shortStay", price: 1100000, cityKey: "cities.Conakry", neighborhood: "Ratoma", beds: 1, baths: 1, area: 35, featured: false, tagKey: "tags.shortStay", amenities: [0,1,5,9], landlord: 3 },
  { id: 5, titleKey: "seedProperties.p5.title", type: "Bureau", rentalTypeKey: "rentalTypes.longStay", price: 5000000, cityKey: "cities.Conakry", neighborhood: "Kaloum", beds: 0, baths: 2, area: 140, featured: false, tagKey: "tags.commercial", amenities: [0,1,2,4,5,11], landlord: 0 },
  { id: 6, titleKey: "seedProperties.p6.title", type: "Maison", rentalTypeKey: "rentalTypes.longStay", price: 7800000, cityKey: "cities.Kankan", neighborhood: "Centre", beds: 4, baths: 3, area: 260, featured: true, tagKey: "tags.featured", amenities: [1,2,3,8,6], landlord: 1 },
  { id: 7, titleKey: "seedProperties.p7.title", type: "Appartement", rentalTypeKey: "rentalTypes.shortStay", price: 2200000, cityKey: "cities.Conakry", neighborhood: "Dixinn", beds: 2, baths: 1, area: 80, featured: true, tagKey: "tags.furnished", amenities: [0,1,5,9,6,7], landlord: 3 },
  { id: 8, titleKey: "seedProperties.p8.title", type: "Villa", rentalTypeKey: "rentalTypes.longStay", price: 15000000, cityKey: "cities.Conakry", neighborhood: "Kipé", beds: 6, baths: 5, area: 500, featured: true, tagKey: "tags.premium", amenities: [0,1,2,3,4,8,10,11], landlord: 2 },
  { id: 9, titleKey: "seedProperties.p9.title", type: "Chambre", rentalTypeKey: "rentalTypes.longStay", price: 600000, cityKey: "cities.Kindia", neighborhood: "Centre", beds: 1, baths: 1, area: 20, featured: false, tagKey: "tags.economical", amenities: [1,5], landlord: 0 },
  { id: 10, titleKey: "seedProperties.p10.title", type: "Boutique", rentalTypeKey: "rentalTypes.longStay", price: 4500000, cityKey: "cities.Conakry", neighborhood: "Madina", beds: 0, baths: 1, area: 60, featured: false, tagKey: "tags.commercial", amenities: [1,2,4], landlord: 1 },
  { id: 11, titleKey: "seedProperties.p11.title", type: "Appartement", rentalTypeKey: "rentalTypes.shortStay", price: 3800000, cityKey: "cities.Conakry", neighborhood: "Corniche", beds: 3, baths: 2, area: 120, featured: false, tagKey: "tags.shortStay", amenities: [0,1,5,7,9,11], landlord: 3 },
  { id: 12, titleKey: "seedProperties.p12.title", type: "Maison", rentalTypeKey: "rentalTypes.longStay", price: 2900000, cityKey: "cities.Labé", neighborhood: "Centre", beds: 3, baths: 2, area: 150, featured: false, tagKey: "tags.new", amenities: [1,2,3,8], landlord: 2 },
];

const SEED_REVIEWS = [
  { id: "rv1", agentId: 0, propertyId: null, author: "Sékou T.", rating: 5, textKey: "seedReviews.rv1", ts: Date.now() - 6 * 86400000 },
  { id: "rv2", agentId: 0, propertyId: 1, author: "Mariama B.", rating: 4, textKey: "seedReviews.rv2", ts: Date.now() - 3 * 86400000 },
  { id: "rv3", agentId: 1, propertyId: null, author: "Ousmane D.", rating: 5, textKey: "seedReviews.rv3", ts: Date.now() - 10 * 86400000 },
  { id: "rv4", agentId: 2, propertyId: null, author: "Kadiatou S.", rating: 4, textKey: "seedReviews.rv4", ts: Date.now() - 14 * 86400000 },
  { id: "rv5", agentId: 3, propertyId: null, author: "Alpha C.", rating: 5, textKey: "seedReviews.rv5", ts: Date.now() - 20 * 86400000 },
];

const formatGNF = (n) => {
  // Milliards (ventes) : « 2,5 Md GNF »
  if (n >= 1_000_000_000) {
    const s = (Math.round((n / 1_000_000_000) * 100) / 100).toString().replace(".", ",");
    return `${s} Md GNF`;
  }
  if (n >= 1_000_000) {
    const s = (Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",");
    return `${s}M GNF`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)}k GNF`;
  return `${n} GNF`;
};
// Montant exact (totaux de réservation, prix final) : « 1 350 000 GNF »
const formatGNFFull = (n) => `${new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)).replace(/\u202f|\u00a0/g, " ")} GNF`;
const landlordOf = (p) => p.landlordInfo || LANDLORDS[p.landlord ?? 0] || LANDLORDS[0];
// Seed agents use i18n keys (roleKey/cityKey/bioKey); registered agents use plain strings.
const dispRole = (a, t) => (a.roleKey ? t(a.roleKey) : a.role || "");
const dispCity = (a, t) => (a.cityKey ? t(a.cityKey) : a.city || "");
const dispBio = (a, t) => (a.bioKey ? t(a.bioKey) : a.bio || "");
const galleryOf = (p) => (p.images && p.images.length ? p.images : imgs(p.type, 1000));
const coverOf = (p) => (p.images && p.images.length ? p.images[0] : url(POOL[p.type][0], 800));

const DAY = 86400000;
const fmtDate = (ts) => new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const agentOf = (p) => (p.ownerId != null ? p.ownerId : typeof p.landlord === "number" ? p.landlord : null);
const isSaleP = (p) => p.rentalTypeKey === "rentalTypes.sale";
const isHotelP = (p) => p.rentalTypeKey === "rentalTypes.hotel";
// Réservable à la nuit avec dates : court séjour ou chambre d'hôtel.
const isShortP = (p) => p.rentalTypeKey === "rentalTypes.shortStay" || isHotelP(p);
const cityOf = (p) => (p.cityKey || "").replace(/^cities\./, "");
const rentalOf = (p) => (p.rentalTypeKey || "").replace(/^rentalTypes\./, "");
const toMs = (v) => (v == null ? null : typeof v === "number" ? v : Date.parse(v) || null);

// ---- Annonce API → forme utilisée par l'interface (mêmes champs que les annonces de démo)
const RENTAL_FROM_API = { "Location longue durée": "longStay", "Court séjour": "shortStay", Vente: "sale", "Hôtel": "hotel" };
const RENTAL_TO_API = { longStay: "Location longue durée", shortStay: "Court séjour", sale: "Vente", hotel: "Hôtel" };
const TAG_FROM_API = { "En vedette": "tags.featured", Nouveau: "tags.new", Premium: "tags.premium", "Court séjour": "tags.shortStay", Commercial: "tags.commercial", "Meublé": "tags.furnished", "Économique": "tags.economical" };
const fromApi = (p) => {
  const owner = p.landlord && typeof p.landlord === "object" ? p.landlord : null;
  const ownerRole = owner?.role;
  return {
    ...p,
    id: p.id,
    titleKey: p.title,
    rentalTypeKey: `rentalTypes.${RENTAL_FROM_API[p.rentalType] || "longStay"}`,
    cityKey: `cities.${p.city}`,
    tagKey: TAG_FROM_API[p.tag] || null,
    amenities: (Array.isArray(p.amenities) ? p.amenities : []).map((a) => AMEN_KEYS.indexOf(a)).filter((i) => i >= 0),
    images: Array.isArray(p.images) ? p.images : [],
    // Court séjour : le voyageur voit le prix hôte + commission MansaRent ; hostPrice = prix saisi par l'hôte.
    price: p.guestPrice ?? p.price,
    hostPrice: p.price,
    status: p.status || "available",
    ownerId: owner?.id || p.landlordId || null,
    ownerVerified: !!owner?.verified,
    ownerStars: owner?.stars || null,
    landlord: undefined,
    landlordInfo: {
      name: owner?.name || p.landlordInfo?.name || "MansaRent",
      avatar: owner?.avatar,
      roleKey: ownerRole === "agent" ? "landlordRoles.Agente immobilière" : ownerRole === "hotel" ? "landlordRoles.Hôtel" : "landlordRoles.Propriétaire",
    },
    createdTs: toMs(p.createdAt),
  };
};

// ---- PWA app-shell helpers (deterministic demo stats per listing) ----
const statSeed = (id) => { const n = Number(id) || 1; return { views: 80 + ((n * 137) % 900), saves: 3 + ((n * 41) % 60), daysOn: 2 + ((n * 29) % 45), activeH: 1 + ((n * 7) % 20) }; };
const relTime = (ts, lang = "fr") => {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (lang === "fr") {
    if (m < 60) return `il y a ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.round(h / 24);
    return d === 1 ? "hier" : `il y a ${d} jours`;
  }
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
};
const SEED_NOTIFICATIONS = [
  { id: "n1", icon: "message", titleKey: "shell.notifs.seedMsg", textKey: "shell.notifs.seedMsgText", agentIdx: 0, ts: Date.now() - 24 * 60000, read: false },
  { id: "n2", icon: "price", titleKey: "shell.notifs.seedPrice", textKey: "shell.notifs.seedPriceText", ts: Date.now() - 26 * 3600000, read: false },
  { id: "n3", icon: "heart", titleKey: "shell.notifs.seedFav", textKey: "shell.notifs.seedFavText", ts: Date.now() - 3 * 86400000, read: true },
  { id: "n4", icon: "eye", titleKey: "shell.notifs.seedViews", textKey: "shell.notifs.seedViewsText", ts: Date.now() - 5 * 86400000, read: true },
];

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

const EMPTY_FILTERS = { city: "", type: "", rental: "", beds: 0, minPrice: 0, maxPrice: 0, q: "", sort: "rel" };

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      .mr-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; }
      .mr-body, .mr-root { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif; }
      .mr-root { -webkit-font-smoothing: antialiased; overflow-x: clip; }
      @keyframes mrUp { from { opacity:0; transform:translateY(24px);} to {opacity:1; transform:translateY(0);} }
      .mr-reveal { opacity:0; } .mr-reveal.mr-in { animation: mrUp .65s cubic-bezier(.2,.7,.2,1) forwards; }
      @keyframes mrFloat { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-10px);} }
      .mr-float { animation: mrFloat 6s ease-in-out infinite; }
      @keyframes mrBlob { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(20px,-30px) scale(1.08);} 66%{transform:translate(-18px,16px) scale(.94);} }
      .mr-blob { animation: mrBlob 16s ease-in-out infinite; }
      @keyframes mrToast { from{opacity:0; transform:translateY(16px);} to {opacity:1; transform:translateY(0);} }
      .mr-toast { animation: mrToast .35s ease forwards; }
      .mr-grain { background-image: repeating-linear-gradient(45deg, rgba(212,148,5,.12) 0 1px, transparent 1px 16px), repeating-linear-gradient(-45deg, rgba(212,148,5,.12) 0 1px, transparent 1px 16px); }
      .mr-noscroll { overflow:hidden; }
      html { scroll-behavior:smooth; }
      select.mr-sel { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right .8rem center; }
    `}</style>
  );
}

function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`mr-reveal ${shown ? "mr-in" : ""} ${className}`} style={{ animationDelay: `${delay}ms` }}>{children}</div>;
}

const Btn = ({ children, variant = "solid", className = "", ...props }) => {
  const base = "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:opacity-50";
  const styles = {
    solid: "bg-teal-700 text-white hover:bg-teal-800 shadow-lg shadow-teal-700/20",
    amber: "bg-amber-500 text-teal-900 hover:bg-amber-400 shadow-lg shadow-amber-600/25",
    ghost: "bg-white text-teal-800 ring-1 ring-teal-200 hover:ring-teal-400 hover:bg-teal-50",
    outline: "bg-transparent text-teal-800 ring-2 ring-teal-700 hover:bg-teal-700 hover:text-white",
    green: "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20",
    dark: "bg-gray-900 text-white hover:bg-gray-800",
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props}>{children}</button>;
};

const SectionTag = ({ children }) => (
  <span className="inline-flex items-center gap-2.5 rounded-full bg-teal-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700 ring-1 ring-teal-100">
    <span className="h-2 w-2 rotate-45 rounded-[1px] bg-amber-500" /> {children}
  </span>
);

function Avatar({ name = "?", src = null, size = 36, className = "" }) {
  const dim = { width: size, height: size };
  if (src) return <img src={src} alt={name} referrerPolicy="no-referrer" style={dim} className={`shrink-0 rounded-full object-cover ${className}`} />;
  return (
    <span style={{ ...dim, fontSize: Math.round(size * 0.42) }} className={`grid shrink-0 place-items-center rounded-full bg-teal-700 font-bold text-white ${className}`}>
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function Logo({ light = false, compact = false }) {
  const { navigate } = useApp();
  return (
    <button onClick={() => navigate(START_PAGE)} className={`flex shrink-0 items-center select-none ${compact ? "gap-1.5" : "gap-2.5"}`}>
      <span className={`grid place-items-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 text-white shadow-md shadow-teal-700/30 ${compact ? "h-7 w-7 rounded-lg" : "h-9 w-9"}`}>
        <Home size={compact ? 15 : 18} strokeWidth={2.5} />
      </span>
      <span className={`mr-display font-extrabold ${light ? "text-white" : "text-gray-900"} ${compact ? "text-base" : "text-xl"}`}>Mansa<span className="text-amber-500">Rent</span></span>
    </button>
  );
}

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div className="mr-toast flex items-center gap-3 rounded-2xl bg-gray-900 px-5 py-3.5 text-sm font-medium text-white shadow-2xl">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-500"><Check size={14} strokeWidth={3} /></span>
        {toast}
      </div>
    </div>
  );
}

const NAV_GROUPS = [
  { key: "nav.home", action: () => ({ name: "home" }) },
  {
    key: "nav.properties", action: () => ({ name: "listings", reset: true }),
    children: [
      ["nav.properties", () => ({ name: "listings", reset: true })],
      ["nav.shortStay", () => ({ name: "listings", preset: { ...EMPTY_FILTERS, rental: "shortStay" } })],
      ["nav.longStay", () => ({ name: "listings", preset: { ...EMPTY_FILTERS, rental: "longStay" } })],
      ["nav.hotels", () => ({ name: "listings", preset: { ...EMPTY_FILTERS, rental: "hotel" } })],
    ],
  },
  { key: "nav.agents", action: () => ({ name: "home", anchor: "agents" }) },
  {
    key: "nav.contact", action: () => ({ name: "home", anchor: "contact" }),
    children: [
      ["nav.contact", () => ({ name: "home", anchor: "contact" })],
      ["nav.about", () => ({ name: "home", anchor: "apropos" })],
    ],
  },
];
// Flat list kept for any legacy usage (mobile drawer uses NAV_GROUPS).
const NAV = [
  ["nav.home", () => ({ name: "home" })],
  ["nav.properties", () => ({ name: "listings", reset: true })],
  ["nav.shortStay", () => ({ name: "listings", preset: { ...EMPTY_FILTERS, rental: "shortStay" } })],
  ["nav.longStay", () => ({ name: "listings", preset: { ...EMPTY_FILTERS, rental: "longStay" } })],
  ["nav.agents", () => ({ name: "home", anchor: "agents" })],
  ["nav.about", () => ({ name: "home", anchor: "apropos" })],
  ["nav.contact", () => ({ name: "home", anchor: "contact" })],
];

function NavDesktopItem({ g, go, t, openKey, setOpenKey }) {
  if (!g.children) {
    return (
      <li>
        <button onClick={() => { go(g.action); setOpenKey(null); }} className="text-sm font-medium text-gray-600 transition-colors hover:text-teal-700">{t(g.key)}</button>
      </li>
    );
  }
  const open = openKey === g.key;
  return (
    <li className="relative" onMouseEnter={() => setOpenKey(g.key)} onMouseLeave={() => setOpenKey(null)}>
      <div className="flex items-center gap-0.5">
        <button onClick={() => { go(g.action); setOpenKey(null); }} className="text-sm font-medium text-gray-600 transition-colors hover:text-teal-700">{t(g.key)}</button>
        <button onClick={() => setOpenKey(open ? null : g.key)} aria-label={t(g.key)} aria-expanded={open} className="grid h-6 w-6 place-items-center rounded-md text-gray-400 hover:text-teal-700">
          <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <div className={`absolute left-0 top-full z-50 pt-2 transition-all duration-150 ${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"}`}>
        <div className="w-52 overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-gray-100">
          {g.children.map(([ck, cfn]) => (
            <button key={ck} onClick={() => { go(cfn); setOpenKey(null); }} className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-gray-600 transition hover:bg-teal-50 hover:text-teal-700">
              {t(ck)} <ChevronRight size={15} className="text-gray-300" />
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

function NavDrawerGroups({ go, t, setOpen }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <>
      {NAV_GROUPS.map((g) => (
        <li key={g.key}>
          {g.children ? (
            <>
              <div className="flex w-full items-center gap-1 rounded-xl hover:bg-teal-50">
                <button onClick={() => go(g.action)} className="flex min-w-0 flex-1 items-center rounded-xl px-4 py-3.5 text-left text-base font-medium text-gray-700 hover:text-teal-700">
                  {t(g.key)}
                </button>
                <button onClick={() => setExpanded(expanded === g.key ? null : g.key)} aria-label={t(g.key)} aria-expanded={expanded === g.key} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gray-400 hover:text-teal-700">
                  <ChevronDown size={18} className={`transition-transform duration-200 ${expanded === g.key ? "rotate-180" : ""}`} />
                </button>
              </div>
              <div className={`grid transition-all duration-200 ${expanded === g.key ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="ml-4 flex flex-col border-l-2 border-teal-100 pl-2">
                    {g.children.map(([ck, cfn]) => (
                      <button key={ck} onClick={() => go(cfn)} className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-[15px] font-medium text-gray-600 hover:bg-teal-50 hover:text-teal-700">
                        {t(ck)} <ChevronRight size={17} className="text-gray-300" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <button onClick={() => go(g.action)} className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-base font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-700">
              {t(g.key)} <ChevronRight size={18} className="text-gray-300" />
            </button>
          )}
        </li>
      ))}
    </>
  );
}

function Navbar() {
  const { navigate, setFilters, openAuth, favorites, user, logout, conversations, i18n } = useApp();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const unread = conversations.filter((c) => c.unread).length;
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { document.body.classList.toggle("mr-noscroll", open); }, [open]);

  const go = (fn) => {
    const r = fn();
    if (r.reset) setFilters(EMPTY_FILTERS);
    if (r.preset) setFilters(r.preset);
    navigate(r.name, r.anchor ? { anchor: r.anchor } : {});
    setOpen(false);
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-white"}`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
        <Logo />
        <ul className="hidden items-center gap-6 lg:flex">
          {NAV_GROUPS.map((g) => (
            <NavDesktopItem key={g.key} g={g} go={go} t={t} openKey={dropOpen} setOpenKey={setDropOpen} />
          ))}
        </ul>
        <div className="hidden items-center gap-2.5 lg:flex">
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 ring-1 ring-gray-200 hover:text-teal-700"
              aria-label="Language"
            >
              {i18n.language === "fr" ? "FR" : "EN"}
              <ChevronRight size={14} className={`transition-transform ${langOpen ? "rotate-90" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 rounded-xl bg-white p-1 shadow-xl ring-1 ring-gray-200">
                <button
                  onClick={() => { i18n.changeLanguage("fr"); setLangOpen(false); }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-teal-50 ${i18n.language === "fr" ? "bg-teal-50 text-teal-700" : "text-gray-600"}`}
                >
                  Français
                </button>
                <button
                  onClick={() => { i18n.changeLanguage("en"); setLangOpen(false); }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-teal-50 ${i18n.language === "en" ? "bg-teal-50 text-teal-700" : "text-gray-600"}`}
                >
                  English
                </button>
              </div>
            )}
          </div>
          <button onClick={() => navigate("messages")} className="relative grid h-10 w-10 place-items-center rounded-xl text-gray-600 ring-1 ring-gray-200 hover:text-teal-700" aria-label={t("nav.messages")}>
            <MessageSquare size={18} />
            {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-teal-900">{unread}</span>}
          </button>
          <button onClick={() => navigate("favorites")} className="relative grid h-10 w-10 place-items-center rounded-xl text-gray-600 ring-1 ring-gray-200 hover:text-rose-500" aria-label={t("nav.favorites")}>
            <Heart size={18} />
            {favorites.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{favorites.length}</span>}
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              {user.role === "admin" && (
                <button onClick={() => navigate("admin")} className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-extrabold text-white hover:bg-teal-800">ADMIN</button>
              )}
              {HAS_API && ["agent", "landlord", "hotel"].includes(user.role) && (
                <button onClick={() => navigate("dashboard")} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-extrabold text-teal-900 hover:bg-amber-400"><LayoutDashboard size={14} /> {t("pro.dash.short")}</button>
              )}
              <button onClick={() => navigate("profile")} className="grid h-9 w-9 place-items-center rounded-full" aria-label={t("shell.tabs.profile")}><Avatar name={user.name} src={user.avatar} size={36} /></button>
              <button onClick={logout} className="grid h-10 w-10 place-items-center rounded-xl text-gray-600 ring-1 ring-gray-200 hover:text-teal-700" aria-label={t("nav.logout")}><LogOut size={18} /></button>
            </div>
          ) : (
            <Btn variant="ghost" className="px-5 py-2.5 text-sm" onClick={openAuth}>{t("nav.login")}</Btn>
          )}
          <Btn variant="solid" className="px-5 py-2.5 text-sm" onClick={() => navigate("post")}>{t("nav.post")}</Btn>
        </div>
        <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl text-gray-700 ring-1 ring-gray-200 lg:hidden" aria-label={t("nav.menu")}><Menu size={20} /></button>
      </nav>

      <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-gray-900/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
        <div className={`absolute right-0 top-0 h-full w-[84%] max-w-sm bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <Logo />
            <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl text-gray-700 ring-1 ring-gray-200" aria-label={t("nav.close")}><X size={20} /></button>
          </div>
          <ul className="flex flex-col overflow-y-auto px-3 py-3">
            <NavDrawerGroups go={go} t={t} setOpen={setOpen} />
            <li>
              <button onClick={() => { navigate("messages"); setOpen(false); }} className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-base font-medium text-gray-700 hover:bg-teal-50">
                {t("nav.messages")} <span className="flex items-center gap-1 text-teal-700"><MessageSquare size={16} /> {unread > 0 ? unread : ""}</span>
              </button>
            </li>
            <li>
              <button onClick={() => { navigate("favorites"); setOpen(false); }} className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-base font-medium text-gray-700 hover:bg-teal-50">
                {t("nav.favorites")} <span className="flex items-center gap-1 text-rose-500"><Heart size={16} /> {favorites.length}</span>
              </button>
            </li>
          </ul>
          <div className="mt-1 flex flex-col gap-3 px-5">
            {user
              ? <Btn variant="ghost" className="w-full py-3" onClick={() => { logout(); setOpen(false); }}><LogOut size={16} /> {t("nav.logout")} ({user.name})</Btn>
              : <Btn variant="ghost" className="w-full py-3" onClick={() => { openAuth(); setOpen(false); }}>{t("nav.login")}</Btn>}
            <Btn variant="solid" className="w-full py-3" onClick={() => { navigate("post"); setOpen(false); }}><Plus size={16} /> {t("nav.postListing")}</Btn>
          </div>
        </div>
      </div>
    </header>
  );
}

function SearchBar({ big = true }) {
  const { setFilters, navigate } = useApp();
  const { t } = useTranslation();
  const [q, setQ] = useState({ city: "", type: "", rental: "" });
  const sel = "mr-sel w-full appearance-none rounded-2xl border-0 bg-gray-50 px-4 py-3.5 pr-9 text-sm font-medium text-gray-800 ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";
  const submit = () => { setFilters({ ...EMPTY_FILTERS, ...q }); navigate("listings"); };
  const Field = ({ icon, label, value, onChange, placeholder, options, ns }) => (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="flex items-center gap-1.5 px-1 text-xs font-semibold text-gray-500">{icon}{label}</span>
      <select className={sel} value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{t(`${ns}.${o}`)}</option>)}
      </select>
    </label>
  );
  return (
    <div className={`rounded-[28px] bg-white p-4 ring-1 ring-gray-100 ${big ? "shadow-2xl shadow-teal-900/10" : "shadow-lg"}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <Field icon={<MapPin size={13} />} label={t("hero.search.city")} placeholder={t("hero.search.cityPlaceholder")} options={VILLES_KEYS} ns="cities" value={q.city} onChange={(e) => setQ({ ...q, city: e.target.value })} />
        <Field icon={<Home size={13} />} label={t("hero.search.type")} placeholder={t("hero.search.typePlaceholder")} options={TYPES_KEYS} ns="types" value={q.type} onChange={(e) => setQ({ ...q, type: e.target.value })} />
        <Field icon={<Wallet size={13} />} label={t("hero.search.rentalType")} placeholder={t("hero.search.rentalTypePlaceholder")} options={LOCATIONS_KEYS} ns="rentalTypes" value={q.rental} onChange={(e) => setQ({ ...q, rental: e.target.value })} />
        <Btn variant="amber" className="w-full px-6 py-3.5 md:w-auto md:py-[26px]" onClick={submit}><Search size={18} /> {t("hero.search.search")}</Btn>
      </div>
    </div>
  );
}

function Hero() {
  const { setFilters, navigate, siteSettings } = useApp();
  const { t } = useTranslation();
  const heroImg = (siteSettings?.hero?.image) || url("photo-1545324418-cc1a3fa10c00", 900);
  return (
    <section id="accueil" className="relative overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-white pt-8 lg:pt-14">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl mr-blob" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl mr-blob" style={{ animationDelay: "4s" }} />
      <div className="pointer-events-none absolute inset-0 mr-grain opacity-40" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-10 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-20">
        <div className="text-center lg:text-left">
          <Reveal><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-teal-700 shadow-sm ring-1 ring-teal-100"><span className="grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-white"><Check size={10} strokeWidth={4} /></span>{t("hero.badge")}</span></Reveal>
          <Reveal delay={80}>
            <h1 className="mr-display mt-5 text-4xl font-extrabold leading-[1.05] text-gray-900 sm:text-5xl lg:text-6xl">
              {t("hero.title1")} <span className="relative whitespace-nowrap text-teal-700">{t("hero.title2")}<svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none"><path d="M2 9C50 3 150 3 198 9" stroke="#d49405" strokeWidth="4" strokeLinecap="round" /></svg></span> {t("hero.title3")}
            </h1>
          </Reveal>
          <Reveal delay={160}><p className="mx-auto mt-5 max-w-xl text-base text-gray-600 lg:mx-0 lg:text-lg">{t("hero.subtitle")}</p></Reveal>
          <Reveal delay={240}><p className="mr-display mt-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-500">{t("hero.slogan")}</p></Reveal>
          <Reveal delay={320}>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Btn variant="solid" className="px-7 py-3.5" onClick={() => { setFilters(EMPTY_FILTERS); navigate("listings"); }}>{t("hero.find")} <ArrowRight size={18} /></Btn>
              <Btn variant="outline" className="px-7 py-3.5" onClick={() => navigate("post")}>{t("hero.post")}</Btn>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <div className="mt-8 flex items-center justify-center gap-8 lg:justify-start">
              {[["12k+", t("hero.listings")], ["8", t("hero.regions")], ["4,9★", t("hero.avgRating")]].map(([n, l]) => (
                <div key={l} className="text-center lg:text-left"><div className="mr-display text-2xl font-extrabold text-gray-900">{n}</div><div className="text-xs font-medium text-gray-500">{l}</div></div>
              ))}
            </div>
          </Reveal>
        </div>
        <Reveal delay={200} className="relative">
          <div className="relative mr-float">
            <div className="overflow-hidden rounded-[32px] shadow-2xl shadow-teal-900/20 ring-1 ring-black/5">
              <img loading="eager" alt={t("hero.title3")} src={heroImg} className="h-[360px] w-full object-cover sm:h-[460px]" />
            </div>
            <div className="absolute -bottom-5 -left-3 hidden rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-gray-100 sm:block">
              <div className="flex items-center gap-3">
                <img alt="Villa" src={url("photo-1613490493576-7fde63acd811", 200)} className="h-12 w-12 rounded-xl object-cover" />
                <div><div className="text-xs text-gray-500">Villa · Conakry</div><div className="mr-display font-bold text-teal-700">8,5M GNF<span className="text-xs font-medium text-gray-400">{t("propertyCard.perMonth")}</span></div></div>
              </div>
            </div>
            <div className="absolute -right-2 top-6 hidden items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl ring-1 ring-gray-100 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-100 text-teal-700"><ShieldCheck size={16} /></span>
              <div className="text-xs font-semibold text-gray-700">{t("detail.verified")}</div>
            </div>
          </div>
        </Reveal>
      </div>
      <Reveal delay={300}><div className="relative mx-auto -mt-2 max-w-5xl px-5 pb-12 lg:px-8 lg:pb-16"><SearchBar /></div></Reveal>
    </section>
  );
}

const CATEGORIES = [
  { nameKey: "categories.Maisons", type: "Maison", icon: Home, count: "3 200+", img: url("photo-1568605114967-8130f3a36994", 600) },
  { nameKey: "categories.Appartements", type: "Appartement", icon: Building2, count: "4 100+", img: url("photo-1502672260266-1c1ef2d93688", 600) },
  { nameKey: "categories.Chambres", type: "Chambre", icon: DoorOpen, count: "1 800+", img: url("photo-1505691938895-1758d7feb511", 600) },
  { nameKey: "categories.Villas", type: "Villa", icon: Hotel, count: "640+", img: url("photo-1613490493576-7fde63acd811", 600) },
  { nameKey: "categories.Bureaux", type: "Bureau", icon: Briefcase, count: "520+", img: url("photo-1497366754035-f200968a6e72", 600) },
  { nameKey: "categories.Boutiques", type: "Boutique", icon: Store, count: "380+", img: url("photo-1604719312566-8912e9227c6a", 600) },
  { nameKey: "categories.Hotels", rental: "hotel", icon: Hotel, count: "120+", img: url("photo-1566073771259-6a8506099945", 600) },
];

function Categories() {
  const { setFilters, navigate, siteSettings, properties } = useApp();
  const { t } = useTranslation();
  const go = (c) => { setFilters(c.rental ? { ...EMPTY_FILTERS, rental: c.rental } : { ...EMPTY_FILTERS, type: c.type }); navigate("listings"); };
  const imgOf = (c) => (siteSettings?.categories?.[c.type || c.rental]) || c.img;
  return (
    <section id="proprietes" className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <Reveal className="mb-10 text-center">
        <SectionTag>{t("categories.tag")}</SectionTag>
        <h2 className="mr-display mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">{t("categories.title")}</h2>
        <p className="mx-auto mt-3 max-w-lg text-gray-600">{t("categories.subtitle")}</p>
      </Reveal>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {CATEGORIES.map((c, i) => (
          <Reveal key={c.nameKey} delay={i * 70}>
            <button onClick={() => go(c)} className="group block w-full overflow-hidden rounded-3xl bg-white text-left shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:ring-teal-200">
              <div className="relative h-28 overflow-hidden bg-gray-100">
                <img loading="lazy" alt={t(c.nameKey)} src={imgOf(c)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <span className="absolute left-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-xl bg-white/95 text-teal-700 shadow-sm backdrop-blur"><c.icon size={18} /></span>
              </div>
              <div className="px-3.5 py-3"><div className="mr-display font-bold text-gray-900">{t(c.nameKey)}</div><div className="text-xs font-medium text-gray-400">{HAS_API ? properties.filter((p) => (c.rental ? rentalOf(p) === c.rental : p.type === c.type && !isHotelP(p))).length : c.count} {t("categories.listings")}</div></div>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const CITY_CARDS = [
  // Photos réelles des villes (public/cities/) ; pos = partie de l'image gardée dans la carte.
  { nameKey: "cities.Conakry", count: "6 400+", img: "/cities/conakry.jpg", pos: "60% 55%" },
  { nameKey: "cities.Kankan", count: "1 200+", img: "/cities/kankan.jpg", pos: "50% 60%" },
  { nameKey: "cities.Kindia", count: "860+", img: "/cities/kindia.jpg", pos: "70% 40%" },
  { nameKey: "cities.Labé", count: "540+", img: "/cities/labe.jpg", pos: "50% 35%" },
];

function Cities() {
  const { setFilters, navigate, properties } = useApp();
  const { t } = useTranslation();
  // Le filtre attend le nom de la ville (« Conakry »), pas la clé de traduction.
  const go = (cityKey) => { setFilters({ ...EMPTY_FILTERS, city: String(cityKey).replace(/^cities\./, "") }); navigate("listings"); };
  return (
    <section className="mx-auto max-w-7xl px-5 pb-4 lg:px-8 lg:pb-12">
      <Reveal className="mb-8 text-center">
        <SectionTag>{t("cities.tag")}</SectionTag>
        <h2 className="mr-display mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">{t("cities.title")}</h2>
        <p className="mx-auto mt-3 max-w-lg text-gray-600">{t("cities.subtitle")}</p>
      </Reveal>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CITY_CARDS.map((c, i) => (
          <Reveal key={c.nameKey} delay={i * 80}>
            <button onClick={() => go(c.nameKey)} className="group relative block h-56 w-full overflow-hidden rounded-3xl bg-gray-200 text-left shadow-sm ring-1 ring-gray-100 lg:h-72">
              <img loading="lazy" alt={t("cities.inCity", { city: t(c.nameKey) })} src={c.img} style={{ objectPosition: c.pos || "center" }} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4"><div className="mr-display text-lg font-extrabold text-white">{t(c.nameKey)}</div><div className="flex items-center gap-1 text-xs text-teal-100"><MapPin size={12} /> {HAS_API ? properties.filter((p) => cityOf(p) === c.nameKey.replace(/^cities\./, "")).length : c.count} {t("cities.properties")}</div></div>
              <span className="absolute right-3 top-3 grid h-9 w-9 translate-y-1 place-items-center rounded-full bg-white/90 text-teal-700 opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"><ArrowRight size={16} /></span>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { n: "01", titleKey: "howItWorks.step1.title", descKey: "howItWorks.step1.desc", icon: Search },
  { n: "02", titleKey: "howItWorks.step2.title", descKey: "howItWorks.step2.desc", icon: MessageSquare },
  { n: "03", titleKey: "howItWorks.step3.title", descKey: "howItWorks.step3.desc", icon: Home },
];
function HowItWorks() {
  const { t } = useTranslation();
  return (
    <section id="courtsejour" className="relative overflow-hidden bg-teal-700 py-16 lg:py-24">
      <div className="pointer-events-none absolute inset-0 mr-grain opacity-20" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal-500/40 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-teal-100">{t("howItWorks.tag")}</span>
          <h2 className="mr-display mt-4 text-3xl font-extrabold text-white sm:text-4xl">{t("howItWorks.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-teal-100">{t("howItWorks.subtitle")}</p>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <div className="relative h-full rounded-3xl bg-white/95 p-7 shadow-xl ring-1 ring-white/20 backdrop-blur transition-transform duration-300 hover:-translate-y-1.5">
                <span className="mr-display absolute right-6 top-5 text-5xl font-extrabold text-teal-100">{s.n}</span>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white shadow-lg shadow-teal-700/30"><s.icon size={24} /></span>
                <h3 className="mr-display mt-5 text-xl font-bold text-gray-900">{t(s.titleKey)}</h3>
                <p className="mt-2 text-sm text-gray-600">{t(s.descKey)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: ShieldCheck, titleKey: "whyChoose.features.verified.title", descKey: "whyChoose.features.verified.desc", color: "text-teal-700 bg-teal-50" },
  { icon: Users, titleKey: "whyChoose.features.trusted.title", descKey: "whyChoose.features.trusted.desc", color: "text-amber-600 bg-amber-50" },
  { icon: Search, titleKey: "whyChoose.features.search.title", descKey: "whyChoose.features.search.desc", color: "text-teal-700 bg-teal-50" },
  { icon: MessageSquare, titleKey: "whyChoose.features.messaging.title", descKey: "whyChoose.features.messaging.desc", color: "text-teal-700 bg-teal-50" },
  { icon: ShieldCheck, titleKey: "whyChoose.features.safe.title", descKey: "whyChoose.features.safe.desc", color: "text-teal-700 bg-teal-50" },
  { icon: BadgeCheck, titleKey: "whyChoose.features.free.title", descKey: "whyChoose.features.free.desc", color: "text-amber-600 bg-amber-50" },
];
function WhyChoose() {
  const { t } = useTranslation();
  return (
    <section id="apropos" className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <Reveal className="mb-10 text-center">
        <SectionTag>{t("whyChoose.tag")}</SectionTag>
        <h2 className="mr-display mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">{t("whyChoose.title")}</h2>
        <p className="mx-auto mt-3 max-w-lg text-gray-600">{t("whyChoose.subtitle")}</p>
      </Reveal>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.titleKey} delay={i * 80}>
            <div className="group flex h-full items-start gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-teal-200">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${f.color} transition-transform duration-300 group-hover:scale-110`}><f.icon size={22} /></span>
              <div><h3 className="mr-display text-lg font-bold text-gray-900">{t(f.titleKey)}</h3><p className="mt-1 text-sm text-gray-600">{t(f.descKey)}</p></div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function PropertyCard({ p, delay = 0 }) {
  const { navigate, favorites, toggleFavorite } = useApp();
  const { t } = useTranslation();
  const fav = favorites.includes(p.id);
  return (
    <Reveal delay={delay}>
      <article onClick={() => navigate("detail", { id: p.id })} className="group h-full cursor-pointer overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
        <div className="relative h-52 overflow-hidden bg-gray-100">
          <img loading="lazy" alt={t(p.titleKey)} src={coverOf(p)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          {p.status && p.status !== "available"
            ? <StatusBadge status={p.status} className="absolute left-3 top-3" />
            : p.tagKey && <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow">{t(p.tagKey)}</span>}
          <button onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }} className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full backdrop-blur transition ${fav ? "bg-rose-500 text-white" : "bg-white/90 text-gray-500 hover:text-rose-500"}`} aria-label={t("propertyCard.favorite")}>
            <Heart size={16} fill={fav ? "currentColor" : "none"} />
          </button>
          <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-teal-700 backdrop-blur">{isHotelP(p) ? <>🏨 {t("rentalTypes.hotel")}{p.ownerStars ? <span className="ml-1 text-amber-500">{"★".repeat(p.ownerStars)}</span> : null}</> : t(`types.${p.type}`)}</span>
        </div>
        <div className="p-5">
          <span className="mr-display text-xl font-extrabold text-teal-700">{formatGNF(p.price)}<PriceSuffix p={p} /></span>
          <h3 className="mr-display mt-1 text-lg font-bold text-gray-900">{t(p.titleKey)}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500"><MapPin size={14} /> {p.neighborhood ? `${p.neighborhood}, ` : ""}{t(p.cityKey)}</p>
          <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><Bed size={16} className="text-teal-600" /> {t("propertyCard.beds", { count: p.beds })}</span>
            <span className="flex items-center gap-1.5"><Bath size={16} className="text-teal-600" /> {t("propertyCard.baths", { count: p.baths })}</span>
            <span className="ml-auto flex items-center gap-1 font-semibold text-teal-700">{t("propertyCard.view")} <ArrowRight size={14} /></span>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

// Squelette affiché pendant le chargement des annonces (au lieu d'un écran vide).
function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100" aria-hidden="true">
      <div className="mr-skel aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <div className="mr-skel h-5 w-3/4" />
        <div className="mr-skel h-3.5 w-1/2" />
        <div className="flex gap-3 pt-1"><div className="mr-skel h-3.5 w-14" /><div className="mr-skel h-3.5 w-14" /><div className="mr-skel h-3.5 w-14" /></div>
        <div className="mr-skel h-6 w-1/3" />
      </div>
    </div>
  );
}

function Featured() {
  const { properties, setFilters, navigate, propsLoading } = useApp();
  const { t } = useTranslation();
  const list = properties.filter((p) => p.featured).slice(0, 6);
  return (
    <section className="bg-gradient-to-b from-white to-teal-50/50 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="mb-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div><SectionTag>{t("featured.tag")}</SectionTag><h2 className="mr-display mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">{t("featured.title")}</h2></div>
          <Btn variant="ghost" className="px-6 py-3" onClick={() => { setFilters(EMPTY_FILTERS); navigate("listings"); }}>{t("featured.viewAll")} <ArrowRight size={16} /></Btn>
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{propsLoading && !list.length ? [0, 1, 2].map((i) => <PropertyCardSkeleton key={i} />) : list.map((p, i) => <PropertyCard key={p.id} p={p} delay={i * 80} />)}</div>
      </div>
    </section>
  );
}

const LANDLORD_BENEFITS = [
  { icon: Users, titleKey: "forLandlords.benefits.reach.title", descKey: "forLandlords.benefits.reach.desc" },
  { icon: TrendingUp, titleKey: "forLandlords.benefits.easy.title", descKey: "forLandlords.benefits.easy.desc" },
  { icon: Eye, titleKey: "forLandlords.benefits.visibility.title", descKey: "forLandlords.benefits.visibility.desc" },
  { icon: BarChart3, titleKey: "forLandlords.benefits.analytics.title", descKey: "forLandlords.benefits.analytics.desc" },
];
function ForLandlords() {
  const { navigate } = useApp();
  const { t } = useTranslation();
  return (
    <section id="agents" className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal className="relative">
          <div className="overflow-hidden rounded-[32px] shadow-2xl shadow-teal-900/15 ring-1 ring-black/5"><img loading="lazy" alt={t("forLandlords.title")} src={url("photo-1556157382-97eda2d62296", 800)} className="h-[380px] w-full object-cover lg:h-[460px]" /></div>
          <div className="absolute -bottom-6 right-4 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-gray-100"><div className="text-xs font-medium text-gray-500">{t("forLandlords.responseTime")}</div><div className="mr-display text-2xl font-extrabold text-teal-700">&lt; 2 h</div></div>
        </Reveal>
        <div>
          <Reveal><SectionTag>{t("forLandlords.tag")}</SectionTag></Reveal>
          <Reveal delay={80}><h2 className="mr-display mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">{t("forLandlords.title")}</h2><p className="mt-3 text-gray-600">{t("forLandlords.subtitle")}</p></Reveal>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {LANDLORD_BENEFITS.map((b, i) => (
              <Reveal key={b.titleKey} delay={120 + i * 80}>
                <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-700 text-white"><b.icon size={18} /></span><div><h3 className="mr-display font-bold text-gray-900">{t(b.titleKey)}</h3><p className="mt-0.5 text-sm text-gray-600">{t(b.descKey)}</p></div></div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={460}><Btn variant="amber" className="mt-7 px-7 py-3.5" onClick={() => navigate(HAS_API ? "ranking" : "discover")}><Search size={18} /> {t("forLandlords.cta")} <ArrowRight size={18} /></Btn></Reveal>
        </div>
      </div>
    </section>
  );
}

const REVIEWS = [
  { name: "Aïssatou Diallo", roleKey: "testimonials.role1", textKey: "testimonials.text1", img: url("photo-1531123897727-8f129e1688ce", 200) },
  { name: "Mamadou Baldé", roleKey: "testimonials.role2", textKey: "testimonials.text2", img: url("photo-1507003211169-0a1dd7228f2d", 200) },
  { name: "Fatoumata Camara", roleKey: "testimonials.role3", textKey: "testimonials.text3", img: url("photo-1438761681033-6461ffad8d80", 200) },
  { name: "Ibrahima Sow", roleKey: "testimonials.role4", textKey: "testimonials.text4", img: url("photo-1500648767791-00dcc994a43e", 200) },
  { name: "Mariama Bah", roleKey: "testimonials.role5", textKey: "testimonials.text5", img: url("photo-1494790108377-be9c29b29330", 200) },
  { name: "Sékou Touré", roleKey: "testimonials.role6", textKey: "testimonials.text6", img: url("photo-1506794778202-cad84cf45f1d", 200) },
  { name: "Kadiatou Sylla", roleKey: "testimonials.role7", textKey: "testimonials.text7", img: url("photo-1544005313-94ddf0286df2", 200) },
  { name: "Alpha Condé", roleKey: "testimonials.role8", textKey: "testimonials.text8", img: url("photo-1472099645785-5658abf4ff4e", 200) },
];
function Testimonials() {
  const { t } = useTranslation();
  return (
    <section className="bg-teal-50/60 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="mb-10 text-center"><SectionTag>{t("testimonials.tag")}</SectionTag><h2 className="mr-display mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">{t("testimonials.title")}</h2></Reveal>
      </div>
      {/* Défilement continu de tous les témoignages (pause au survol / au toucher) */}
      <style>{`
        @keyframes mr-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .mr-marquee { animation: mr-marquee 60s linear infinite; }
        .mr-marquee-wrap:hover .mr-marquee, .mr-marquee-wrap:active .mr-marquee { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .mr-marquee { animation: none; } }
      `}</style>
      <div className="mr-marquee-wrap relative overflow-hidden" style={{ maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)" }}>
        <div className="mr-marquee flex w-max gap-6 py-2">
          {[...REVIEWS, ...REVIEWS].map((r, i) => (
            <figure key={i} aria-hidden={i >= REVIEWS.length} className="flex w-[300px] shrink-0 flex-col rounded-3xl bg-white p-7 shadow-sm ring-1 ring-gray-100 sm:w-[360px]">
              <div className="flex gap-0.5 text-amber-500">{[...Array(5)].map((_, k) => <Star key={k} size={16} fill="currentColor" />)}</div>
              <blockquote className="mt-4 flex-1 text-gray-700">«&nbsp;{t(r.textKey)}&nbsp;»</blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-5"><img alt={r.name} src={r.img} loading="lazy" className="h-11 w-11 rounded-full object-cover ring-2 ring-teal-100" /><div><div className="mr-display font-bold text-gray-900">{r.name}</div><div className="text-xs text-gray-500">{t(r.roleKey)}</div></div></figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  const { route } = useApp();
  useEffect(() => {
    if (route.anchor) {
      const el = document.getElementById(route.anchor);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
  }, [route]);
  return (<><Hero /><Categories /><Cities /><HowItWorks /><WhyChoose /><Featured /><ForLandlords /><Testimonials /></>);
}

const PRICE_OPTS = [
  { label: "any", v: 0 }, { label: "1M GNF", v: 1000000 }, { label: "2M GNF", v: 2000000 },
  { label: "3M GNF", v: 3000000 }, { label: "5M GNF", v: 5000000 }, { label: "8M GNF", v: 8000000 }, { label: "15M GNF", v: 15000000 },
];

function FilterBar() {
  const { filters, setFilters } = useApp();
  const { t } = useTranslation();
  const [openM, setOpenM] = useState(false);
  const set = (patch) => setFilters({ ...filters, ...patch });
  const sel = "mr-sel w-full appearance-none rounded-xl border-0 bg-gray-50 px-3.5 py-2.5 pr-8 text-sm font-medium text-gray-800 ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";
  const Fields = () => (
    <>
      <select className={sel} value={filters.city} onChange={(e) => set({ city: e.target.value })}><option value="">{t("listings.filters.allCities")}</option>{VILLES_KEYS.map((v) => <option key={v} value={v}>{t(`cities.${v}`)}</option>)}</select>
      <select className={sel} value={filters.type} onChange={(e) => set({ type: e.target.value })}><option value="">{t("listings.filters.allTypes")}</option>{TYPES_KEYS.map((v) => <option key={v} value={v}>{t(`types.${v}`)}</option>)}</select>
      <select className={sel} value={filters.rental} onChange={(e) => set({ rental: e.target.value })}><option value="">{t("listings.filters.allRentals")}</option>{LOCATIONS_KEYS.map((v) => <option key={v} value={v}>{t(`rentalTypes.${v}`)}</option>)}</select>
      <select className={sel} value={filters.beds} onChange={(e) => set({ beds: Number(e.target.value) })}><option value={0}>{t("listings.filters.bedrooms")}</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}</select>
      <select className={sel} value={filters.minPrice} onChange={(e) => set({ minPrice: Number(e.target.value) })}>{PRICE_OPTS.map((o) => <option key={o.v} value={o.v}>{o.v ? `${t("listings.filters.min")} ${o.label}` : t("listings.filters.minPrice")}</option>)}</select>
      <select className={sel} value={filters.maxPrice} onChange={(e) => set({ maxPrice: Number(e.target.value) })}>{PRICE_OPTS.map((o) => <option key={o.v} value={o.v}>{o.v ? `${t("listings.filters.max")} ${o.label}` : t("listings.filters.maxPrice")}</option>)}</select>
    </>
  );
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder={t("listings.filters.searchPlaceholder")} className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-3 text-sm ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <button onClick={() => setOpenM((v) => !v)} className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 lg:hidden"><SlidersHorizontal size={16} /> {t("listings.filters.filters")}</button>
      </div>
      <div className={`mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6 ${openM ? "grid" : "hidden lg:grid"}`}><Fields /></div>
    </div>
  );
}

function ListingsPage() {
  const { properties, filters, setFilters, navigate, propsLoading } = useApp();
  const { t } = useTranslation();
  const f = filters;
  const filtered = useMemo(() => {
    let list = properties.filter((p) => {
      if (f.city && cityOf(p) !== f.city) return false;
      if (f.type && p.type !== f.type) return false;
      if (f.rental && rentalOf(p) !== f.rental) return false;
      if (f.beds && p.beds < f.beds) return false;
      if (f.minPrice && p.price < f.minPrice) return false;
      if (f.maxPrice && p.price > f.maxPrice) return false;
      if (f.q) { const q = f.q.toLowerCase(); if (!(p.titleKey.toLowerCase().includes(q) || p.cityKey.toLowerCase().includes(q) || (p.neighborhood || "").toLowerCase().includes(q))) return false; }
      return true;
    });
    if (f.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (f.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (f.sort === "new") list = [...list].sort((a, b) => (b.createdTs || Number(b.id) || 0) - (a.createdTs || Number(a.id) || 0));
    return list;
  }, [properties, f]);

  return (
    <div className="min-h-screen bg-gray-50/70">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="mr-display text-2xl font-extrabold text-gray-900 sm:text-3xl">{t("listings.title")}</h1>
            <p className="mt-1 text-sm text-gray-500"><span className="font-semibold text-teal-700">{propsLoading && !filtered.length ? "…" : filtered.length}</span> {f.city ? t("listings.inCity", { city: t(`cities.${f.city}`) }) : t("listings.inGuinea")}</p>
          </div>
          <select value={f.sort} onChange={(e) => setFilters({ ...f, sort: e.target.value })} className="mr-sel hidden appearance-none rounded-xl border-0 bg-white px-4 py-2.5 pr-9 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 focus:outline-none sm:block">
            <option value="rel">{t("listings.sort.relevance")}</option><option value="price-asc">{t("listings.sort.priceAsc")}</option><option value="price-desc">{t("listings.sort.priceDesc")}</option><option value="new">{t("listings.sort.newest")}</option>
          </select>
        </div>
        <FilterBar />
        {propsLoading && filtered.length === 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <PropertyCardSkeleton key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 flex flex-col items-center rounded-3xl bg-white py-16 text-center ring-1 ring-gray-100">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-gray-100 text-gray-400"><Search size={28} /></span>
            <h3 className="mr-display mt-5 text-xl font-bold text-gray-900">{t("listings.filters.noResults")}</h3>
            <p className="mt-2 max-w-sm text-sm text-gray-500">{t("listings.filters.noResultsHint")}</p>
            <Btn variant="ghost" className="mt-5 px-5 py-2.5" onClick={() => setFilters(EMPTY_FILTERS)}>{t("listings.filters.reset")}</Btn>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((p, i) => <PropertyCard key={p.id} p={p} delay={Math.min(i, 6) * 60} />)}</div>
        )}
        <div className="mt-10 hidden text-center lg:block"><Btn variant="ghost" className="px-6 py-3" onClick={() => navigate("home")}><ArrowLeft size={16} /> {t("listings.backHome")}</Btn></div>
      </div>
    </div>
  );
}

function DetailPage() {
  const { route, properties, favorites, toggleFavorite, navigate, back, user, openAuth, startConversation, reviews, i18n } = useApp();
  const { t } = useTranslation();
  const [remote, setRemote] = useState(null);
  const local = properties.find((x) => x.id === route.id);
  const p = local || (remote && remote.id === route.id ? remote : null);
  // Annonce hors liste (louée/vendue, ou ouverte depuis un profil) : chargée à la demande.
  useEffect(() => {
    if (!HAS_API || local || typeof route.id !== "string") return;
    PropertyAPI.get(route.id).then((r) => setRemote(fromApi(r.property))).catch(() => {});
  }, [route.id, !!local]);
  // Compteur de vues réel (une fois par annonce et par session de navigation).
  useEffect(() => {
    if (!HAS_API || typeof route.id !== "string") return;
    const key = "mr_seen_" + route.id;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* stockage indisponible */ }
    PropertyAPI.view(route.id).catch(() => {});
  }, [route.id]);
  const gallery = useMemo(() => (p ? galleryOf(p) : []), [p]);
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [route.id]);
  useEffect(() => {
    if (gallery.length < 2) return;
    const id = setInterval(() => setActive((a) => (a + 1) % gallery.length), 4000);
    return () => clearInterval(id);
  }, [gallery.length, route.id]);
  if (!p) return <div className="mx-auto max-w-3xl px-5 py-24 text-center"><p className="text-gray-500">{t("detail.notFound")}</p><Btn variant="ghost" className="mt-4 px-5 py-2.5" onClick={() => navigate("listings")}>{t("detail.viewListings")}</Btn></div>;

  const ll = landlordOf(p);
  const fav = favorites.includes(p.id);
  const agentId = agentOf(p);
  const agentReviews = typeof agentId === "string" ? [] : reviews.filter((r) => r.agentId === agentId);
  const agentRating = agentReviews.length ? agentReviews.reduce((s, r) => s + r.rating, 0) / agentReviews.length : 0;
  const contact = () => { if (!user) return openAuth(); Promise.resolve(startConversation(p)).then((cid) => cid && navigate("messages", { conv: cid })); };
  const similar = properties.filter((x) => x.id !== p.id && (x.type === p.type || x.cityKey === p.cityKey)).slice(0, 3);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-10">
        <button onClick={back} className="mr-inback mb-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-teal-700"><ArrowLeft size={16} /> {t("detail.back")}</button>
        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl bg-gray-100">
            <img alt={t(p.titleKey)} src={gallery[active]} className="h-[280px] w-full object-cover sm:h-[440px]" />
            {p.tagKey && <span className="absolute left-4 top-4 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow">{t(p.tagKey)}</span>}
            <span className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-teal-700 shadow backdrop-blur"><ShieldCheck size={14} /> {t("detail.verified")}</span>
            {gallery.length > 1 && (
              <>
                <span className="absolute bottom-4 right-4 rounded-full bg-gray-900/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">{active + 1}/{gallery.length}</span>
                <span className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {gallery.map((_, i) => (<span key={i} className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />))}
                </span>
              </>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-2">
            {gallery.slice(0, 4).map((g, i) => (
              <button key={i} onClick={() => setActive(i)} className={`relative h-20 overflow-hidden rounded-2xl ring-2 sm:h-[140px] lg:h-[212px] ${active === i ? "ring-teal-600" : "ring-transparent"}`}>
                <img alt={`${t(p.titleKey)} ${i + 1}`} src={g} className="h-full w-full object-cover" />
                {i === 3 && gallery.length > 4 && <span className="absolute inset-0 grid place-items-center bg-gray-900/50 text-sm font-bold text-white"><Maximize2 size={18} /></span>}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">{t(`types.${p.type}`)} · {t(p.rentalTypeKey)}</span>
                <StatusBadge status={p.status} className="ml-2" />
                <h1 className="mr-display mt-3 text-3xl font-extrabold text-gray-900">{t(p.titleKey)}</h1>
                <p className="mt-2 flex items-center gap-1.5 text-gray-500"><MapPin size={16} /> {p.neighborhood ? `${p.neighborhood}, ` : ""}{t(p.cityKey)}, {t("detail.inGuinea")}</p>
              </div>
              <button onClick={() => toggleFavorite(p.id)} className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${fav ? "bg-rose-500 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-rose-300"}`}><Heart size={16} fill={fav ? "currentColor" : "none"} /> {fav ? t("propertyCard.saved") : t("propertyCard.save")}</button>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {[[Bed, t("detail.bedrooms", { count: p.beds, countPlural: p.beds > 1 ? "s" : "" })], [Bath, t("detail.bathrooms", { count: p.baths, countPlural: p.baths > 1 ? "s" : "" })], [Square, t("detail.area", { area: p.area })]].map(([Ic, label], i) => (
                <div key={i} className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100"><Ic size={18} className="text-teal-600" /><span className="text-sm font-semibold text-gray-700">{label}</span></div>
              ))}
            </div>
            <ListingStats p={p} />
            <div className="mt-8">
              <h2 className="mr-display text-xl font-bold text-gray-900">{t("detail.description")}</h2>
              <p className="mt-3 leading-relaxed text-gray-600">{p.description || t("detail.defaultDescription", { type: t(`types.${p.type}`).toLowerCase(), area: p.area, location: p.neighborhood ? p.neighborhood + ", " : "", beds: p.beds, bedsPlural: p.beds > 1 ? "s" : "", baths: p.baths, bathsPlural: p.baths > 1 ? "s" : "", rentalType: t(p.rentalTypeKey).toLowerCase() })}</p>
            </div>
            {p.amenities && p.amenities.length > 0 && (
              <div className="mt-8">
                <h2 className="mr-display text-xl font-bold text-gray-900">{t("detail.amenities")}</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {p.amenities.map((a) => (<div key={a} className="flex items-center gap-2 text-sm text-gray-700"><span className="grid h-6 w-6 place-items-center rounded-full bg-teal-50 text-teal-700"><Check size={13} strokeWidth={3} /></span>{t(`amenities.${AMEN_KEYS[a]}`)}</div>))}
                </div>
              </div>
            )}
            {isShortP(p) && <ShortStayInfo p={p} />}
            <div className="mt-8 overflow-hidden rounded-3xl ring-1 ring-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-700"><MapPin size={16} className="text-teal-600" /> {p.neighborhood ? `${p.neighborhood}, ` : ""}{t(p.cityKey)}</div>
              <img alt={t("detail.mapAlt", { city: t(p.cityKey) })} src={url("photo-1524813686514-a57563d77965", 900)} className="h-48 w-full object-cover" />
            </div>
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            {/* Vente : MansaRent sert d'intermédiaire · Court séjour : réservation · Location : contact direct */}
            {isSaleP(p) ? <SaleContactCard p={p} /> : isShortP(p) ? <BookingWidget p={p} /> : (
            <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
              <div className="text-sm text-gray-500">{isSaleP(p) ? t("pro.salePrice") : t("detail.monthlyRent")}</div>
              <div className="mr-display mt-1 text-3xl font-extrabold text-teal-700">{formatGNF(p.price)}{!isSaleP(p) && <span className="text-base font-medium text-gray-400">{t("propertyCard.perMonth")}</span>}</div>
              <button onClick={() => agentId != null && navigate("agent", { id: agentId })} className={`mt-5 flex w-full items-center gap-3 border-t border-gray-100 pt-5 text-left ${agentId != null ? "" : "cursor-default"}`}>
                <span className="grid h-11 w-11 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">{ll.name.charAt(0)}</span>
                <div className="flex-1">
                  <div className="mr-display font-bold text-gray-900">{ll.name}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">{(p.ownerId == null || p.ownerVerified) && <BadgeCheck size={13} className="text-teal-600" />} {agentId != null ? `${t(ll.roleKey)}${p.ownerId == null || p.ownerVerified ? ` ${t("detail.verifiedAgent")}` : ""}` : t("detail.landlordVerified")}</div>
                  {!HAS_API && <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><span className="h-2 w-2 rounded-full bg-teal-500" />{t("shell.stats.lastActive", { when: relTime(Date.now() - statSeed(p.id).activeH * 3600000, i18n.language) })}</div>}
                </div>
                {agentId != null && agentReviews.length > 0 && <Stars value={agentRating} size={14} />}
              </button>
              <Btn variant="solid" className="mt-5 w-full py-3.5" onClick={contact}><MessageSquare size={18} /> {t("detail.sendMessage")}</Btn>
              <div className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl bg-amber-50 py-2.5 text-xs font-medium text-amber-700"><ShieldCheck size={13} /> {t("detail.protectedVisits")}</div>
            </div>
            )}
          </aside>
        </div>
        <div className="mt-12 border-t border-gray-100 pt-10"><ReviewsBlock propertyId={p.id} /></div>
        {similar.length > 0 && (
          <div className="mt-14">
            <h2 className="mr-display text-2xl font-extrabold text-gray-900">{t("detail.similar")}</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{similar.map((s) => <PropertyCard key={s.id} p={s} />)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const emptyForm = { title: "", type: "Maison", rentalType: "longStay", city: "Conakry", neighborhood: "", price: "", beds: "1", baths: "1", area: "", description: "", maxGuests: "2", minNights: "1", checkInTime: "14:00", checkOutTime: "11:00", houseRules: "" };

function PostPage() {
  const { addProperty, saveListing, navigate, showToast, user, openAuth, route, properties } = useApp();
  const { t } = useTranslation();
  const editId = route.editId || null;
  const isHotelUser = user?.role === "hotel";
  const [form, setForm] = useState(() => (isHotelUser ? { ...emptyForm, rentalType: "hotel", type: "Chambre", beds: "1", units: "1" } : { ...emptyForm }));
  const [photos, setPhotos] = useState([]); // [{ url }] en ligne · [{ file, preview }] à envoyer
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState("");
  // Modification d'une annonce existante : pré-remplissage depuis l'API.
  useEffect(() => {
    if (!HAS_API || !editId) return;
    const fill = (p) => setForm({
      title: p.title || "", type: p.type, rentalType: RENTAL_FROM_API[p.rentalType] || "longStay", city: p.city,
      neighborhood: p.neighborhood || "", price: String(p.hostPrice ?? p.price), beds: String(p.beds), baths: String(p.baths || 1),
      area: p.area ? String(p.area) : "", description: p.description || "",
      maxGuests: String(p.maxGuests || 2), minNights: String(p.minNights || 1), checkInTime: p.checkInTime || "14:00", checkOutTime: p.checkOutTime || "11:00", houseRules: p.houseRules || "", units: String(p.units || 1),
    });
    setPhotos((p.images || []).map((u) => ({ url: u })));
    const known = properties.find((x) => x.id === editId);
    if (known) fill(known);
    else PropertyAPI.get(editId).then((r) => fill(r.property)).catch(() => {});
  }, [editId]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inp = "w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm text-gray-800 ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";
  const sel = "mr-sel w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3 pr-9 text-sm text-gray-800 ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";
  const lab = "mb-1.5 block text-sm font-semibold text-gray-700";

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = t("post.errors.title");
    if (!form.price || Number(form.price) <= 0) e.price = t("post.errors.price");
    if (!form.city) e.city = t("post.errors.city");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) { showToast(t("post.errorToast")); return; }
    if (HAS_API) {
      const desc = form.description.trim();
      const kept = photos.filter((p) => p.url).map((p) => p.url);
      const fresh = photos.filter((p) => p.file).map((p) => p.file);
      setBusy(true); setServerErr("");
      try {
        let saved = await saveListing(editId, {
          title: form.title.trim(), type: form.type, rentalType: RENTAL_TO_API[form.rentalType], city: form.city,
          neighborhood: form.neighborhood.trim(), price: Number(form.price), beds: Number(form.beds), baths: Number(form.baths),
          area: Number(form.area) || 0, description: desc.length >= 10 ? desc : `${form.title.trim()} — ${t(`types.${form.type}`)}, ${form.neighborhood.trim() || t(`cities.${form.city}`)}.`,
          ...(["shortStay", "hotel"].includes(form.rentalType) ? {
            maxGuests: Number(form.maxGuests) || 2, minNights: Number(form.minNights) || 1,
            ...(form.rentalType === "hotel" ? { units: Math.max(1, Number(form.units) || 1) } : {}),
            checkInTime: form.checkInTime || null, checkOutTime: form.checkOutTime || null, houseRules: form.houseRules.trim() || null,
          } : {}),
          images: kept,
        });
        // Puis envoi des nouvelles photos (galerie / appareil photo).
        if (fresh.length) {
          const r = await PropertyAPI.uploadImages(saved.id, fresh);
          saved = await saveListing(null, null, r.property);
        }
        showToast(t(editId ? "pro.post.updated" : "post.successToast"));
        navigate("detail", { id: saved.id });
      } catch (e) { setServerErr(e.message); }
      setBusy(false);
      return;
    }
    const newP = addProperty({
      titleKey: form.title.trim(), type: form.type, rentalTypeKey: `rentalTypes.${form.rentalType}`, cityKey: `cities.${form.city}`,
      neighborhood: form.neighborhood.trim(), price: Number(form.price), beds: Number(form.beds),
      baths: Number(form.baths), area: Number(form.area) || 0, description: form.description.trim(),
      images: photos.length ? photos.map((p) => p.url || p.preview) : imgs(form.type, 1000),
      tagKey: "tags.new", featured: false,
      landlordInfo: { name: user?.name || t("landlordRoles.Propriétaire") },
    });
    showToast(t("post.successToast"));
    navigate("detail", { id: newP.id });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50/70">
        <div className="mx-auto max-w-md px-5 py-24 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal-50 text-teal-700"><User size={28} /></span>
          <h1 className="mr-display mt-5 text-2xl font-extrabold text-gray-900">{t("post.loginTitle")}</h1>
          <p className="mt-2 text-sm text-gray-500">{t("post.loginSubtitle")}</p>
          <Btn variant="solid" className="mt-6 px-6 py-3" onClick={openAuth}>{t("post.createAccount")}</Btn>
        </div>
      </div>
    );
  }
  const proGate = HAS_API && user.role !== "admin" && !(["agent", "landlord", "hotel"].includes(user.role) && user.verification === "approved");
  if (proGate) {
    const isPro = ["agent", "landlord", "hotel"].includes(user.role);
    return (
      <div className="min-h-screen bg-gray-50/70">
        <div className="mx-auto max-w-md px-5 py-24 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-50 text-amber-600"><ShieldCheck size={28} /></span>
          <h1 className="mr-display mt-5 text-2xl font-extrabold text-gray-900">{t(isPro ? "pro.post.gateVerifTitle" : "pro.post.gateRoleTitle")}</h1>
          <p className="mt-2 text-sm text-gray-500">{t(isPro ? `pro.post.gateVerif_${user.verification || "none"}` : "pro.post.gateRoleText")}</p>
          {isPro && <Btn variant="solid" className="mt-6 px-6 py-3" onClick={() => navigate(user.verification === "none" || user.verification === "rejected" ? "onboarding" : "dashboard")}>{t(user.verification === "none" || user.verification === "rejected" ? "pro.banner.noneCta" : "pro.dash.title")}</Btn>}
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50/70">
      <div className="mx-auto max-w-3xl px-5 py-10 lg:px-8 lg:py-14">
        <button onClick={() => navigate("home")} className="mr-inback mb-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-teal-700"><ArrowLeft size={16} /> {t("detail.back")}</button>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
          <SectionTag>{t("post.tag")}</SectionTag>
          <h1 className="mr-display mt-4 text-3xl font-extrabold text-gray-900">{editId ? t("pro.post.editTitle") : t("post.title")}</h1>
          <p className="mt-2 text-gray-600">{t("post.subtitle")}</p>
          <div className="mt-7 space-y-5">
            <div>
              <label className={lab}>{t("post.form.title")} *</label>
              <input className={`${inp} ${errors.title ? "ring-rose-400" : ""}`} placeholder={t("post.form.titlePlaceholder")} value={form.title} onChange={(e) => set("title", e.target.value)} />
              {errors.title && <p className="mt-1 text-xs text-rose-500">{errors.title}</p>}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label className={lab}>{t("post.form.type")}</label><select className={sel} value={form.type} onChange={(e) => set("type", e.target.value)}>{TYPES_KEYS.map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}</select></div>
              <div><label className={lab}>{t("post.form.rentalType")}</label><select className={sel} value={form.rentalType} onChange={(e) => set("rentalType", e.target.value)}>{LOCATIONS_KEYS.filter((rt) => (isHotelUser ? rt === "hotel" : rt !== "hotel" || user?.role === "admin")).map((rt) => <option key={rt} value={rt}>{t(`rentalTypes.${rt}`)}</option>)}</select></div>
              <div><label className={lab}>{t("post.form.city")} *</label><select className={`${sel} ${errors.city ? "ring-rose-400" : ""}`} value={form.city} onChange={(e) => set("city", e.target.value)}>{VILLES_KEYS.map((v) => <option key={v} value={v}>{t(`cities.${v}`)}</option>)}</select></div>
              <div><label className={lab}>{t("post.form.neighborhood")}</label><input className={inp} placeholder={t("post.form.neighborhoodPlaceholder")} value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} /></div>
            </div>
            <div className="grid gap-5 sm:grid-cols-4">
              <div className="sm:col-span-2"><label className={lab}>{form.rentalType === "sale" ? t("pro.salePrice") : form.rentalType === "hotel" ? t("deals.post.roomPrice") : form.rentalType === "shortStay" ? t("deals.post.price") : t("post.form.rent")} *</label><input type="number" className={`${inp} ${errors.price ? "ring-rose-400" : ""}`} placeholder={t("post.form.rentPlaceholder")} value={form.price} onChange={(e) => set("price", e.target.value)} />{errors.price && <p className="mt-1 text-xs text-rose-500">{errors.price}</p>}</div>
              <div><label className={lab}>{t("post.form.bedrooms")}</label><select className={sel} value={form.beds} onChange={(e) => set("beds", e.target.value)}>{[0, 1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
              <div><label className={lab}>{t("post.form.bathrooms")}</label><select className={sel} value={form.baths} onChange={(e) => set("baths", e.target.value)}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label className={lab}>{t("post.form.area")}</label><input type="number" className={inp} placeholder={t("post.form.areaPlaceholder")} value={form.area} onChange={(e) => set("area", e.target.value)} /></div>
            </div>
            {["shortStay", "hotel"].includes(form.rentalType) && <ShortStayFields form={form} set={set} lab={lab} inp={inp} sel={sel} hotel={form.rentalType === "hotel"} />}
            <div>
              <label className={lab}>{t("pro.photos.label")}</label>
              <PhotoPicker photos={photos} onChange={setPhotos} />
            </div>
            <div><label className={lab}>{t("post.form.description")}</label><textarea rows={4} className={inp} placeholder={t("post.form.descriptionPlaceholder")} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Btn variant="solid" className="flex-1 py-3.5" disabled={busy} onClick={submit}><Check size={18} /> {busy ? "…" : editId ? t("pro.post.save") : t("post.form.submit")}</Btn>
              <Btn variant="ghost" className="py-3.5 sm:px-6" onClick={() => navigate("home")}>{t("post.form.cancel")}</Btn>
            </div>
            {serverErr && <p className="text-center text-sm font-semibold text-rose-600">{serverErr}</p>}
            <p className="text-center text-xs text-gray-400">{t("post.form.terms")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FavoritesPage() {
  const { properties, favorites, navigate, setFilters, startConversation, user, openAuth, agents } = useApp();
  const { t } = useTranslation();
  const [tab, setTab] = useState("properties");
  const list = properties.filter((p) => favorites.includes(p.id));
  const contactAgent = (idx) => {
    if (!user) return openAuth();
    const p = properties.find((x) => agentOf(x) === idx);
    if (p) Promise.resolve(startConversation(p)).then((cid) => cid && navigate("messages", { conv: cid }));
    else navigate("agent", { id: idx });
  };
  return (
    <div className="min-h-screen bg-gray-50/70">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <button onClick={() => navigate("home")} className="mr-inback mb-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-teal-700"><ArrowLeft size={16} /> {t("detail.back")}</button>
        <h1 className="mr-display text-2xl font-extrabold text-gray-900 sm:text-3xl">{t("favorites.title")} <Heart className="ml-1 inline text-rose-500" size={22} fill="currentColor" /></h1>
        <div className="mt-5 flex gap-6 border-b border-gray-200">
          {(["properties", "agents"]).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`relative pb-3 text-sm font-bold ${tab === k ? "text-teal-700" : "text-gray-400 hover:text-gray-600"}`}>
              {t(`shell.favTabs.${k}`)}
              {tab === k && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-teal-700" />}
            </button>
          ))}
        </div>
        {tab === "agents" && HAS_API ? <div className="mt-3"><PeopleList mode="favorites" /></div> : tab === "agents" ? (
          <div className="mt-6 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100">
            {agents.map((a, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-gray-50 px-4 py-3.5 last:border-0">
                <button onClick={() => navigate("agent", { id: i })} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">{a.name.charAt(0)}</button>
                <button onClick={() => navigate("agent", { id: i })} className="min-w-0 flex-1 text-left"><span className="mr-display block truncate font-bold text-gray-900">{a.name}</span><span className="block truncate text-xs text-gray-500">{dispRole(a, t)} · {dispCity(a, t)}</span></button>
                <button onClick={() => contactAgent(i)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100" aria-label={t("detail.sendMessage")}><MessageSquare size={17} /></button>
              </div>
            ))}
          </div>
        ) : (
        <>
        <p className="mt-4 text-sm text-gray-500">{list.length} {t("favorites.empty")}</p>
        {list.length === 0 ? (
          <div className="mt-12 flex flex-col items-center rounded-3xl bg-white py-16 text-center ring-1 ring-gray-100">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-rose-400"><Heart size={28} /></span>
            <h3 className="mr-display mt-5 text-xl font-bold text-gray-900">{t("favorites.empty")}</h3>
            <p className="mt-2 max-w-sm text-sm text-gray-500">{t("favorites.emptyHint")}</p>
            <Btn variant="solid" className="mt-5 px-6 py-3" onClick={() => { setFilters(EMPTY_FILTERS); navigate("listings"); }}>{t("favorites.browse")}</Btn>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((p, i) => <PropertyCard key={p.id} p={p} delay={i * 60} />)}</div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

let gsiPromise = null;
function loadGsi() {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.google?.accounts?.id) return resolve(window.google);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gsiPromise;
}
function decodeJwt(token) {
  try {
    const p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(atob(p).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
const GoogleIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
);
function GoogleAuthButton() {
  const { login, showToast } = useApp();
  const { t } = useTranslation();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const ref = useRef(null);
  useEffect(() => {
    if (!clientId || !ref.current) return;
    let cancelled = false;
    loadGsi()
      .then((google) => {
        if (cancelled || !google?.accounts?.id) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => {
            if (HAS_API) {
              // Le backend vérifie le jeton Google puis ouvre une vraie session.
              AuthAPI.loginWithGoogle(resp.credential)
                .then((r) => { if (r.token) Session.set(r.token); login(r.user); })
                .catch(() => showToast(t("auth.googleError")));
              return;
            }
            const data = decodeJwt(resp.credential);
            if (data?.email) login({ name: data.name || data.email.split("@")[0], email: data.email, avatar: data.picture });
            else showToast(t("auth.googleError"));
          },
        });
        ref.current.innerHTML = "";
        google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", text: "continue_with", shape: "pill", width: 320 });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientId, login, showToast]);

  if (clientId) return <div className="flex justify-center" ref={ref} />;
  return (
    <button onClick={() => login({ name: t("auth.demoUser"), email: "demo@gmail.com" })} className="flex w-full items-center justify-center gap-2.5 rounded-full bg-white py-3 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50">
      <GoogleIcon /> {t("auth.continueGoogle")}
    </button>
  );
}

function AuthModal() {
  const { authOpen, authTab, closeAuth, login, loginWithPassword } = useApp();
  const { t } = useTranslation();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => { if (authOpen) { setTab(authTab === "register" ? "register" : "login"); setForm({ name: "", email: "", password: "" }); setError(""); setBusy(false); setForgot(authTab === "forgot"); setSent(false); } }, [authOpen]);
  if (!authOpen) return null;
  const sendReset = async () => {
    if (!form.email.trim()) return;
    setBusy(true); setError("");
    try { await AuthAPI.forgotPassword(form.email.trim()); setSent(true); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  if (forgot) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div onClick={closeAuth} className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
        <div className="relative w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
          <button onClick={closeAuth} className="absolute right-5 top-5 text-gray-400 hover:text-gray-700"><X size={20} /></button>
          <div className="flex justify-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white"><Lock size={22} /></span></div>
          <h2 className="mr-display mt-4 text-center text-2xl font-extrabold text-gray-900">{t("pro.reset.forgotTitle")}</h2>
          {sent ? (
            <p className="mt-4 rounded-2xl bg-teal-50 p-4 text-center text-sm text-teal-800 ring-1 ring-teal-100">{t("pro.reset.sent", { email: form.email.trim() })}</p>
          ) : (
            <>
              <p className="mt-1 text-center text-sm text-gray-500">{t("pro.reset.forgotSubtitle")}</p>
              <div className="relative mt-5"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input autoFocus className="w-full rounded-xl border-0 bg-gray-50 py-3 pl-10 pr-3 text-sm text-gray-800 ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder={t("auth.email")} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && sendReset()} /></div>
              <Btn variant="solid" className="mt-4 w-full py-3.5" disabled={busy || !form.email.trim()} onClick={sendReset}>{busy ? "…" : t("pro.reset.sendLink")}</Btn>
              {error !== "" && <p className="mt-3 text-center text-xs font-semibold text-rose-600">{error}</p>}
            </>
          )}
          <button onClick={() => { setForgot(false); setSent(false); }} className="mt-4 w-full text-center text-sm font-semibold text-teal-700 hover:underline">{t("pro.reset.backToLogin")}</button>
        </div>
      </div>
    );
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inp = "w-full rounded-xl border-0 bg-gray-50 py-3 pl-10 pr-3 text-sm text-gray-800 ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";
  const submit = async () => {
    setError("");
    if (!form.email.trim() || !form.password) return;
    if (import.meta.env.VITE_API_URL && tab === "register") {
      setBusy(true);
      try {
        const r = await AuthAPI.register({ name: form.name.trim() || form.email.split("@")[0], email: form.email.trim(), password: form.password });
        if (r.token) Session.set(r.token);
        login(r.user);
      } catch (e) { setError(e.message); }
      setBusy(false);
      return;
    }
    setBusy(true);
    const res = await loginWithPassword(form.email, form.password, tab === "register" ? form.name : "");
    setBusy(false);
    if (!res.ok && res.error !== "…") setError(res.error);
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div onClick={closeAuth} className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <button onClick={closeAuth} className="absolute right-5 top-5 text-gray-400 hover:text-gray-700"><X size={20} /></button>
        <div className="flex justify-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white"><Home size={22} /></span></div>
        <h2 className="mr-display mt-4 text-center text-2xl font-extrabold text-gray-900">{tab === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</h2>
        <p className="mt-1 text-center text-sm text-gray-500">{tab === "login" ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}</p>
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
          {[["login", t("auth.loginTab")], ["register", t("auth.registerTab")]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-lg py-2 text-sm font-semibold transition ${tab === k ? "bg-white text-teal-700 shadow-sm" : "text-gray-500"}`}>{l}</button>
          ))}
        </div>
        {/* Avec backend, le bouton Google n'apparaît que si un Client ID est configuré (sinon ce serait une fausse connexion). */}
        {(!HAS_API || import.meta.env.VITE_GOOGLE_CLIENT_ID) && (
          <>
            <div className="mt-5"><GoogleAuthButton /></div>
            <div className="my-4 flex items-center gap-3 text-xs font-medium text-gray-400"><span className="h-px flex-1 bg-gray-200" /> {t("auth.orEmail")} <span className="h-px flex-1 bg-gray-200" /></div>
          </>
        )}
        {HAS_API && !import.meta.env.VITE_GOOGLE_CLIENT_ID && <div className="mt-5" />}
        <div className="space-y-3">
          {tab === "register" && (<div className="relative"><User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input className={inp} placeholder={t("auth.fullName")} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>)}
          <div className="relative"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input className={inp} autoCapitalize="none" placeholder={HAS_API && tab === "login" ? t("pro.reset.emailOrUsername") : t("auth.email")} value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
          <div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" className={inp} placeholder={t("auth.password")} value={form.password} onChange={(e) => set("password", e.target.value)} /></div>
        </div>
        {HAS_API && <button onClick={() => { setForgot(true); setError(""); }} className="mt-2 block w-full text-right text-xs font-semibold text-teal-700 hover:underline">{t(tab === "login" ? "pro.reset.forgotLink" : "pro.reset.haveAccount")}</button>}
        <Btn variant="solid" className="mt-5 w-full py-3.5" onClick={submit} disabled={busy}>{tab === "login" ? t("auth.login") : t("auth.register")}</Btn>
        {error !== "" && <p className="mt-3 text-center text-xs font-semibold text-rose-600">{error}</p>}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400"><BadgeCheck size={12} /> {t("auth.freeNote")}</p>
      </div>
    </div>
  );
}

function Stars({ value = 0, size = 16, className = "" }) {
  const full = Math.round(value);
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= full ? "text-amber-500" : "text-gray-300"} fill={i <= full ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

function StarInput({ value, onChange, size = 28 }) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button type="button" key={i} onClick={() => onChange(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} className="transition-transform hover:scale-110" aria-label={t("reviews.stars", { count: i, countPlural: i > 1 ? "s" : "" })}>
          <Star size={size} className={(hover || value) >= i ? "text-amber-500" : "text-gray-300"} fill={(hover || value) >= i ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function ReviewsBlock({ propertyId = null, agentId = null }) {
  const { reviews, addReview, user, openAuth, showToast } = useApp();
  const { t } = useTranslation();
  // Annonces / agents réels (identifiants texte) → avis stockés côté serveur.
  const remote = HAS_API && (typeof propertyId === "string" || typeof agentId === "string");
  const [remoteList, setRemoteList] = useState([]);
  const [err, setErr] = useState("");
  const loadRemote = () => ReviewAPI.list(propertyId != null ? { propertyId } : { agentId })
    .then((r) => setRemoteList((r.reviews || []).map((x) => ({ ...x, ts: toMs(x.createdAt) }))))
    .catch(() => {});
  useEffect(() => { if (remote) loadRemote(); }, [remote, propertyId, agentId]);
  const list = useMemo(
    () => (remote ? remoteList : reviews.filter((r) => (propertyId != null ? r.propertyId === propertyId : r.agentId === agentId)).sort((a, b) => b.ts - a.ts)),
    [remote, remoteList, reviews, propertyId, agentId]
  );
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const submit = async () => {
    if (!user) return openAuth();
    if (!rating) return;
    setErr("");
    if (remote) {
      try {
        await ReviewAPI.create({ propertyId: propertyId ?? undefined, agentId: agentId ?? undefined, rating, text: text.trim() });
        showToast(t("toast.reviewAdded"));
        loadRemote();
      } catch (e) { setErr(e.message); return; }
    } else {
      addReview({ propertyId, agentId, rating, text: text.trim() });
    }
    setRating(0);
    setText("");
  };
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="mr-display text-xl font-bold text-gray-900">{t("reviews.title")}</h2>
        {list.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="mr-display text-2xl font-extrabold text-gray-900">{avg.toFixed(1)}</span>
            <Stars value={avg} />
            <span className="text-gray-400">({list.length})</span>
          </div>
        )}
      </div>
      <div className="mt-5 rounded-3xl bg-gray-50 p-5 ring-1 ring-gray-100">
        {user ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold text-gray-700">{t("reviews.yourRating")}</span>
              <StarInput value={rating} onChange={setRating} />
            </div>
            <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("reviews.shareExperience")} className="mt-3 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm text-gray-800 ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <div className="mt-3 flex items-center justify-end gap-3">
              {err && <span className="text-xs font-semibold text-rose-600">{err}</span>}
              <Btn variant="solid" className="px-5 py-2.5 text-sm" onClick={submit} disabled={!rating}><Star size={15} /> {t("reviews.publish")}</Btn>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="text-sm text-gray-600">{t("reviews.loginPrompt")}</p>
            <Btn variant="ghost" className="px-5 py-2.5 text-sm" onClick={openAuth}>{t("auth.login")}</Btn>
          </div>
        )}
      </div>
      {list.length > 0 && (
        <div className="mt-5 space-y-4">
          {list.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={r.author} src={r.authorAvatar} size={36} />
                  <div><div className="mr-display font-bold text-gray-900">{r.author}</div><div className="text-xs text-gray-400">{fmtDate(r.ts)}</div></div>
                </div>
                <Stars value={r.rating} />
              </div>
              {r.textKey ? <p className="mt-3 text-sm text-gray-600">{t(r.textKey)}</p> : r.text ? <p className="mt-3 text-sm text-gray-600">{r.text}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Étiquette d'une conversation de vente (l'acheteur et l'agent ne se voient jamais).
const convChip = (c, t) => {
  if (c.kind === "sale") return c.myRole === "admin" ? t("deals.chat.buyerLead", { status: t(`deals.lead.status.${c.leadStatus || "new"}`) }) : t("deals.chat.advisor");
  if (c.kind === "agent") return c.myRole === "admin" ? t("deals.chat.agentLead") : t("deals.chat.team");
  return null;
};

function MessagesPage() {
  const { conversations, sendMessage, markConversationRead, loadMessages, route, navigate, user, openAuth, notifications } = useApp();
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(route.conv || conversations[0]?.id || null);
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState("chat");
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const endRef = useRef(null);
  useEffect(() => { if (route.conv) setActiveId(route.conv); }, [route.conv]);
  const active = conversations.find((c) => c.id === activeId) || null;
  useEffect(() => { if (activeId) markConversationRead(activeId); }, [activeId, conversations.length, active?.unread]);
  // Messages réels : chargés à l'ouverture puis rafraîchis toutes les 5 s.
  useEffect(() => {
    if (!HAS_API || !activeId || String(activeId).startsWith("conv-")) return;
    loadMessages(activeId);
    const timer = setInterval(() => loadMessages(activeId), 5000);
    return () => clearInterval(timer);
  }, [activeId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages.length]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50/70">
        <div className="mx-auto max-w-md px-5 py-24 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal-50 text-teal-700"><MessageSquare size={28} /></span>
          <h1 className="mr-display mt-5 text-2xl font-extrabold text-gray-900">{t("messages.loginTitle")}</h1>
          <p className="mt-2 text-sm text-gray-500">{t("messages.loginSubtitle")}</p>
          <Btn variant="solid" className="mt-6 px-6 py-3" onClick={openAuth}>{t("messages.loginRegister")}</Btn>
        </div>
      </div>
    );
  }

  const send = () => { if (!draft.trim()) return; sendMessage(activeId, draft); setDraft(""); };

  return (
    <div className="min-h-screen overflow-x-clip bg-gray-50/70">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-5 py-8 lg:px-8 lg:py-12">
        <h1 className="mr-display text-2xl font-extrabold text-gray-900 sm:text-3xl">{t("messages.title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("messages.subtitle")}</p>
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-gray-100 p-1">
          {(["chat", "notifs"]).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold transition ${tab === k ? "bg-teal-700 text-white shadow" : "text-gray-500 hover:text-gray-700"}`}>
              {t(`shell.notifs.${k}`)}
              {k === "notifs" && unreadNotifs > 0 && <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-extrabold ${tab === k ? "bg-amber-500 text-teal-900" : "bg-amber-500 text-teal-900"}`}>{unreadNotifs}</span>}
            </button>
          ))}
        </div>
        {tab === "notifs" ? <NotificationsList /> : (
        <>
        {conversations.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-3xl bg-white py-16 text-center ring-1 ring-gray-100">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-teal-50 text-teal-700"><MessageSquare size={28} /></span>
            <h3 className="mr-display mt-5 text-xl font-bold text-gray-900">{t("messages.empty")}</h3>
            <p className="mt-2 max-w-sm text-sm text-gray-500">{t("messages.emptyHint")}</p>
            <Btn variant="solid" className="mt-5 px-6 py-3" onClick={() => navigate("listings")}>{t("messages.browseListings")}</Btn>
          </div>
        ) : (
          <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className={`min-w-0 rounded-3xl bg-white p-2 ring-1 ring-gray-100 ${activeId ? "hidden lg:block" : "block"}`}>
              {conversations.map((c) => (
                <button key={c.id} onClick={() => setActiveId(c.id)} className={`flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${activeId === c.id ? "bg-teal-50" : "hover:bg-gray-50"}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">{c.agentName.charAt(0)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="mr-display min-w-0 truncate font-bold text-gray-900">{c.agentName}</span>{c.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />}</span>
                    {convChip(c, t) && <span className="mt-0.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">{convChip(c, t)}</span>}
                    {c.propertyTitle && HAS_API && <span className="block truncate text-[11px] font-semibold text-teal-700">{c.propertyTitle}</span>}
                    <span className="block truncate text-xs text-gray-500">{c.messages[c.messages.length - 1]?.text || c.lastText}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className={`h-[calc(100dvh-330px)] max-h-[600px] min-h-[430px] min-w-0 flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100 lg:h-[560px] lg:max-h-none ${activeId ? "flex" : "hidden lg:flex"}`}>
              {active ? (
                <>
                  <div className="flex min-w-0 items-center gap-2.5 border-b border-gray-100 px-4 py-3.5 sm:px-5 sm:py-4">
                    <button onClick={() => setActiveId(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-gray-500 ring-1 ring-gray-200 hover:text-teal-700 lg:hidden" aria-label={t("detail.back")}><ArrowLeft size={17} /></button>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">{active.agentName.charAt(0)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mr-display flex min-w-0 items-center gap-2"><span className="truncate font-bold text-gray-900">{active.agentName}</span>{convChip(active, t) && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">{convChip(active, t)}</span>}</div>
                      <button onClick={() => navigate("detail", { id: active.propertyId })} className="block w-full max-w-full truncate text-left text-xs text-teal-700 hover:underline">{t("messages.about", { title: active.propertyTitle })}</button>
                    </div>
                    <span className="hidden shrink-0 items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 sm:flex"><ShieldCheck size={12} /> {t("messages.verified")}</span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-gray-50/60 px-4 py-5 sm:px-5">
                    {HAS_API && active.messages.length === 0 && <p className="py-6 text-center text-xs text-gray-400">{t("pro.chat.startHint")}</p>}
                    {active.messages.map((m) => (
                      <div key={m.id} className={`flex min-w-0 ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                        <div className={`min-w-0 max-w-[85%] break-words text-sm [overflow-wrap:anywhere] rounded-2xl px-4 py-2.5 sm:max-w-[78%] ${m.from === "me" ? "bg-teal-700 text-white" : "bg-white text-gray-700 ring-1 ring-gray-100"} ${m.pending ? "opacity-60" : ""}`}>{m.text}{m.ts && HAS_API && <span className={`mt-1 block text-[10px] ${m.from === "me" ? "text-white/70" : "text-gray-400"}`}>{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}</div>
                      </div>
                    ))}
                    <div ref={endRef} />
                  </div>
                  <div className="flex items-center gap-2 border-t border-gray-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={t("messages.typeMessage")} className="min-w-0 flex-1 rounded-full border-0 bg-gray-50 px-4 py-3 text-sm ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    <button onClick={send} disabled={!draft.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-700 text-white transition hover:bg-teal-800 disabled:opacity-50" aria-label={t("messages.send")}><Send size={18} /></button>
                  </div>
                </>
              ) : (
                <div className="grid flex-1 place-items-center p-6 text-center text-sm text-gray-400">{t("messages.selectConversation")}</div>
              )}
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

function AgentProfilePage() {
  const { route } = useApp();
  if (HAS_API && typeof route.id === "string") return <ProPublicProfile id={route.id} />;
  return <DemoAgentProfile />;
}

function DemoAgentProfile() {
  const { route, properties, navigate, reviews, agents } = useApp();
  const { t } = useTranslation();
  const id = route.id;
  const agent = agents[id];
  const listings = properties.filter((p) => agentOf(p) === id);
  const agentReviews = reviews.filter((r) => r.agentId === id);
  const avg = agentReviews.length ? agentReviews.reduce((s, r) => s + r.rating, 0) / agentReviews.length : 0;
  if (!agent) return <div className="mx-auto max-w-2xl px-5 py-24 text-center text-gray-500">{t("agent.notFound")}</div>;
  return (
    <div className="min-h-screen bg-gray-50/70">
      <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-12">
        <button onClick={() => navigate("listings")} className="mr-inback mb-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-teal-700"><ArrowLeft size={16} /> {t("detail.back")}</button>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-teal-600 to-teal-800 text-2xl font-extrabold text-white">{agent.name.charAt(0)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2"><h1 className="mr-display text-2xl font-extrabold text-gray-900">{agent.name}</h1><BadgeCheck size={20} className="text-teal-600" /></div>
              <p className="mt-1 text-sm text-gray-500">{dispRole(agent, t)} · {dispCity(agent, t)} · {t("agent.memberSince", { year: agent.since })}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2"><Stars value={avg} /> <span className="text-sm font-semibold text-gray-700">{avg ? avg.toFixed(1) : "—"}</span> <span className="text-sm text-gray-400">({agentReviews.length} {t("agent.reviews")})</span></span>
                <span className="text-gray-300">·</span>
                <span className="text-sm font-semibold text-teal-700">{listings.length} {t("agent.listings", { countPlural: listings.length > 1 ? "s" : "" })}</span>
              </div>
              {dispBio(agent, t) && <p className="mt-3 max-w-xl text-sm text-gray-600">{dispBio(agent, t)}</p>}
            </div>
          </div>
        </div>
        {listings.length > 0 && (
          <div className="mt-8">
            <h2 className="mr-display text-xl font-bold text-gray-900">{t("agent.listingsTitle")}</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{listings.map((p, i) => <PropertyCard key={p.id} p={p} delay={i * 60} />)}</div>
          </div>
        )}
        <div className="mt-10"><ReviewsBlock agentId={id} /></div>
      </div>
    </div>
  );
}

function Footer() {
  const { navigate, setFilters } = useApp();
  const { t } = useTranslation();
  const cols = [
    { h: t("footer.company"), links: [["footer.companyLinks.about", () => navigate("home", { anchor: "apropos" })], ["footer.companyLinks.contact", () => navigate("home", { anchor: "contact" })], ["footer.companyLinks.agents", () => navigate("home", { anchor: "agents" })], ["footer.companyLinks.publish", () => navigate("post")]] },
    { h: t("footer.tenants"), links: [["footer.tenantsLinks.search", () => { setFilters(EMPTY_FILTERS); navigate("listings"); }], ["footer.tenantsLinks.shortStay", () => { setFilters({ ...EMPTY_FILTERS, rental: "shortStay" }); navigate("listings"); }], ["footer.tenantsLinks.longStay", () => { setFilters({ ...EMPTY_FILTERS, rental: "longStay" }); navigate("listings"); }], ["footer.tenantsLinks.messages", () => navigate("messages")], ["footer.tenantsLinks.favorites", () => navigate("favorites")]] },
    { h: t("footer.legal"), links: [["footer.legalLinks.terms", () => {}], ["footer.legalLinks.privacy", () => {}], ["footer.legalLinks.cookies", () => {}], ["footer.legalLinks.trust", () => {}]] },
  ];
  const socials = [{ Icon: Facebook, label: t("footer.social.facebook") }, { Icon: Instagram, label: t("footer.social.instagram") }, { Icon: TikTok, label: t("footer.social.tiktok") }];
  return (
    <footer id="contact" className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-xs text-sm text-gray-400">{t("footer.description")}</p>
            <p className="mr-display mt-4 text-sm font-bold uppercase tracking-[0.2em] text-amber-500">{t("footer.slogan")}</p>
            <button onClick={() => { setFilters(EMPTY_FILTERS); navigate("listings"); }} className="mt-5 inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"><Search size={16} /> {t("footer.browseListings")}</button>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <h4 className="mr-display font-bold text-white">{c.h}</h4>
              <ul className="mt-4 space-y-2.5">{c.links.map(([key, fn]) => (<li key={key}><button onClick={fn} className="text-sm text-gray-400 transition hover:text-amber-400">{t(key)}</button></li>))}</ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-7 sm:flex-row">
          <p className="text-sm text-gray-500">{t("footer.rights")}</p>
          <div className="flex gap-3">{socials.map(({ Icon, label }) => (<a key={label} href="#" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-gray-300 transition hover:bg-teal-600 hover:text-white"><Icon size={18} /></a>))}</div>
        </div>
      </div>
    </footer>
  );
}

// ---------------- PWA app shell (mobile-first, Mansa palette) ----------------
function ListingStats({ p }) {
  const { t, i18n } = useTranslation();
  const real = typeof p.id === "string";
  const seed = statSeed(p.id);
  const daysOn = real && p.createdTs ? Math.max(1, Math.ceil((Date.now() - p.createdTs) / DAY)) : seed.daysOn;
  const s = real ? { views: p.views ?? 0, saves: p.favoritesCount ?? 0, daysOn } : seed;
  const updatedTs = real ? toMs(p.updatedAt) || p.createdTs || Date.now() : Date.now() - Math.max(1, s.daysOn - 1) * DAY;
  const items = [
    [Eye, `${s.views}`, t("shell.stats.views")],
    [Heart, `${s.saves}`, t("shell.stats.saves")],
    [Clock, `${s.daysOn}`, t("shell.stats.daysOn")],
    [History, relTime(updatedTs, i18n.language), t("shell.stats.updated")],
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([Ic, val, label], i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-2xl bg-gray-50 px-3.5 py-3 ring-1 ring-gray-100">
          <Ic size={17} className="shrink-0 text-teal-600" />
          <span className="min-w-0"><span className="block truncate text-sm font-extrabold text-gray-900">{val}</span><span className="block truncate text-[11px] font-medium text-gray-500">{label}</span></span>
        </div>
      ))}
    </div>
  );
}

function NotifIcon({ kind }) {
  const map = {
    message: ["bg-teal-600", <MessageSquare key="i" size={17} />],
    price: ["bg-teal-500", <TrendingUp key="i" size={17} />],
    heart: ["bg-rose-500", <Heart key="i" size={17} />],
    eye: ["bg-amber-500", <Eye key="i" size={17} />],
    account: ["bg-gray-500", <Settings key="i" size={17} />],
  };
  const [bg, ic] = map[kind] || map.message;
  return <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${bg} text-white`}>{ic}</span>;
}

// ---- Bandeau d'annonce piloté par l'admin (GET /api/settings) ----
function AnnouncementBar() {
  const { siteSettings } = useApp();
  const { i18n } = useTranslation();
  const [closed, setClosed] = useState(false);
  const a = siteSettings?.announcement;
  const text = a && (i18n.language === "fr" ? a.textFr : a.textEn);
  if (!a?.enabled || !text || closed) return null;
  return (
    <div className="bg-teal-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs font-semibold">
        <Sparkles size={14} className="shrink-0 text-amber-400" />
        <span className="min-w-0 flex-1 truncate">{text}</span>
        <button onClick={() => setClosed(true)} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label="Fermer"><X size={13} /></button>
      </div>
    </div>
  );
}

// ---- Formulaire de connexion compact (dropdown profil) ----
function LoginForm({ onDone }) {
  const { loginWithPassword, openAuth } = useApp();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true); setError("");
    const res = await loginWithPassword(email, password);
    setBusy(false);
    if (res.ok) { onDone && onDone(); }
    else if (res.error !== "…") setError(res.error);
  };
  const inp = "w-full rounded-xl border-0 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";
  return (
    <div>
      <div className="space-y-2.5">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={HAS_API ? t("pro.reset.emailOrUsername") : t("auth.email")} autoCapitalize="none" className={inp} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder={t("auth.password")} className={inp} />
      </div>
      {error !== "" && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
      <Btn variant="solid" className="mt-3 w-full py-2.5 text-sm" disabled={busy} onClick={submit}>{t("auth.login")}</Btn>
      {HAS_API && <button onClick={() => { onDone && onDone(); openAuth("forgot"); }} className="mt-2 w-full text-center text-xs font-semibold text-gray-500 hover:text-teal-700 hover:underline">{t("pro.reset.forgotLink")}</button>}
      <button onClick={() => { onDone && onDone(); openAuth("register"); }} className="mt-2 w-full text-center text-xs font-bold text-teal-700 hover:underline">{t("auth.registerTab")}</button>
    </div>
  );
}

// Page d'accueil : sur ordinateur, la page de présentation ;
// sur téléphone (site mobile ou appli), directement les annonces disponibles.
const IS_PHONE = (() => { try { return window.matchMedia("(max-width: 1023px)").matches; } catch { return false; } })();
const START_PAGE = APP_MODE || IS_PHONE ? "listings" : "home";

// Pages « racine » (onglets) : pas de flèche retour dans l'app.
const TAB_ROOTS = ["home", "listings", "favorites", "discover", "messages", "profile"];
const APP_TITLES = {
  detail: "app.title.detail", post: "nav.postListing", agent: "app.title.agent",
  onboarding: "app.title.onboarding", dashboard: "pro.dash.title", ranking: "pro.rank.title", reset: "app.title.reset",
  editProfile: "app.title.editProfile", admin: "shell.admin.title", bookings: "app.title.bookings", paymentReturn: "app.title.payment",
};

function TopBar() {
  const { user, navigate, openAuth, logout, i18n, setFilters, route, back } = useApp();
  const { t } = useTranslation();
  const inner = APP_MODE && !TAB_ROOTS.includes(route.name);
  const [open, setOpen] = useState(false);
  const [profOpen, setProfOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const goGroup = (fn) => {
    const r = fn();
    if (r.reset) setFilters(EMPTY_FILTERS);
    if (r.preset) setFilters(r.preset);
    navigate(r.name, r.anchor ? { anchor: r.anchor } : {});
    setOpen(false);
  };
  return (
    <>
      <header className="sticky top-0 z-40 overflow-hidden border-b border-gray-100 bg-white/95 backdrop-blur-md lg:hidden" style={APP_MODE ? { paddingTop: "env(safe-area-inset-top)" } : undefined}>
        {inner ? (
          <div className="flex items-center gap-2 px-2 py-2">
            <button onClick={back} aria-label={t("app.title.back")} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gray-800 hover:bg-gray-50"><ArrowLeft size={22} /></button>
            <span className="mr-display min-w-0 flex-1 truncate text-center text-base font-extrabold text-gray-900">{t(APP_TITLES[route.name] || "app.title.detail")}</span>
            <span className="h-10 w-10 shrink-0" />
          </div>
        ) : (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={() => setProfOpen(true)} aria-label={t("shell.tabs.profile")} className="shrink-0">
            {user ? <Avatar name={user.name} src={user.avatar} size={34} /> : <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-teal-50 text-teal-700"><CircleUserRound size={22} /></span>}
          </button>
          <span className="flex min-w-0 flex-1 justify-center"><Logo compact /></span>
          <button onClick={() => setOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gray-700 ring-1 ring-gray-200" aria-label={t("nav.menu")}><Menu size={20} /></button>
        </div>
        )}
      </header>
      {profOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div onClick={() => setProfOpen(false)} className="absolute inset-0 bg-gray-900/40" />
          <div style={{ top: "calc(env(safe-area-inset-top) + 12px)" }} className="absolute left-3 top-3 w-72 rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
              <span className="mr-display text-sm font-extrabold text-gray-900">{t("shell.tabs.profile")}</span>
              <button onClick={() => setProfOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl text-gray-500 hover:bg-gray-50" aria-label={t("nav.close")}><X size={18} /></button>
            </div>
            {user ? (
              <div className="mt-2">
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
                  <Avatar name={user.name} src={user.avatar} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="mr-display truncate text-sm font-extrabold text-gray-900">{user.name}</div>
                    <div className="truncate text-xs text-gray-500">{user.email}</div>
                    {user.role === "admin" && <span className="mt-1 inline-block rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-extrabold text-white">ADMIN</span>}
                  </div>
                </div>
                {[
                  ["profile", t("shell.tabs.profile"), () => navigate("profile")],
                  ...(HAS_API && ["agent", "landlord", "hotel"].includes(user.role) ? [["dashboard", t("pro.dash.title"), () => navigate("dashboard")]] : []),
                  ...(HAS_API ? [["ranking", t("pro.rank.title"), () => navigate("ranking")]] : []),
                  ...(user.role === "admin" ? [["admin", t("shell.admin.title"), () => navigate("admin")]] : []),
                ].map(([k, label, fn]) => (
                  <button key={k} onClick={() => { fn(); setProfOpen(false); }} className="mt-1 flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-bold text-gray-700 hover:bg-teal-50 hover:text-teal-700">{label}<ChevronRight size={16} className="text-gray-300" /></button>
                ))}
                <button onClick={() => { logout(); setProfOpen(false); }} className="mt-1 flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"><LogOut size={16} /> {t("shell.profile.signOut")}</button>
              </div>
            ) : (
              <div className="mt-3"><LoginForm onDone={() => setProfOpen(false)} /></div>
            )}
          </div>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div onClick={() => setOpen(false)} className="absolute inset-0 bg-gray-900/40" />
          <div style={{ top: "calc(env(safe-area-inset-top) + 12px)" }} className="absolute right-3 top-3 max-h-[80dvh] w-64 overflow-y-auto rounded-3xl bg-white p-2 shadow-2xl ring-1 ring-gray-100">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="mr-display text-sm font-extrabold text-gray-900">MansaRent</span>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl text-gray-500 hover:bg-gray-50" aria-label={t("nav.close")}><X size={18} /></button>
            </div>
            {NAV_GROUPS.map((g) => (
              <div key={g.key}>
                {g.children ? (
                  <>
                    <div className="flex w-full items-center gap-1 rounded-2xl hover:bg-teal-50">
                      <button onClick={() => goGroup(g.action)} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:text-teal-700">{t(g.key)}</button>
                      <button onClick={() => setExpanded(expanded === g.key ? null : g.key)} aria-label={t(g.key)} aria-expanded={expanded === g.key} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gray-400 hover:text-teal-700">
                        <ChevronDown size={17} className={`transition-transform duration-200 ${expanded === g.key ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                    <div className={`grid transition-all duration-200 ${expanded === g.key ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="overflow-hidden">
                        <div className="ml-4 flex flex-col border-l-2 border-teal-100 pl-2">
                          {g.children.map(([ck, cfn]) => (
                            <button key={ck} onClick={() => goGroup(cfn)} className="flex w-full items-center rounded-2xl px-3 py-2.5 text-left text-[13px] font-semibold text-gray-600 hover:bg-teal-50 hover:text-teal-700">{t(ck)}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <button onClick={() => goGroup(g.action)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-teal-50 hover:text-teal-700">{t(g.key)}</button>
                )}
              </div>
            ))}
            <div className="mx-3 my-2 border-t border-gray-100" />
            {[
              ["post", <Plus key="i" size={17} />, t("nav.postListing")],
              ["discover", <Users key="i" size={17} />, t("shell.discover.findAgent")],
            ].map(([name, ic, label]) => (
              <button key={name} onClick={() => { navigate(name); setOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-teal-50 hover:text-teal-700"><span className="text-teal-600">{ic}</span>{label}</button>
            ))}
            <div className="mx-3 my-2 border-t border-gray-100" />
            <div className="flex items-center gap-2 px-3 py-2">
              {(["fr", "en"]).map((l) => (
                <button key={l} onClick={() => i18n.changeLanguage(l)} className={`flex-1 rounded-xl py-2 text-xs font-bold ${i18n.language === l ? "bg-teal-700 text-white" : "bg-gray-50 text-gray-600"}`}>{l.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={() => { navigate("home", { anchor: "contact" }); setOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-teal-50 hover:text-teal-700"><span className="text-teal-600"><LifeBuoy size={17} /></span>{t("shell.menu.help")}</button>
          </div>
        </div>
      )}
    </>
  );
}

function BottomNav() {
  const { route, navigate, favorites, conversations, notifications } = useApp();
  const { t } = useTranslation();
  const unreadMsg = conversations.filter((c) => c.unread).length + notifications.filter((n) => !n.read).length;
  const tabs = [
    ["search", "listings", <Search key="i" size={21} />, t("shell.tabs.search"), ["listings", "detail", "home"]],
    ["favorites", "favorites", <Heart key="i" size={21} />, t("shell.tabs.favorites"), ["favorites"]],
    ["discover", "discover", <Compass key="i" size={21} />, t("shell.tabs.discover"), ["discover", "agent"]],
    ["messages", "messages", <MessageSquare key="i" size={21} />, t("shell.tabs.messages"), ["messages"]],
    ["profile", "profile", <CircleUserRound key="i" size={21} />, t("shell.tabs.profile"), ["profile", "post", "bookings"]],
  ];
  return (
    // Barre d'onglets flottante : pilule détachée du bord, l'onglet actif s'élargit (icône + nom).
    <nav className="mr-bottomnav pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3 lg:hidden" style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
      <div className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-1 rounded-full bg-white/95 p-1.5 shadow-[0_10px_30px_-8px_rgba(15,60,45,0.35)] ring-1 ring-black/5 backdrop-blur-md">
        {tabs.map(([key, target, ic, label, match]) => {
          const active = match.includes(route.name);
          const badge = key === "favorites" ? favorites.length : key === "messages" ? unreadMsg : 0;
          return (
            <button key={key} onClick={() => navigate(target)} aria-label={label} aria-current={active ? "page" : undefined}
              className={`relative flex h-12 items-center justify-center gap-2 rounded-full transition-all duration-300 ease-out ${active ? "flex-[1.9] bg-teal-700 px-4 text-white shadow-md shadow-teal-700/30" : "flex-1 text-gray-400 hover:text-teal-700"}`}>
              <span className="relative shrink-0">{ic}{badge > 0 && <span className={`absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold ring-2 ${active ? "bg-amber-400 text-teal-900 ring-teal-700" : "bg-amber-500 text-teal-900 ring-white"}`}>{badge > 9 ? "9+" : badge}</span>}</span>
              {active && <span className="truncate text-[13px] font-bold">{label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function BecomeAgent() {
  const { registerAgent, navigate } = useApp();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", city: "Conakry", role: "agent", bio: "" });
  const [err, setErr] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const inp = "w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm text-gray-800 ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";
  const lab = "mb-1.5 block text-sm font-semibold text-gray-700";
  const submit = () => {
    if (!f.name.trim() || !f.phone.trim()) { setErr(t("shell.discover.formError")); return; }
    const idx = registerAgent({ ...f, role: f.role === "agent" ? t("shell.discover.roleAgent") : t("shell.discover.roleOwner") });
    navigate("agent", { id: idx });
  };
  return (
    <div className="mt-4 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600"><User size={20} /></span>
        <span className="min-w-0 flex-1"><span className="mr-display block font-bold text-gray-900">{t("shell.discover.becomeTitle")}</span><span className="block truncate text-xs text-gray-500">{t("shell.discover.becomeSub")}</span></span>
        <ChevronRight size={18} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-gray-100 p-4">
          <div><label className={lab}>{t("shell.discover.formName")}</label><input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder={t("shell.discover.formNamePh")} className={inp} /></div>
          <div><label className={lab}>{t("shell.discover.formPhone")}</label><input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder={t("shell.discover.formPhonePh")} inputMode="tel" className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lab}>{t("shell.discover.formCity")}</label><select value={f.city} onChange={(e) => set("city", e.target.value)} className={`mr-sel ${inp} pr-9`}>{VILLES_KEYS.map((c) => <option key={c} value={c}>{t(`cities.${c}`)}</option>)}</select></div>
            <div><label className={lab}>{t("shell.discover.formRole")}</label><select value={f.role} onChange={(e) => set("role", e.target.value)} className={`mr-sel ${inp} pr-9`}><option value="agent">{t("shell.discover.roleAgent")}</option><option value="owner">{t("shell.discover.roleOwner")}</option></select></div>
          </div>
          <div><label className={lab}>{t("shell.discover.formBio")}</label><textarea value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder={t("shell.discover.formBioPh")} rows={2} className={inp} /></div>
          {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
          <Btn variant="solid" className="w-full py-3" onClick={submit}>{t("shell.discover.submit")}</Btn>
        </div>
      )}
    </div>
  );
}

function DiscoverPage() {
  const { navigate, properties, agents } = useApp();
  const { t } = useTranslation();
  const isAgent = (a) => ((a.roleKey ? t(a.roleKey) : a.role) || "").toLowerCase().includes("gent");
  const agentList = agents.map((a, i) => ({ ...a, i })).filter(isAgent);
  const ownerList = agents.map((a, i) => ({ ...a, i })).filter((a) => !isAgent(a));
  const featured = properties.filter((p) => p.featured).slice(0, 3);
  return (
    <div className="min-h-screen bg-gray-50/70">
      <div className="mx-auto max-w-3xl px-5 py-8 lg:py-12">
        <h1 className="mr-display text-2xl font-extrabold text-gray-900 sm:text-3xl">{t("shell.discover.title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("shell.discover.subtitle")}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button onClick={() => (HAS_API ? navigate("ranking", { kind: "agent" }) : navigate("agent", { id: (agentList[0] || { i: 1 }).i ?? 1 }))} className="overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 to-teal-900 p-5 text-left text-white shadow-lg">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><Users size={24} /></span>
            <div className="mr-display mt-4 text-lg font-extrabold">{t("shell.discover.findAgent")}</div>
            <div className="mt-1 text-sm text-white/80">{t("shell.discover.findAgentSub")}</div>
            <div className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-amber-300">{t("shell.discover.viewAll")} <ArrowRight size={15} /></div>
          </button>
          <button onClick={() => (HAS_API ? navigate("ranking", { kind: "landlord" }) : navigate("agent", { id: (ownerList[0] || { i: 0 }).i ?? 0 }))} className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-amber-700 p-5 text-left text-white shadow-lg">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20"><Building2 size={24} /></span>
            <div className="mr-display mt-4 text-lg font-extrabold">{t("shell.discover.findLandlord")}</div>
            <div className="mt-1 text-sm text-white/85">{t("shell.discover.findLandlordSub")}</div>
            <div className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-white">{t("shell.discover.viewAll")} <ArrowRight size={15} /></div>
          </button>
        </div>
        {HAS_API && (
          <button onClick={() => navigate("ranking")} className="mt-4 flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left ring-1 ring-amber-200 hover:ring-amber-400">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500 text-teal-900"><Trophy size={20} /></span>
            <span className="min-w-0 flex-1"><span className="mr-display block font-bold text-gray-900">{t("pro.rank.title")}</span><span className="block truncate text-xs text-gray-500">{t("pro.rank.subtitle")}</span></span>
            <ChevronRight size={17} className="shrink-0 text-gray-300" />
          </button>
        )}
        <h2 className="mr-display mt-8 text-lg font-extrabold text-gray-900">{t("shell.discover.people")}</h2>
        {!HAS_API && <BecomeAgent />}
        {HAS_API ? <PeopleList mode="discover" /> : <div className="mt-3 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100">
          {agents.map((a, i) => (
            <button key={i} onClick={() => navigate("agent", { id: i })} className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3.5 text-left last:border-0 hover:bg-teal-50/50">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">{a.name.charAt(0)}</span>
              <span className="min-w-0 flex-1"><span className="mr-display block truncate font-bold text-gray-900">{a.name}</span><span className="block truncate text-xs text-gray-500">{dispRole(a, t)} · {dispCity(a, t)}</span></span>
              <ChevronRight size={17} className="shrink-0 text-gray-300" />
            </button>
          ))}
        </div>}
        <h2 className="mr-display mt-8 text-lg font-extrabold text-gray-900">{t("shell.discover.moreWays")}</h2>
        <div className="mt-3 grid gap-3">
          {[
            ["featured", <Sparkles key="i" size={19} />, "bg-teal-50 text-teal-700", t("shell.discover.featured"), t("shell.discover.featuredSub"), () => navigate("listings")],
            ["new", <Clock key="i" size={19} />, "bg-amber-50 text-amber-600", t("shell.discover.newListings"), t("shell.discover.newListingsSub"), () => navigate("listings")],
            ["tips", <LifeBuoy key="i" size={19} />, "bg-gray-100 text-gray-600", t("shell.discover.tips"), t("shell.discover.tipsSub"), () => navigate("home", { anchor: "apropos" })],
          ].map(([k, ic, cls, title, sub, fn]) => (
            <button key={k} onClick={fn} className="flex items-center gap-3 rounded-3xl bg-white p-4 text-left ring-1 ring-gray-100 hover:ring-teal-200">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${cls}`}>{ic}</span>
              <span className="min-w-0 flex-1"><span className="mr-display block font-bold text-gray-900">{title}</span><span className="block truncate text-xs text-gray-500">{sub}</span></span>
              <ChevronRight size={17} className="shrink-0 text-gray-300" />
            </button>
          ))}
        </div>
        {featured.length > 0 && (
          <><h2 className="mr-display mt-8 text-lg font-extrabold text-gray-900">{t("shell.discover.featured")}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">{featured.map((p) => <PropertyCard key={p.id} p={p} />)}</div></>
        )}
      </div>
    </div>
  );
}

function ProfilePage() {
  const { user, navigate, logout, openAuth, favorites, conversations, notifications, i18n, showToast } = useApp();
  const { t } = useTranslation();
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50/70"><div className="mx-auto max-w-md px-5 py-20 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal-50 text-teal-700"><CircleUserRound size={30} /></span>
        <h1 className="mr-display mt-5 text-2xl font-extrabold text-gray-900">{t("shell.profile.loginTitle")}</h1>
        <p className="mt-2 text-sm text-gray-500">{t("shell.profile.loginSubtitle")}</p>
        <Btn variant="solid" className="mt-6 w-full py-3.5" onClick={openAuth}>{t("shell.signIn")}</Btn>
      </div></div>
    );
  }
  const unread = conversations.filter((c) => c.unread).length + notifications.filter((n) => !n.read).length;
  const rows = [
    ["edit", <Pencil key="i" size={19} />, t("pro.profileEdit.title"), "", () => navigate("editProfile")],
    ["saved", <Heart key="i" size={19} />, t("shell.profile.saved"), `${favorites.length}`, () => navigate("favorites")],
    ["notifs", <Bell key="i" size={19} />, t("shell.profile.notifications"), unread > 0 ? `${unread}` : "", () => navigate("messages")],
    ...(HAS_API ? [["bookings", <CalendarCheck key="i" size={19} />, t("deals.menu"), "", () => navigate("bookings")]] : []),
    ...(HAS_API && ["agent", "landlord", "hotel", "admin"].includes(user.role) ? [["dashboard", <LayoutDashboard key="i" size={19} />, t("pro.dash.title"), user.verification === "pending" ? t("pro.verif.pending") : "", () => navigate("dashboard")]] : []),
    ...(HAS_API && ["agent", "landlord", "hotel"].includes(user.role) ? [["proProfile", <ShieldCheck key="i" size={19} />, t("pro.onboarding.menu"), "", () => navigate("onboarding")]] : []),
    ["post", <Plus key="i" size={19} />, t("nav.postListing"), "", () => navigate("post")],
    ...(HAS_API ? [["ranking", <Trophy key="i" size={19} />, t("pro.rank.title"), "", () => navigate("ranking")]] : []),
    ...(user.role === "admin" ? [["admin", <Settings key="i" size={19} />, t("shell.admin.title"), "", () => navigate("admin")]] : []),
  ];
  return (
    <div className="min-h-screen bg-gray-50/70"><div className="mx-auto max-w-3xl px-5 py-8 lg:py-12">
      <div className="flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-gray-100">
        <Avatar name={user.name} src={user.avatar} size={60} />
        <div className="min-w-0 flex-1">
          <h1 className="mr-display truncate text-xl font-extrabold text-gray-900">{user.name}</h1>
          <p className="truncate text-sm text-gray-500">{user.username ? `@${user.username} · ` : ""}{user.email}</p>
          
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100">
        {rows.map(([k, ic, label, badge, fn]) => (
          <button key={k} onClick={fn} className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-4 text-left last:border-0 hover:bg-teal-50/50">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-700">{ic}</span>
            <span className="flex-1 text-sm font-bold text-gray-800">{label}</span>
            {badge !== "" && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-amber-500 px-1.5 text-xs font-extrabold text-teal-900">{badge}</span>}
            <ChevronRight size={17} className="text-gray-300" />
          </button>
        ))}
        <div className="flex items-center gap-3 border-b border-gray-50 px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Settings size={19} /></span>
          <span className="flex-1 text-sm font-bold text-gray-800">{t("shell.profile.language")}</span>
          <span className="flex gap-1">{["fr", "en"].map((l) => (<button key={l} onClick={() => i18n.changeLanguage(l)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${i18n.language === l ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-600"}`}>{l.toUpperCase()}</button>))}</span>
        </div>
        <button onClick={() => navigate("home", { anchor: "contact" })} className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-4 text-left last:border-0 hover:bg-teal-50/50">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-700"><LifeBuoy size={19} /></span>
          <span className="flex-1 text-sm font-bold text-gray-800">{t("shell.profile.help")}</span>
          <ChevronRight size={17} className="text-gray-300" />
        </button>
        <button onClick={() => { logout(); navigate("home"); }} className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-rose-50">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-500"><LogOut size={19} /></span>
          <span className="flex-1 text-sm font-bold text-rose-600">{t("shell.profile.signOut")}</span>
        </button>
      </div>
    </div></div>
  );
}

function NotificationsList() {
  const { notifications, markNotifRead, agents } = useApp();
  const { t, i18n } = useTranslation();
  useEffect(() => { markNotifRead(); }, []);
  if (notifications.length === 0) {
    return <div className="mt-8 flex flex-col items-center rounded-3xl bg-white py-16 text-center ring-1 ring-gray-100"><span className="grid h-16 w-16 place-items-center rounded-full bg-teal-50 text-teal-700"><Bell size={28} /></span><h3 className="mr-display mt-5 text-xl font-bold text-gray-900">{t("shell.notifs.empty")}</h3><p className="mt-2 max-w-sm text-sm text-gray-500">{t("shell.notifs.emptyHint")}</p></div>;
  }
  return (
    <div className="mt-6 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100">
      {notifications.map((n) => (
        <div key={n.id} className={`flex items-center gap-3 border-b border-gray-50 px-4 py-3.5 last:border-0 ${n.read ? "" : "bg-teal-50/40"}`}>
          <NotifIcon kind={n.icon} />
          <div className="min-w-0 flex-1">
            <div className="mr-display truncate text-sm font-bold text-gray-900">{t(n.titleKey)}</div>
            <div className="truncate text-xs text-gray-500">{t(n.textKey, { name: n.agentIdx != null && agents[n.agentIdx] ? agents[n.agentIdx].name : (n.name || ""), ...(n.params || {}) })}</div>
          </div>
          <span className="shrink-0 text-[11px] font-medium text-gray-400">{relTime(n.ts, i18n.language)}</span>
          {!n.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />}
        </div>
      ))}
    </div>
  );
}

function InstallBanner() {
  const { t } = useTranslation();
  const [evt, setEvt] = useState(null);
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem("mr-pwa-dismissed") === "1"; } catch { return false; } });
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    try {
      const mq = window.matchMedia("(display-mode: standalone)");
      setStandalone(mq.matches || window.navigator.standalone === true);
    } catch { /* noop */ }
    const onBIP = (e) => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => setEvt(null);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onBIP); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (standalone || dismissed || !evt) return null;
  const dismiss = () => { try { localStorage.setItem("mr-pwa-dismissed", "1"); } catch { /* noop */ } setDismissed(true); };
  const install = async () => { try { evt.prompt(); const c = await evt.userChoice; if (c && c.outcome === "accepted") setEvt(null); else dismiss(); } catch { dismiss(); } };
  return (
    <div className="fixed inset-x-4 bottom-24 z-40 lg:bottom-6 lg:left-auto lg:right-6 lg:w-96">
      <div className="flex items-center gap-3 rounded-3xl bg-teal-900 p-4 text-white shadow-2xl ring-1 ring-teal-700">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500 font-extrabold text-teal-900">M</span>
        <div className="min-w-0 flex-1">
          <div className="mr-display truncate text-sm font-extrabold">{t("shell.install.title")}</div>
          <div className="truncate text-xs text-white/70">{t("shell.install.sub")}</div>
        </div>
        <button onClick={install} className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-teal-900 transition hover:bg-amber-400"><Download size={15} /> {t("shell.install.btn")}</button>
        <button onClick={dismiss} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white" aria-label={t("shell.install.dismiss")}><X size={16} /></button>
      </div>
    </div>
  );
}

// ---------------- Admin (nécessite backend + rôle admin) ----------------
function AdminPage() {
  const { user, navigate, showToast } = useApp();
  const { t } = useTranslation();
  const hasBackend = !!import.meta.env.VITE_API_URL;
  const [tab, setTab] = useState("leads");
  const [integrations, setIntegrations] = useState(null);  const [drafts, setDrafts] = useState({});
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState(null);
  const [userQuery, setUserQuery] = useState("");
  const [heroFile, setHeroFile] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hasBackend || user?.role !== "admin") return;
    AdminAPI.integrations().then((r) => {
      setIntegrations(r.integrations || []);
      const d = {};
      for (const it of r.integrations || []) {
        d[it.provider] = { enabled: it.enabled, values: Object.fromEntries(it.fields.filter((f) => !f.secret).map((f) => [f.key, f.value || ""])) };
      }
      setDrafts(d);
    }).catch(() => {});
    AdminAPI.settings().then((r) => setSettings(r.settings || {})).catch(() => {});
    AdminAPI.users().then((r) => setUsers(r.users || [])).catch(() => {});
  }, [hasBackend, user?.role]);

  if (!hasBackend) return <div className="mx-auto max-w-2xl px-5 py-24 text-center"><p className="text-gray-500">{t("shell.admin.needBackend")}</p><Btn variant="ghost" className="mt-4 px-5 py-2.5" onClick={() => navigate("home")}>{t("detail.back")}</Btn></div>;
  if (user?.role !== "admin") return <div className="mx-auto max-w-2xl px-5 py-24 text-center"><p className="text-gray-500">{t("shell.admin.needRole")}</p><Btn variant="ghost" className="mt-4 px-5 py-2.5" onClick={() => navigate("home")}>{t("detail.back")}</Btn></div>;

  const setD = (provider, patch) => setDrafts((d) => ({ ...d, [provider]: { ...d[provider], ...patch } }));
  const setVal = (provider, key, v) => setDrafts((d) => ({ ...d, [provider]: { ...d[provider], values: { ...d[provider].values, [key]: v } } }));
  const saveInteg = async (provider) => {
    setBusy(true);
    try { await AdminAPI.saveIntegration(provider, { enabled: drafts[provider].enabled, config: drafts[provider].values }); showToast(t("shell.admin.saved")); }
    catch { showToast(t("shell.admin.error")); }
    setBusy(false);
  };
  const saveSet = async (key, value) => {
    setBusy(true);
    try { const r = await AdminAPI.saveSetting(key, value); setSettings((s) => ({ ...s, [key]: r.value })); showToast(t("shell.admin.saved")); }
    catch { showToast(t("shell.admin.error")); }
    setBusy(false);
  };
  const uploadHero = async () => {
    if (!heroFile) return;
    setBusy(true);
    try {
      const r = await AdminAPI.uploadImage(heroFile);
      await saveSet("hero", { ...(settings.hero || {}), image: r.url });
      setHeroFile(null);
    } catch { showToast(t("shell.admin.error")); }
    setBusy(false);
  };
  const changeRole = async (id, role) => {
    try {
      await AdminAPI.setUserRole(id, role);
      setUsers((us) => (us || []).map((u) => (u.id === id ? { ...u, role } : u)));
      showToast(t("shell.admin.saved"));
    } catch { showToast(t("shell.admin.error")); }
  };
  const inp = "w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";
  const lab = "mb-1 block text-xs font-semibold text-gray-500";

  return (
    <div className="min-h-screen bg-gray-50/70"><div className="mx-auto max-w-5xl px-5 py-8 lg:py-12">
      <button onClick={() => navigate("profile")} className="mr-inback mb-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-teal-700"><ArrowLeft size={16} /> {t("detail.back")}</button>
      <h1 className="mr-display text-2xl font-extrabold text-gray-900 sm:text-3xl">{t("shell.admin.title")}</h1>
      <p className="mt-1 text-sm text-gray-500">{t("shell.admin.subtitle")}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {(["leads", "payments", "verifications", "listings", "integrations", "users", "content"]).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-5 py-2.5 text-sm font-bold ${tab === k ? "bg-teal-700 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"}`}>{t(`shell.admin.tabs.${k}`)}</button>
        ))}
      </div>
      {tab === "leads" && <AdminLeads />}
      {tab === "payments" && <AdminPayments />}
      {tab === "verifications" && <AdminVerifications />}
      {tab === "listings" && <AdminListings />}
      {tab === "integrations" && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-gray-500">{t("shell.admin.integSubtitle")}</p>
          {!integrations && <p className="text-sm text-gray-400">…</p>}
          {(integrations || []).map((it) => (
            <div key={it.provider} className="rounded-3xl bg-white p-5 ring-1 ring-gray-100">
              <div className="flex items-center justify-between gap-3">
                <div className="mr-display font-extrabold text-gray-900">{it.label}</div>
                <button onClick={() => setD(it.provider, { enabled: !drafts[it.provider]?.enabled })} className={`relative h-7 w-12 shrink-0 rounded-full transition ${drafts[it.provider]?.enabled ? "bg-teal-600" : "bg-gray-200"}`} aria-label={t("shell.admin.enabled")}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${drafts[it.provider]?.enabled ? "left-6" : "left-1"}`} />
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {it.fields.map((f) => (
                  <div key={f.key}>
                    <label className={lab}>{f.label} {f.secret && <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${f.set ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-400"}`}>{f.set ? t("shell.admin.secretSet") : t("shell.admin.secretEmpty")}</span>}</label>
                    <input type={f.secret ? "password" : "text"} autoComplete="off" placeholder={f.secret ? "••••••••" : f.key} value={drafts[it.provider]?.values[f.key] || ""} onChange={(e) => setVal(it.provider, f.key, e.target.value)} className={inp} />
                  </div>
                ))}
              </div>
              <Btn variant="solid" className="mt-4 px-6 py-2.5 text-sm" disabled={busy} onClick={() => saveInteg(it.provider)}>{t("shell.admin.save")}</Btn>
            </div>
          ))}
        </div>
      )}
      {tab === "users" && (
        <div className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">{t("shell.admin.usersSubtitle")}</p>
          <input value={userQuery} onChange={(e) => { setUserQuery(e.target.value); AdminAPI.users({ q: e.target.value }).then((r) => setUsers(r.users || [])).catch(() => {}); }} placeholder={t("shell.admin.searchUsers")} className="mt-3 w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-gray-100">
            {(users || []).map((u) => (
              <div key={u.id} className="flex items-center gap-3 border-b border-gray-50 px-4 py-3 last:border-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-700 text-xs font-bold text-white">{(u.name || "?").charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="mr-display block truncate text-sm font-bold text-gray-900">{u.name} {u.id === user.id && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{t("shell.admin.selfYou")}</span>}</span>
                  <span className="block truncate text-xs text-gray-500">{u.email}</span>
                </span>
                <select value={u.role} disabled={u.id === user.id} onChange={(e) => changeRole(u.id, e.target.value)} title={t("shell.admin.usersSubtitle")} className="mr-sel shrink-0 appearance-none rounded-xl bg-gray-50 py-2 pl-3 pr-8 text-xs font-bold text-teal-700 ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50">
                  {(["tenant", "landlord", "agent", "hotel", "admin"]).map((r) => (<option key={r} value={r}>{t(`shell.admin.roles.${r}`)}</option>))}
                </select>
              </div>
            ))}
            {users && users.length === 0 && <p className="px-4 py-8 text-center text-sm text-gray-400">—</p>}
          </div>
        </div>
      )}
      {tab === "content" && settings && (
        <div className="mt-6 space-y-4">
          <div className="rounded-3xl bg-white p-5 ring-1 ring-gray-100">
            <div className="mr-display font-extrabold text-gray-900">{t("shell.admin.announcement")}</div>
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={!!settings.announcement?.enabled} onChange={(e) => setSettings((s) => ({ ...s, announcement: { ...s.announcement, enabled: e.target.checked } }))} className="h-4 w-4 accent-teal-700" /> {t("shell.admin.enabled")}</label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><label className={lab}>{t("shell.admin.annFr")}</label><input value={settings.announcement?.textFr || ""} onChange={(e) => setSettings((s) => ({ ...s, announcement: { ...s.announcement, textFr: e.target.value } }))} className={inp} /></div>
              <div><label className={lab}>{t("shell.admin.annEn")}</label><input value={settings.announcement?.textEn || ""} onChange={(e) => setSettings((s) => ({ ...s, announcement: { ...s.announcement, textEn: e.target.value } }))} className={inp} /></div>
            </div>
            <Btn variant="solid" className="mt-4 px-6 py-2.5 text-sm" disabled={busy} onClick={() => saveSet("announcement", settings.announcement)}>{t("shell.admin.save")}</Btn>
          </div>
          <div className="rounded-3xl bg-white p-5 ring-1 ring-gray-100">
            <div className="mr-display font-extrabold text-gray-900">{t("shell.admin.heroImage")}</div>
            {settings.hero?.image && <img src={settings.hero.image} alt="hero" className="mt-3 h-40 w-full rounded-2xl object-cover" />}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input type="file" accept="image/*" onChange={(e) => setHeroFile(e.target.files?.[0] || null)} className="flex-1 text-sm text-gray-600" />
              <Btn variant="solid" className="px-6 py-2.5 text-sm" disabled={busy || !heroFile} onClick={uploadHero}>{busy ? t("shell.admin.uploading") : t("shell.admin.upload")}</Btn>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-5 ring-1 ring-gray-100">
            <div className="mr-display font-extrabold text-gray-900">{t("shell.admin.categories")}</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {TYPES_KEYS.map((ty) => (
                <div key={ty}><label className={lab}>{t(`types.${ty}`)}</label><input value={settings.categories?.[ty] || ""} placeholder="https://…" onChange={(e) => setSettings((s) => ({ ...s, categories: { ...s.categories, [ty]: e.target.value } }))} className={inp} /></div>
              ))}
            </div>
            <Btn variant="solid" className="mt-4 px-6 py-2.5 text-sm" disabled={busy} onClick={() => saveSet("categories", settings.categories)}>{t("shell.admin.save")}</Btn>
          </div>
          <div className="rounded-3xl bg-white p-5 ring-1 ring-gray-100">
            <div className="mr-display font-extrabold text-gray-900">{t("shell.admin.contact")}</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><label className={lab}>{t("shell.admin.phone")}</label><input value={settings.contact?.phone || ""} onChange={(e) => setSettings((s) => ({ ...s, contact: { ...s.contact, phone: e.target.value } }))} className={inp} /></div>
              <div><label className={lab}>{t("shell.admin.email")}</label><input value={settings.contact?.email || ""} onChange={(e) => setSettings((s) => ({ ...s, contact: { ...s.contact, email: e.target.value } }))} className={inp} /></div>
            </div>
            <Btn variant="solid" className="mt-4 px-6 py-2.5 text-sm" disabled={busy} onClick={() => saveSet("contact", settings.contact)}>{t("shell.admin.save")}</Btn>
          </div>
        </div>
      )}
    </div></div>
  );
}

const TikTok = (props) => (<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" {...props}><path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.2v12.8a2.33 2.33 0 1 1-2.33-2.33c.24 0 .47.04.69.1V8.3a5.6 5.6 0 0 0-.69-.04 5.55 5.55 0 1 0 5.55 5.55V8.6a7.5 7.5 0 0 0 4.34 1.39V6.8a4.28 4.28 0 0 1-3.3-.98z" /></svg>);

export default function MansaRent() {
  const { t, i18n } = useTranslation();
  // Lien « mot de passe oublié » reçu par e-mail : /reset-password?token=…
  const [history, setHistory] = useState(() => {
    try {
      const token = new URLSearchParams(window.location.search).get("token");
      if (window.location.pathname.startsWith("/reset-password") && token) return [{ name: START_PAGE }, { name: "reset", token }];
      const paid = new URLSearchParams(window.location.search).get("payment");
      if (paid) return [{ name: START_PAGE }, { name: "paymentReturn", id: paid }];
    } catch { /* ignore */ }
    return [{ name: START_PAGE }];
  });
  const route = history[history.length - 1];
  // Avec backend : vraies annonces (API). Sans backend : annonces de démo en mémoire.
  const [properties, setProperties] = useState(HAS_API ? [] : SEED_PROPERTIES);
  const [favorites, setFavorites] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [toast, setToast] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [siteSettings, setSiteSettings] = useState(null);
  useEffect(() => {
    // Ajustements admin (annonce, images…) — backend uniquement, jamais en démo.
    if (!import.meta.env.VITE_API_URL) return;
    SettingsAPI.get().then(setSiteSettings).catch(() => {});
  }, []);
  const [agents, setAgents] = useState(LANDLORDS);
  const registerAgent = (data) => {
    const idx = agents.length;
    const a = { name: data.name.trim(), phone: data.phone.trim(), role: data.role, city: data.city, since: new Date().getFullYear(), bio: (data.bio || "").trim() };
    setAgents((prev) => [...prev, a]);
    showToast(t("shell.discover.success", { name: a.name }));
    return idx;
  };
  const [notifications, setNotifications] = useState(HAS_API ? [] : SEED_NOTIFICATIONS);
  const markNotifRead = () => setNotifications((ns) => (ns.some((n) => !n.read) ? ns.map((n) => ({ ...n, read: true })) : ns));
  const pushNotif = (n) => setNotifications((ns) => [{ id: "n" + Date.now(), ts: Date.now(), read: false, ...n }, ...ns]);
  const [reviews, setReviews] = useState(SEED_REVIEWS);
  const toastTimer = useRef(null);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.title = i18n.language === "fr"
      ? "MansaRent — Trouvez. Louez. Emménagez. | Location immobilière en Guinée"
      : "MansaRent — Find. Rent. Move in. | Real estate rentals in Guinea";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.name = "description";
    meta.content = i18n.language === "fr"
      ? "MansaRent est la marketplace de location immobilière en Guinée : maisons, appartements, chambres, villas, bureaux et logements de courte durée."
      : "MansaRent is the rental marketplace in Guinea: houses, apartments, rooms, villas, offices and short-term rentals.";
    document.head.appendChild(meta);
  }, [i18n.language]);

  const navigate = (name, params = {}) => { setHistory((h) => [...h, { name, ...params }]); window.scrollTo({ top: 0, behavior: "auto" }); };
  const back = () => { setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h)); window.scrollTo({ top: 0 }); };
  const toggleFavorite = (id) => {
    if (!favorites.includes(id)) hapticSuccess();
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
    // Favoris réels : enregistrés côté serveur (comptent dans les stats de l'agent).
    if (HAS_API && user && typeof id === "string") FavoriteAPI.toggle(id).catch(() => {});
  };
  const showToast = (msg) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 3200); };
  const addProperty = (data) => {
    const id = Math.max(0, ...properties.map((p) => p.id)) + 1;
    const prop = { ...data, id, landlordInfo: data.landlordInfo };
    setProperties((arr) => [prop, ...arr]);
    return prop;
  };
  const login = (u, { silent = false } = {}) => {
    // Les dates du backend arrivent en ISO : on les convertit en millisecondes.
    setUser({ ...u });
    setAuthOpen(false);
    if (!silent) showToast(t("toast.welcome", { name: u.name }));
  };
  const logout = () => { if (pushToken.current) DeviceAPI.unregister(pushToken.current).catch(() => {}); Session.clear(); setUser(null); setFavorites([]); showToast(t("toast.loggedOut")); };
  const refreshUser = (patch) => setUser((u) => (u ? { ...u, ...patch } : u));

  // ---- Données réelles (backend) --------------------------------------
  const [propsLoading, setPropsLoading] = useState(HAS_API);
  const reloadProperties = () => {
    if (!HAS_API) return Promise.resolve();
    return PropertyAPI.list({ limit: 100 })
      .then((r) => setProperties((r.properties || []).map(fromApi)))
      .catch((e) => console.warn("[annonces]", e.message))
      .finally(() => setPropsLoading(false));
  };
  useEffect(() => {
    if (!HAS_API) return;
    reloadProperties();
    // Session conservée après un rechargement de page.
    // Seul un jeton refusé (401) déconnecte — pas une coupure réseau ou un redémarrage du backend.
    const restore = (tries = 3) => AuthAPI.me()
      .then((r) => login(r.user, { silent: true }))
      .catch((e) => { if (e.status === 401) Session.clear(); else if (tries > 1) setTimeout(() => restore(tries - 1), 2000); });
    if (Session.get()) restore();
  }, []);
  // Les biens à vendre ne montrent l'agent qu'à lui-même / à l'admin : on recharge à la connexion.
  const lastUserId = useRef(null);
  useEffect(() => {
    if (!HAS_API) return;
    if (lastUserId.current !== null && lastUserId.current !== (user?.id || "")) reloadProperties();
    lastUserId.current = user?.id || "";
  }, [user?.id]);
  useEffect(() => {
    if (!HAS_API || !user?.id) return;
    FavoriteAPI.list().then((r) => setFavorites((r.favorites || []).map((p) => p.id))).catch(() => {});
  }, [user?.id]);
  // Création / modification d'une annonce réelle → renvoie l'annonce (format interface).
  const saveListing = async (editId, data, already = null) => {
    const r = already ? { property: already } : editId ? await PropertyAPI.update(editId, data) : await PropertyAPI.create(data);
    const mapped = fromApi(r.property);
    setProperties((arr) => [mapped, ...arr.filter((x) => x.id !== mapped.id)]);
    return mapped;
  };
  // Choix unique du rôle après l'inscription (acheteur, agent, vendeur).
  const chooseRole = async (role) => {
    if (!HAS_API) { refreshUser({ role, roleChosen: true, verification: "none" }); return { ok: true }; }
    try {
      const r = await AuthAPI.chooseRole(role);
      login(r.user, { silent: true });
      showToast(t(`pro.picker.${role}.toast`));
      return { ok: true };
    } catch (e) {
      if (e.code === "ROLE_ALREADY_CHOSEN" && e.body?.user) { login(e.body.user, { silent: true }); return { ok: true }; }
      return { ok: false, error: e.message };
    }
  };
  // Connexion e-mail : backend réel si VITE_API_URL, sinon démo locale.
  // Retourne { ok, error } — l'utilisateur backend inclut son rôle (admin…).
  const loginWithPassword = async (email, password, name = "") => {
    const em = (email || "").trim();
    if (!em || !password) return { ok: false, error: "…" };
    if (!import.meta.env.VITE_API_URL) {
      login({ name: name || em.split("@")[0] || t("auth.demoUser"), email: em });
      return { ok: true };
    }
    try {
      const r = await AuthAPI.login(em, password);
      if (r.token) Session.set(r.token);
      login(r.user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  // ---- Messagerie réelle (backend) -------------------------------------
  const mapConv = (c, prev) => ({
    id: c.id,
    propertyId: c.propertyId,
    propertyTitle: c.property?.title || "",
    agentId: c.other?.id,
    agentName: c.other?.name || "—",
    other: c.other,
    myRole: c.myRole,
    kind: c.kind || "direct",
    leadStatus: c.leadStatus || null,
    unread: c.unread > 0,
    unreadCount: c.unread,
    lastText: c.messages?.[0]?.text || "",
    lastTs: toMs(c.lastAt),
    messages: prev?.messages || [],
  });
  const loadConversations = () => {
    if (!HAS_API || !Session.get()) return Promise.resolve();
    return ConversationAPI.list()
      .then((r) => setConversations((cs) => (r.conversations || []).map((c) => mapConv(c, cs.find((x) => x.id === c.id)))))
      .catch(() => {});
  };
  const loadMessages = (convId) => {
    if (!HAS_API || !convId) return Promise.resolve();
    return ConversationAPI.messages(convId).then((r) => {
      const msgs = (r.messages || []).map((m) => ({ id: m.id, from: m.senderId === user?.id ? "me" : "agent", text: m.text, ts: toMs(m.createdAt) }));
      setConversations((cs) => cs.map((c) => (c.id === convId ? { ...c, messages: msgs, lastText: msgs[msgs.length - 1]?.text || c.lastText } : c)));
    }).catch(() => {});
  };
  useEffect(() => {
    if (!HAS_API || !user?.id) { if (HAS_API) setConversations([]); return; }
    loadConversations();
    const timer = setInterval(loadConversations, 15000); // nouveaux messages / badges
    return () => clearInterval(timer);
  }, [user?.id]);

  const startConversation = (p, extra = {}) => {
    if (HAS_API && typeof p.id === "string") {
      if (user && p.ownerId === user.id) { showToast(t("pro.chat.ownListing")); return Promise.resolve(null); }
      return ConversationAPI.start(p.id, extra)
        .then(async (r) => { await loadConversations(); return r.conversation.id; })
        .catch((e) => { showToast(e.message); return null; });
    }
    const id = "conv-" + p.id;
    setConversations((cs) => {
      if (cs.some((c) => c.id === id)) return cs;
      const agent = landlordOf(p);
      const greeting = { id: "m0", from: "agent", text: t("chat.greeting", { title: p.titleKey, name: agent.name }), ts: Date.now() };
      return [{ id, propertyId: p.id, propertyTitle: p.titleKey, agentId: agentOf(p), agentName: agent.name, messages: [greeting], unread: false }, ...cs];
    });
    return id;
  };
  const sendMessage = (convId, text) => {
    const txt = (text || "").trim();
    if (!txt) return;
    if (HAS_API && !String(convId).startsWith("conv-")) {
      const tmp = { id: "tmp" + Date.now(), from: "me", text: txt, ts: Date.now(), pending: true };
      setConversations((cs) => cs.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, tmp], lastText: txt, lastTs: Date.now() } : c)));
      ConversationAPI.send(convId, txt)
        .then(() => loadMessages(convId))
        .catch((e) => {
          showToast(e.message);
          setConversations((cs) => cs.map((c) => (c.id === convId ? { ...c, messages: c.messages.filter((m) => m.id !== tmp.id) } : c)));
        });
      return;
    }
    setConversations((cs) => cs.map((c) => c.id === convId ? { ...c, unread: false, messages: [...c.messages, { id: "m" + Date.now(), from: "me", text: txt, ts: Date.now() }] } : c));
    const conv = conversations.find((c) => c.id === convId);
    setTimeout(() => {
      setConversations((cs) => cs.map((c) => c.id === convId ? { ...c, unread: true, messages: [...c.messages, { id: "r" + Date.now(), from: "agent", text: t("chat.autoReply"), ts: Date.now() }] } : c));
      pushNotif({ icon: "message", titleKey: "shell.notifs.seedMsg", textKey: "shell.notifs.seedMsgText", name: conv?.agentName || "" });
    }, 1100);
  };
  const markConversationRead = (id) => {
    const conv = conversations.find((c) => c.id === id);
    if (HAS_API && conv?.unread) ConversationAPI.read(id).catch(() => {});
    setConversations((cs) => (cs.some((c) => c.id === id && c.unread) ? cs.map((c) => (c.id === id ? { ...c, unread: false, unreadCount: 0 } : c)) : cs));
  };

  const addReview = ({ propertyId = null, agentId = null, rating, text }) => {
    setReviews((rs) => [{ id: "rv" + Date.now(), propertyId, agentId, author: user?.name || t("toast.client"), authorAvatar: user?.avatar || null, rating, text: text || "", ts: Date.now() }, ...rs]);
    showToast(t("toast.reviewAdded"));
  };

  // Bouton retour Android : fenêtre ouverte → fermée ; sinon page précédente.
  const backState = useRef({});
  backState.current = { authOpen, depth: history.length, route };
  useEffect(() => {
    setBackHandler(() => {
      const st = backState.current;
      if (st.authOpen) { setAuthOpen(false); return true; }
      if (st.depth > 1) { back(); return true; }
      if (st.route.name !== START_PAGE) { navigate(START_PAGE); return true; }
      return false;
    });
  }, []);

  // Notifications push (appli native) : jeton lié au compte connecté.
  const pushToken = useRef(null);
  useEffect(() => {
    if (!HAS_API || !PUSH_READY || !user?.id) return;
    setPushHandlers({
      onToken: (token, platform) => { pushToken.current = token; DeviceAPI.register(token, platform).catch(() => {}); },
      onReceive: (n) => { showToast(n.title || n.body || "MansaRent"); loadConversations(); },
      onOpen: (n) => {
        const d = n?.data || {};
        if (d.type === "message") navigate("messages", d.conversationId ? { conv: d.conversationId } : {});
        else if (d.type === "verification") navigate("dashboard");
        else if (d.type === "booking") navigate("bookings");
        else if (d.type === "lead") navigate("admin");
      },
    });
    registerPush();
  }, [user?.id]);

  const ctx = {
    propsLoading,
    route, navigate, back,
    properties, addProperty,
    favorites, toggleFavorite,
    filters, setFilters,
    user, login, logout, loginWithPassword, refreshUser, chooseRole,
    hasApi: HAS_API, reloadProperties, saveListing,
    authOpen, authTab, closeAuth: () => setAuthOpen(false),
    // openAuth("register") ouvre directement l'inscription ; utilisé aussi comme onClick (reçoit l'événement).
    openAuth: (tab) => { setAuthTab(["register", "forgot"].includes(tab) ? tab : "login"); setAuthOpen(true); },
    toast, showToast,
    conversations, startConversation, sendMessage, markConversationRead, loadMessages, loadConversations,
    notifications, markNotifRead,
    agents, registerAgent,
    siteSettings,
    reviews, addReview,
    i18n,
  };

  // Sens de la transition : en avant (glisse depuis la droite), retour (depuis la gauche), onglet (fondu).
  const prevDepth = useRef(history.length);
  const pageAnim = history.length < prevDepth.current ? "mr-page-back"
    : TAB_ROOTS.includes(route.name) ? "mr-page-tab" : "mr-page-fwd";
  useEffect(() => { prevDepth.current = history.length; });

  let page;
  // Sur téléphone (appli ou site mobile), l'accueil = les annonces disponibles.
  if (route.name === "listings" || (route.name === "home" && START_PAGE === "listings")) page = <ListingsPage />;
  else if (route.name === "detail") page = <DetailPage />;
  else if (route.name === "post") page = <PostPage />;
  else if (route.name === "favorites") page = <FavoritesPage />;
  else if (route.name === "messages") page = <MessagesPage />;
  else if (route.name === "discover") page = <DiscoverPage />;
  else if (route.name === "profile") page = <ProfilePage />;
  else if (route.name === "admin") page = <AdminPage />;
  else if (route.name === "agent") page = <AgentProfilePage />;
  else if (route.name === "onboarding") page = <ProOnboardingPage />;
  else if (route.name === "dashboard") page = <DashboardPage />;
  else if (route.name === "ranking") page = <RankingPage />;
  else if (route.name === "reset") page = <ResetPasswordPage />;
  else if (route.name === "editProfile") page = <EditProfilePage />;
  else if (route.name === "bookings") page = <BookingsPage />;
  else if (route.name === "paymentReturn") page = <PaymentReturnPage />;
  else page = <HomePage />;

  return (
    <AppCtx.Provider value={ctx}>
      <div className="mr-root min-h-screen bg-white text-gray-900">
        <GlobalStyles />
        <div className="hidden lg:block"><Navbar /></div>
        <TopBar />
        <AnnouncementBar />
        <main key={history.length + ":" + route.name} className={`${pageAnim} pb-28 lg:pb-0`}>{page}</main>
        {/* Pied de page : site sur ordinateur uniquement (ni appli, ni téléphone). */}
        {!APP_MODE && <div className="hidden lg:block"><Footer /></div>}
        <BottomNav />
        {!APP_MODE && <InstallBanner />}
        <AuthModal />
        <RolePickerModal />
        <Toast />
      </div>
    </AppCtx.Provider>
  );
}

// Partagé avec ./pro.jsx (espace agent / vendeur, classement, vérifications).
export { formatGNFFull, useApp, Btn, Avatar, Stars, PropertyCard, ReviewsBlock, formatGNF, VILLES_KEYS, coverOf, fromApi, fmtDate };
