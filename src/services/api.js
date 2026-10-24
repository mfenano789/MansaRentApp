// ============================================================
// MansaRent — couche service API (à brancher sur votre backend)
// ============================================================
// Définissez VITE_API_URL dans un fichier .env (voir .env.example).
// Par défaut : http://localhost:4000/api
//
// Ces fonctions remplacent l'état en mémoire de MansaRent.jsx :
//   SEED_PROPERTIES  -> PropertyAPI.list()
//   addProperty()    -> PropertyAPI.create()
//   login()/logout() -> AuthAPI.login() / register()
//   toggleFavorite() -> FavoriteAPI.toggle()
// Voir le README pour le détail de l'intégration.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Dans l'appli mobile, l'API est sur un autre serveur (URL absolue) : les images
// enregistrées localement (« /api/uploads/… ») doivent pointer vers ce serveur.
const API_ORIGIN = /^https?:\/\//i.test(BASE_URL) ? new URL(BASE_URL).origin : "";
function absolutize(v) {
  if (!API_ORIGIN || v == null) return v;
  if (typeof v === "string") return v.startsWith("/api/uploads/") ? API_ORIGIN + v : v;
  if (Array.isArray(v)) return v.map(absolutize);
  if (typeof v === "object") { for (const k of Object.keys(v)) v[k] = absolutize(v[k]); }
  return v;
}

// ---- Session : jeton JWT gardé en mémoire + localStorage (survit au rechargement)
const TOKEN_KEY = "mr_token";
export const Session = {
  get() {
    if (window.__MR_TOKEN__) return window.__MR_TOKEN__;
    try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
  },
  set(token) {
    window.__MR_TOKEN__ = token || null;
    try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* stockage indisponible */ }
  },
  clear() { this.set(null); },
};

function authHeaders() {
  const token = Session.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Erreur API lisible : message du serveur + code (ex. VERIFICATION_REQUIRED).
export class ApiError extends Error {
  constructor(status, body) {
    super((body && body.error) || `API ${status}`);
    this.status = status;
    this.code = body && body.code;
    this.body = body;
  }
}

async function http(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let body = null;
    try { body = JSON.parse(text); } catch { body = { error: text || res.statusText }; }
    throw new ApiError(res.status, body);
  }
  return res.status === 204 ? null : absolutize(await res.json());
}

// Multipart (uploads) : pas de Content-Type JSON, le navigateur met le boundary.
async function httpForm(path, formData, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { ...authHeaders(), ...(options.headers || {}) },
    body: formData,
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let body = null;
    try { body = JSON.parse(text); } catch { body = { error: text || res.statusText }; }
    throw new ApiError(res.status, body);
  }
  return absolutize(await res.json());
}

// ---- Propriétés -------------------------------------------------
export const PropertyAPI = {
  // filters: { city, type, rental, beds, minPrice, maxPrice, q, sort }
  list(filters = {}) {
    const clean = Object.entries(filters).filter(
      ([, v]) => v !== "" && v !== 0 && v != null
    );
    const qs = new URLSearchParams(clean).toString();
    return http(`/properties${qs ? `?${qs}` : ""}`);
  },
  get(id) {
    return http(`/properties/${id}`);
  },
  create(data) {
    return http(`/properties`, { method: "POST", body: JSON.stringify(data) });
  },
  update(id, data) {
    return http(`/properties/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  remove(id) {
    return http(`/properties/${id}`, { method: "DELETE" });
  },
  // status: 'available' | 'rented' | 'sold' ; dealPrice = montant final (optionnel)
  setStatus(id, status, dealPrice) {
    return http(`/properties/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, dealPrice: dealPrice || null }) });
  },
  view(id) {
    return http(`/properties/${id}/view`, { method: "POST" });
  },
  // Photos prises avec l'appareil photo ou choisies dans la galerie (max 8).
  uploadImages(id, files) {
    const fd = new FormData();
    files.forEach((f) => fd.append("images", f));
    return httpForm(`/properties/${id}/images`, fd);
  },
};

// ---- Messagerie (seul moyen de contact entre acheteurs et agents) -----
export const ConversationAPI = {
  list() {
    return http(`/conversations`);
  },
  start(propertyId) {
    return http(`/conversations`, { method: "POST", body: JSON.stringify({ propertyId }) });
  },
  messages(id) {
    return http(`/conversations/${id}/messages`);
  },
  send(id, text) {
    return http(`/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ text }) });
  },
  read(id) {
    return http(`/conversations/${id}/read`, { method: "PUT" });
  },
};

// ---- Espace pro (agent / vendeur-propriétaire) ---------------------
export const ProAPI = {
  me() {
    return http(`/pro/me`);
  },
  save(profile) {
    return http(`/pro/me`, { method: "PUT", body: JSON.stringify(profile) });
  },
  dashboard() {
    return http(`/pro/dashboard`);
  },
};

// ---- Agents : profil public + classement ----------------------------
export const AgentAPI = {
  get(id) {
    return http(`/agents/${id}`);
  },
  leaderboard(kind = "agent") {
    return http(`/agents/leaderboard?kind=${kind}`);
  },
};

// ---- Avis ------------------------------------------------------------
export const ReviewAPI = {
  list({ propertyId, agentId }) {
    const qs = new URLSearchParams(propertyId ? { propertyId } : { agentId });
    return http(`/reviews?${qs}`);
  },
  create({ propertyId, agentId, rating, text }) {
    return http(`/reviews`, { method: "POST", body: JSON.stringify({ propertyId, agentId, rating, text }) });
  },
};

// ---- Authentification ------------------------------------------
export const AuthAPI = {
  login(email, password) {
    return http(`/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  register({ name, email, password }) {
    return http(`/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },
  // Envoie l'ID token Google (JWT renvoyé par « Sign in with Google »).
  // Le backend DOIT vérifier ce token auprès de Google avant de créer la session.
  loginWithGoogle(credential) {
    return http(`/auth/google`, {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
  },
  me() {
    return http(`/auth/me`);
  },
  // Profil : nom + nom d'utilisateur (tous les rôles)
  updateMe({ name, username }) {
    return http(`/auth/me`, { method: "PUT", body: JSON.stringify({ name, username }) });
  },
  uploadAvatar(file) {
    const fd = new FormData();
    fd.append("avatar", file);
    return httpForm(`/auth/me/avatar`, fd);
  },
  removeAvatar() {
    return http(`/auth/me/avatar`, { method: "DELETE" });
  },
  forgotPassword(email) {
    return http(`/auth/forgot-password`, { method: "POST", body: JSON.stringify({ email }) });
  },
  resetPassword(token, password) {
    return http(`/auth/reset-password`, { method: "POST", body: JSON.stringify({ token, password }) });
  },
  // Choix unique après l'inscription : 'tenant' | 'agent' | 'landlord'
  chooseRole(role) {
    return http(`/auth/role`, { method: "POST", body: JSON.stringify({ role }) });
  },
};

// ---- Favoris ----------------------------------------------------
// ---- Appareils (notifications push de l'appli mobile) ---------------
export const DeviceAPI = {
  register(token, platform) {
    return http(`/devices`, { method: "POST", body: JSON.stringify({ token, platform }) });
  },
  unregister(token) {
    return http(`/devices`, { method: "DELETE", body: JSON.stringify({ token }) });
  },
};

export const FavoriteAPI = {
  list() {
    return http(`/favorites`);
  },
  toggle(propertyId) {
    return http(`/favorites/${propertyId}`, { method: "POST" });
  },
};

// ---- Réglages publics du site (pilotés par l'admin) ----------------
// Renvoie { announcement, hero, categories, contact }. Fonctionne même
// sans compte. En mode démo (pas de backend), l'appel échoue : ignorer.
export const SettingsAPI = {
  async get() {
    const r = await http(`/settings`);
    return r.settings || {};
  },
};

// ---- Administration (rôle admin requis) ---------------------------
export const AdminAPI = {
  integrations() {
    return http(`/admin/integrations`);
  },  saveIntegration(provider, { enabled, config }) {
    return http(`/admin/integrations/${provider}`, {
      method: "PUT",
      body: JSON.stringify({ enabled, config }),
    });
  },
  settings() {
    return http(`/admin/settings`);
  },
  saveSetting(key, value) {
    return http(`/admin/settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
  },
  uploadImage(file) {
    const fd = new FormData();
    fd.append("image", file);
    return httpForm(`/admin/uploads`, fd);
  },
  users({ q = "", page = 1 } = {}) {
    const qs = new URLSearchParams({ ...(q ? { q } : {}), page });
    return http(`/admin/users?${qs}`);
  },
  verifications(status = "pending") {
    return http(`/admin/verifications?status=${status}`);
  },
  decideVerification(userId, decision, reason = "") {
    return http(`/admin/verifications/${userId}`, { method: "PUT", body: JSON.stringify({ decision, reason }) });
  },
  stats() {
    return http(`/admin/stats`);
  },
  properties({ q = "", page = 1 } = {}) {
    const qs = new URLSearchParams({ ...(q ? { q } : {}), page, limit: 50 });
    return http(`/admin/properties?${qs}`);
  },
  setFeatured(id, featured) {
    return http(`/admin/properties/${id}/featured`, { method: "PUT", body: JSON.stringify({ featured }) });
  },
  deleteProperty(id) {
    return http(`/admin/properties/${id}`, { method: "DELETE" });
  },
  setUserRole(id, role) {
    return http(`/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  },
};

