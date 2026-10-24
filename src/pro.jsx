// ============================================================
// MansaRent — Espace pro : choix du rôle, profil vérifié,
// tableau de bord agent / vendeur, classement, vérifications admin.
// ============================================================
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, BadgeCheck, Briefcase, Building2, Check, CheckCircle2, Clock, Eye, Heart, Home, KeyRound,
  Lock, MessageSquare, Pencil, Plus, RotateCcw, Search, ShieldCheck, Star, Trash2, Trophy, Upload, X, XCircle,
} from "lucide-react";
import { ProAPI, AgentAPI, AdminAPI, PropertyAPI, AuthAPI } from "./services/api.js";
// (AuthAPI : profil, photo et mot de passe)
import {
  useApp, Btn, Avatar, Stars, PropertyCard, ReviewsBlock, formatGNF, VILLES_KEYS, coverOf, fromApi, fmtDate,
} from "./MansaRent.jsx";

const inp = "w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm text-gray-800 ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";
const sel = `mr-sel ${inp} appearance-none pr-9`;
const lab = "mb-1.5 block text-sm font-semibold text-gray-700";
const PRO_ROLES = ["agent", "landlord"];
const ID_TYPES = ["national_id", "passport", "driver_license", "voter_card"];

const Page = ({ children, max = "max-w-5xl" }) => (
  <div className="min-h-screen bg-gray-50/70"><div className={`mx-auto ${max} px-5 py-8 lg:px-8 lg:py-12`}>{children}</div></div>
);
const BackBtn = ({ onClick }) => {
  const { t } = useTranslation();
  return <button onClick={onClick} className="mr-inback mb-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-teal-700"><ArrowLeft size={16} /> {t("detail.back")}</button>;
};
// Squelette de chargement (lignes grises animées) au lieu d'un écran vide.
const Spinner = ({ rows = 4 }) => (
  <div className="mx-auto w-full max-w-5xl space-y-3 px-1 py-6" aria-busy="true" aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 rounded-3xl bg-white p-4 ring-1 ring-gray-100">
        <div className="mr-skel h-14 w-14 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="mr-skel h-4" style={{ width: `${70 - i * 8}%` }} />
          <div className="mr-skel h-3 w-1/2" />
        </div>
        <div className="mr-skel hidden h-8 w-20 rounded-full sm:block" />
      </div>
    ))}
  </div>
);

// ---------------- Photos : galerie ou appareil photo ----------------
// Réduit chaque photo (max 1600 px, JPEG) avant l'envoi : rapide même en 3G.
async function shrinkImage(file, max = 1600, quality = 0.82) {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], `${(file.name || "photo").replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file; // format non décodable par le navigateur : envoyé tel quel
  } finally {
    URL.revokeObjectURL(src);
  }
}

/**
 * photos : [{ url }] (déjà en ligne) ou [{ file, preview }] (à envoyer).
 * Deux boutons : Galerie (sélection multiple) et Caméra (appareil photo du téléphone).
 */
export function PhotoPicker({ photos, onChange, max = 8 }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const inputRef = React.useRef(null);
  const add = async (fileList) => {
    const files = [...(fileList || [])].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!files.length) return;
    setBusy(true);
    const room = Math.max(0, max - photos.length);
    const shrunk = await Promise.all(files.slice(0, room).map((f) => shrinkImage(f)));
    onChange([...photos, ...shrunk.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    setBusy(false);
  };
  const remove = (i) => {
    const p = photos[i];
    if (p.preview) URL.revokeObjectURL(p.preview);
    onChange(photos.filter((_, k) => k !== i));
  };
  const full = photos.length >= max;
  return (
    <div>
      {/* Un seul bouton : sur téléphone, le système propose Galerie / Appareil photo / Fichiers
          et demande l'autorisation d'accès si nécessaire. Sélection multiple possible. */}
      <button type="button" disabled={full || busy} onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/40 py-6 text-teal-800 transition hover:border-teal-400 hover:bg-teal-50 disabled:opacity-50">
        <Upload size={24} />
        <span className="text-sm font-bold">{t("pro.photos.upload")}</span>
        <span className="text-xs text-teal-700/70">{t("pro.photos.uploadSub")}</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p.url || p.preview} className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-gray-200">
              <img src={p.url || p.preview} alt={`${t("pro.photos.photo")} ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold text-white">{t("pro.photos.cover")}</span>}
              <button type="button" onClick={() => remove(i)} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-gray-900/70 text-white hover:bg-rose-600" aria-label={t("pro.photos.remove")}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-gray-500">{busy ? t("pro.photos.preparing") : t("pro.photos.hint", { count: photos.length, max })}</p>
    </div>
  );
}

// ---------------- Badge de statut d'une annonce ----------------
export function StatusBadge({ status, className = "" }) {
  const { t } = useTranslation();
  if (!status || status === "available") return null;
  return <span className={`rounded-full px-3 py-1 text-xs font-extrabold text-white shadow ${status === "sold" ? "bg-rose-600" : "bg-gray-900/80"} ${className}`}>{t(`pro.status.${status}`)}</span>;
}

// ---------------- Badge de vérification ----------------
function VerifBadge({ state }) {
  const { t } = useTranslation();
  const map = {
    approved: ["bg-teal-50 text-teal-700 ring-teal-100", <BadgeCheck key="i" size={14} />],
    pending: ["bg-amber-50 text-amber-700 ring-amber-100", <Clock key="i" size={14} />],
    rejected: ["bg-rose-50 text-rose-700 ring-rose-100", <XCircle key="i" size={14} />],
    none: ["bg-gray-100 text-gray-600 ring-gray-200", <ShieldCheck key="i" size={14} />],
  };
  const [cls, ic] = map[state] || map.none;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${cls}`}>{ic} {t(`pro.verif.${state || "none"}`)}</span>;
}

// =============================================================
// 1) Choix du rôle juste après l'inscription
// =============================================================
export function RolePickerModal() {
  const { user, chooseRole, navigate, logout } = useApp();
  const { t } = useTranslation();
  const [pick, setPick] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!user || user.roleChosen || user.role === "admin") return null;
  const options = [
    ["tenant", <Search key="i" size={24} />, "from-teal-600 to-teal-800"],
    ["agent", <Briefcase key="i" size={24} />, "from-amber-500 to-amber-700"],
    ["landlord", <KeyRound key="i" size={24} />, "from-gray-700 to-gray-900"],
  ];
  const confirm = async () => {
    if (!pick) return;
    setBusy(true); setErr("");
    const r = await chooseRole(pick);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    if (PRO_ROLES.includes(pick)) navigate("onboarding");
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="flex justify-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white"><Home size={22} /></span></div>
        <h2 className="mr-display mt-4 text-center text-2xl font-extrabold text-gray-900">{t("pro.picker.title", { name: user.name?.split(" ")[0] || "" })}</h2>
        <p className="mt-1 text-center text-sm text-gray-500">{t("pro.picker.subtitle")}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {options.map(([k, ic, grad]) => (
            <button key={k} onClick={() => setPick(k)} className={`relative flex flex-col rounded-3xl p-4 text-left ring-2 transition ${pick === k ? "bg-teal-50/60 ring-teal-600" : "bg-white ring-gray-100 hover:ring-teal-200"}`}>
              {pick === k && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-teal-700 text-white"><Check size={14} strokeWidth={3} /></span>}
              <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white ${grad}`}>{ic}</span>
              <span className="mr-display mt-3 font-extrabold text-gray-900">{t(`pro.picker.${k}.title`)}</span>
              <span className="mt-1 text-xs leading-relaxed text-gray-500">{t(`pro.picker.${k}.desc`)}</span>
              {PRO_ROLES.includes(k) && <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700"><ShieldCheck size={12} /> {t("pro.picker.needsVerif")}</span>}
            </button>
          ))}
        </div>
        {err && <p className="mt-4 text-center text-xs font-semibold text-rose-600">{err}</p>}
        <Btn variant="solid" className="mt-6 w-full py-3.5" disabled={!pick || busy} onClick={confirm}>{busy ? "…" : t("pro.picker.continue")}</Btn>
        <p className="mt-3 text-center text-xs text-gray-400">{t("pro.picker.final")} · <button onClick={logout} className="font-semibold text-gray-500 underline">{t("shell.profile.signOut")}</button></p>
      </div>
    </div>
  );
}

// =============================================================
// 2) Profil professionnel (soumis à la vérification de l'admin)
// =============================================================
const EMPTY_PRO = { fullName: "", phone: "", address: "", city: "Conakry", idType: "national_id", idNumber: "", yearsExperience: "", agencyName: "", licenseNumber: "", bio: "" };

export function ProOnboardingPage() {
  const { user, navigate, showToast, refreshUser, hasApi, openAuth } = useApp();
  const { t } = useTranslation();
  const [f, setF] = useState(null);
  const [existing, setExisting] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const isAgent = user?.role === "agent";

  useEffect(() => {
    if (!user || !hasApi) return;
    ProAPI.me()
      .then((r) => {
        setExisting(r.profile);
        const p = r.profile;
        setF(p ? { ...EMPTY_PRO, ...p, idNumber: "", yearsExperience: String(p.yearsExperience ?? ""), agencyName: p.agencyName || "", licenseNumber: p.licenseNumber || "", bio: p.bio || "" }
          : { ...EMPTY_PRO, fullName: user.name || "", phone: user.phone || "" });
      })
      .catch(() => setF({ ...EMPTY_PRO, fullName: user.name || "" }));
  }, [user?.id, hasApi]);

  if (!user) return <Page max="max-w-md"><div className="text-center"><Btn variant="solid" className="px-6 py-3" onClick={openAuth}>{t("shell.signIn")}</Btn></div></Page>;
  if (!hasApi) return <Page max="max-w-md"><p className="text-center text-gray-500">{t("shell.admin.needBackend")}</p></Page>;
  if (!PRO_ROLES.includes(user.role)) return <Page max="max-w-md"><p className="text-center text-gray-500">{t("pro.onboarding.notPro")}</p></Page>;
  if (!f) return <Spinner />;

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const validate = () => {
    const e = {};
    if (f.fullName.trim().length < 3) e.fullName = t("pro.onboarding.errors.fullName");
    if (f.phone.trim().length < 6) e.phone = t("pro.onboarding.errors.phone");
    if (f.address.trim().length < 4) e.address = t("pro.onboarding.errors.address");
    if (!existing && f.idNumber.trim().length < 4) e.idNumber = t("pro.onboarding.errors.idNumber");
    if (f.idNumber && f.idNumber.trim().length > 0 && f.idNumber.trim().length < 4) e.idNumber = t("pro.onboarding.errors.idNumber");
    if (isAgent && (f.yearsExperience === "" || Number(f.yearsExperience) < 0)) e.yearsExperience = t("pro.onboarding.errors.experience");
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const submit = async () => {
    setServerErr("");
    if (!validate()) return;
    setBusy(true);
    try {
      const r = await ProAPI.save({
        fullName: f.fullName.trim(), phone: f.phone.trim(), address: f.address.trim(), city: f.city,
        idType: f.idType, ...(f.idNumber.trim() ? { idNumber: f.idNumber.trim() } : {}),
        yearsExperience: isAgent ? Number(f.yearsExperience) || 0 : 0,
        agencyName: f.agencyName.trim() || null, licenseNumber: f.licenseNumber.trim() || null, bio: f.bio.trim() || null,
      });
      refreshUser({ verification: r.verification, phone: f.phone.trim() });
      showToast(t("pro.onboarding.submitted"));
      navigate("dashboard");
    } catch (e) { setServerErr(e.message); }
    setBusy(false);
  };
  const Err = ({ k }) => (errors[k] ? <p className="mt-1 text-xs text-rose-500">{errors[k]}</p> : null);

  return (
    <Page max="max-w-3xl">
      <BackBtn onClick={() => navigate("dashboard")} />
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
        <div className="flex flex-wrap items-center gap-2"><VerifBadge state={user.verification} /><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">{t(`pro.roles.${user.role}`)}</span></div>
        <h1 className="mr-display mt-4 text-2xl font-extrabold text-gray-900 sm:text-3xl">{t(isAgent ? "pro.onboarding.titleAgent" : "pro.onboarding.titleLandlord")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("pro.onboarding.subtitle")}</p>
        {user.verification === "rejected" && existing?.rejectionReason && (
          <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-100"><b>{t("pro.onboarding.rejectedBecause")}</b> {existing.rejectionReason}</div>
        )}
        <div className="mt-7 space-y-6">
          <section>
            <h2 className="mr-display text-sm font-extrabold uppercase tracking-wide text-teal-700">{t("pro.onboarding.sectionIdentity")}</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className={lab}>{t("pro.onboarding.fullName")} *</label><input className={inp} value={f.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder={t("pro.onboarding.fullNamePh")} /><Err k="fullName" /></div>
              <div><label className={lab}>{t("pro.onboarding.phone")} *</label><input className={inp} inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+224 6xx xx xx xx" /><Err k="phone" /></div>
              <div><label className={lab}>{t("pro.onboarding.city")} *</label><select className={sel} value={f.city} onChange={(e) => set("city", e.target.value)}>{VILLES_KEYS.map((c) => <option key={c} value={c}>{t(`cities.${c}`)}</option>)}</select></div>
              <div className="sm:col-span-2"><label className={lab}>{t("pro.onboarding.address")} *</label><input className={inp} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder={t("pro.onboarding.addressPh")} /><Err k="address" /></div>
            </div>
          </section>
          <section>
            <h2 className="mr-display text-sm font-extrabold uppercase tracking-wide text-teal-700">{t("pro.onboarding.sectionId")}</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div><label className={lab}>{t("pro.onboarding.idType")} *</label><select className={sel} value={f.idType} onChange={(e) => set("idType", e.target.value)}>{ID_TYPES.map((k) => <option key={k} value={k}>{t(`pro.idTypes.${k}`)}</option>)}</select></div>
              <div><label className={lab}>{t("pro.onboarding.idNumber")} {existing ? "" : "*"}</label><input className={inp} autoComplete="off" value={f.idNumber} onChange={(e) => set("idNumber", e.target.value)} placeholder={existing?.idNumberMasked ? t("pro.onboarding.idKeep", { masked: existing.idNumberMasked }) : t("pro.onboarding.idNumberPh")} /><Err k="idNumber" /></div>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500"><Lock size={12} /> {t("pro.onboarding.idPrivacy")}</p>
          </section>
          <section>
            <h2 className="mr-display text-sm font-extrabold uppercase tracking-wide text-teal-700">{t("pro.onboarding.sectionPro")}</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {isAgent && <div><label className={lab}>{t("pro.onboarding.experience")} *</label><input type="number" min="0" className={inp} value={f.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value)} placeholder="3" /><Err k="yearsExperience" /></div>}
              <div><label className={lab}>{t(isAgent ? "pro.onboarding.agency" : "pro.onboarding.company")}</label><input className={inp} value={f.agencyName} onChange={(e) => set("agencyName", e.target.value)} /></div>
              {isAgent && <div><label className={lab}>{t("pro.onboarding.license")}</label><input className={inp} value={f.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} /></div>}
              <div className="sm:col-span-2"><label className={lab}>{t("pro.onboarding.bio")}</label><textarea rows={3} className={inp} value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder={t("pro.onboarding.bioPh")} /></div>
            </div>
          </section>
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100"><Clock size={14} className="mr-1 inline" /> {t("pro.onboarding.reviewNote")}</div>
          {serverErr && <p className="text-sm font-semibold text-rose-600">{serverErr}</p>}
          <Btn variant="solid" className="w-full py-3.5" disabled={busy} onClick={submit}><Check size={18} /> {busy ? "…" : t(existing ? "pro.onboarding.resubmit" : "pro.onboarding.submit")}</Btn>
        </div>
      </div>
    </Page>
  );
}

// =============================================================
// 3) Tableau de bord agent / vendeur
// =============================================================
function Kpi({ icon, label, value, tone = "teal" }) {
  const tones = { teal: "bg-teal-50 text-teal-700", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-500", gray: "bg-gray-100 text-gray-600" };
  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-gray-100">
      <span className={`grid h-10 w-10 place-items-center rounded-2xl ${tones[tone]}`}>{icon}</span>
      <div className="mr-display mt-3 truncate text-xl font-extrabold text-gray-900">{value}</div>
      <div className="truncate text-xs font-medium text-gray-500">{label}</div>
    </div>
  );
}

function VerificationBanner({ state, onAction }) {
  const { t } = useTranslation();
  if (state === "approved") return null;
  const cfg = {
    none: ["bg-teal-700 text-white", "pro.banner.noneTitle", "pro.banner.noneText", "pro.banner.noneCta"],
    pending: ["bg-amber-50 text-amber-800 ring-1 ring-amber-200", "pro.banner.pendingTitle", "pro.banner.pendingText", "pro.banner.pendingCta"],
    rejected: ["bg-rose-50 text-rose-800 ring-1 ring-rose-200", "pro.banner.rejectedTitle", "pro.banner.rejectedText", "pro.banner.rejectedCta"],
  }[state || "none"];
  return (
    <div className={`mt-5 flex flex-col gap-3 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between ${cfg[0]}`}>
      <div><div className="mr-display font-extrabold">{t(cfg[1])}</div><p className="mt-1 text-sm opacity-90">{t(cfg[2])}</p></div>
      <button onClick={onAction} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold ${state === "none" ? "bg-amber-500 text-teal-900" : "bg-white text-gray-800 ring-1 ring-gray-200"}`}>{t(cfg[3])}</button>
    </div>
  );
}

function CloseDealPanel({ p, onDone, onCancel }) {
  const { t } = useTranslation();
  const isSale = p.rentalType === "Vente";
  const [status, setStatus] = useState(isSale ? "sold" : "rented");
  const [amount, setAmount] = useState(String(p.price));
  return (
    <div className="mt-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
      <div className="text-sm font-bold text-gray-800">{t("pro.dash.closeTitle")}</div>
      <div className="mt-3 flex gap-2">
        {["rented", "sold"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`flex-1 rounded-xl py-2 text-sm font-bold ${status === s ? "bg-teal-700 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"}`}>{t(`pro.status.${s}`)}</button>
        ))}
      </div>
      <label className="mt-3 block text-xs font-semibold text-gray-500">{t("pro.dash.finalAmount")}</label>
      <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inp} mt-1`} />
      <p className="mt-1 text-[11px] text-gray-400">{t("pro.dash.finalAmountHint")}</p>
      <div className="mt-3 flex gap-2">
        <Btn variant="solid" className="flex-1 py-2.5 text-sm" onClick={() => onDone(status, Number(amount) || p.price)}><CheckCircle2 size={16} /> {t("pro.dash.confirm")}</Btn>
        <Btn variant="ghost" className="px-4 py-2.5 text-sm" onClick={onCancel}>{t("post.form.cancel")}</Btn>
      </div>
    </div>
  );
}

function DashListing({ p, onChanged, onDeleted }) {
  const { navigate, showToast } = useApp();
  const { t } = useTranslation();
  const [mode, setMode] = useState(null); // 'close' | 'delete'
  const [busy, setBusy] = useState(false);
  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); showToast(t(msg)); } catch (e) { showToast(e.message); }
    setBusy(false); setMode(null);
  };
  const closeDeal = (status, amount) => run(async () => { const r = await PropertyAPI.setStatus(p.id, status, amount); onChanged({ ...p, ...r.property }); }, "pro.dash.closedToast");
  const reopen = () => run(async () => { const r = await PropertyAPI.setStatus(p.id, "available"); onChanged({ ...p, ...r.property }); }, "pro.dash.reopenedToast");
  const remove = () => run(async () => { await PropertyAPI.remove(p.id); onDeleted(p.id); }, "pro.dash.deletedToast");
  const closed = p.status !== "available";
  const metric = (ic, v, label) => <span className="flex items-center gap-1" title={label}>{ic} <b className="text-gray-800">{v}</b></span>;
  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-gray-100">
      <div className="flex gap-4">
        <button onClick={() => navigate("detail", { id: p.id })} className="relative h-24 w-28 shrink-0 overflow-hidden rounded-2xl bg-gray-100 sm:h-28 sm:w-40">
          <img src={coverOf(fromApi(p))} alt={p.title} className={`h-full w-full object-cover ${closed ? "opacity-60" : ""}`} />
          <StatusBadge status={p.status} className="absolute left-2 top-2 !px-2 !py-0.5 !text-[10px]" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button onClick={() => navigate("detail", { id: p.id })} className="mr-display truncate text-left font-bold text-gray-900 hover:text-teal-700">{p.title}</button>
            <span className="mr-display shrink-0 text-sm font-extrabold text-teal-700">{formatGNF(closed && p.dealPrice ? p.dealPrice : p.price)}</span>
          </div>
          <p className="truncate text-xs text-gray-500">{t(`types.${p.type}`)} · {p.neighborhood ? `${p.neighborhood}, ` : ""}{t(`cities.${p.city}`)}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {metric(<Eye size={13} className="text-teal-600" />, p.views, t("shell.stats.views"))}
            {metric(<Heart size={13} className="text-rose-500" />, p.favoritesCount, t("shell.stats.saves"))}
            {metric(<MessageSquare size={13} className="text-amber-600" />, p.messagesCount, t("pro.dash.messages"))}
            {closed && p.closedAt && <span>{t("pro.dash.closedOn", { date: fmtDate(p.closedAt) })}</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {!closed && <button disabled={busy} onClick={() => setMode(mode === "close" ? null : "close")} className="inline-flex items-center gap-1 rounded-full bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800"><CheckCircle2 size={13} /> {t("pro.dash.markClosed")}</button>}
            {closed && <button disabled={busy} onClick={reopen} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-teal-700 ring-1 ring-teal-200"><RotateCcw size={13} /> {t("pro.dash.reopen")}</button>}
            <button onClick={() => navigate("post", { editId: p.id })} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 ring-1 ring-gray-200"><Pencil size={13} /> {t("pro.dash.edit")}</button>
            <button onClick={() => setMode(mode === "delete" ? null : "delete")} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-rose-600 ring-1 ring-rose-200"><Trash2 size={13} /> {t("pro.dash.delete")}</button>
          </div>
        </div>
      </div>
      {mode === "close" && <CloseDealPanel p={p} onDone={closeDeal} onCancel={() => setMode(null)} />}
      {mode === "delete" && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-100 sm:flex-row sm:items-center sm:justify-between">
          <span>{t("pro.dash.deleteConfirm")}</span>
          <span className="flex gap-2">
            <button disabled={busy} onClick={remove} className="rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white">{t("pro.dash.deleteYes")}</button>
            <button onClick={() => setMode(null)} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-700 ring-1 ring-gray-200">{t("post.form.cancel")}</button>
          </span>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { user, navigate, hasApi, openAuth, refreshUser, reloadProperties } = useApp();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all");
  const load = () => ProAPI.dashboard().then((r) => { setData(r); if (r.verification !== user?.verification) refreshUser({ verification: r.verification }); }).catch((e) => setErr(e.message));
  useEffect(() => { if (user && hasApi) load(); }, [user?.id, hasApi]);

  if (!user) return <Page max="max-w-md"><div className="text-center"><Btn variant="solid" className="px-6 py-3" onClick={openAuth}>{t("shell.signIn")}</Btn></div></Page>;
  if (!hasApi) return <Page max="max-w-md"><p className="text-center text-gray-500">{t("shell.admin.needBackend")}</p></Page>;
  if (![...PRO_ROLES, "admin"].includes(user.role)) return <Page max="max-w-md"><p className="text-center text-gray-500">{t("pro.onboarding.notPro")}</p></Page>;
  if (err) return <Page max="max-w-md"><p className="text-center text-rose-600">{err}</p></Page>;
  if (!data) return <Spinner />;

  const s = data.stats;
  const state = user.role === "admin" ? "approved" : data.verification;
  const canPublish = state === "approved";
  const list = data.properties.filter((p) => filter === "all" || (filter === "active" ? p.status === "available" : p.status !== "available"));
  const patch = (np) => { setData((d) => ({ ...d, properties: d.properties.map((x) => (x.id === np.id ? np : x)) })); load(); reloadProperties(); };
  const drop = (id) => { setData((d) => ({ ...d, properties: d.properties.filter((x) => x.id !== id) })); load(); reloadProperties(); };

  return (
    <Page>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} src={user.avatar} size={56} />
          <div className="min-w-0">
            <h1 className="mr-display truncate text-2xl font-extrabold text-gray-900">{t("pro.dash.title")}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-sm text-gray-500">{user.name} · {t(`pro.roles.${user.role}`)}</span><VerifBadge state={state} /></div>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" className="px-4 py-2.5 text-sm" onClick={() => navigate("agent", { id: user.id })}><Eye size={15} /> {t("pro.dash.publicProfile")}</Btn>
          <Btn variant="solid" className="px-4 py-2.5 text-sm" disabled={!canPublish} onClick={() => navigate("post")}><Plus size={15} /> {t("nav.postListing")}</Btn>
        </div>
      </div>
      {user.role !== "admin" && <VerificationBanner state={state} onAction={() => navigate("onboarding")} />}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<Home size={19} />} label={t("pro.dash.kpi.active")} value={`${s.active} / ${s.listings}`} />
        <Kpi icon={<Eye size={19} />} label={t("pro.dash.kpi.views")} value={s.views.toLocaleString("fr-FR")} tone="gray" />
        <Kpi icon={<Heart size={19} />} label={t("pro.dash.kpi.favorites")} value={s.favorites} tone="rose" />
        <Kpi icon={<MessageSquare size={19} />} label={t("pro.dash.kpi.messages")} value={s.messages} tone="amber" />
        <Kpi icon={<CheckCircle2 size={19} />} label={t("pro.dash.kpi.closed")} value={`${s.closed}`} />
        <Kpi icon={<KeyRound size={19} />} label={t("pro.dash.kpi.rentedValue", { count: s.rented })} value={formatGNF(s.rentedValue)} tone="amber" />
        <Kpi icon={<Building2 size={19} />} label={t("pro.dash.kpi.soldValue", { count: s.sold })} value={formatGNF(s.soldValue)} tone="rose" />
        <Kpi icon={<Star size={19} />} label={t("pro.dash.kpi.rating", { count: s.reviewCount })} value={s.reviewCount ? s.rating.toFixed(1) : "—"} tone="amber" />
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="mr-display text-xl font-extrabold text-gray-900">{t("pro.dash.myListings")}</h2>
        <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-gray-200">
          {["all", "active", "closed"].map((k) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === k ? "bg-teal-700 text-white" : "text-gray-500"}`}>{t(`pro.dash.filter.${k}`)}</button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-3xl bg-white py-14 text-center ring-1 ring-gray-100">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-teal-50 text-teal-700"><Home size={24} /></span>
          <p className="mt-4 max-w-sm text-sm text-gray-500">{t(canPublish ? "pro.dash.emptyApproved" : "pro.dash.emptyPending")}</p>
          {canPublish && <Btn variant="solid" className="mt-4 px-5 py-2.5 text-sm" onClick={() => navigate("post")}><Plus size={15} /> {t("nav.postListing")}</Btn>}
        </div>
      ) : (
        <div className="mt-4 space-y-3">{list.map((p) => <DashListing key={p.id} p={p} onChanged={patch} onDeleted={drop} />)}</div>
      )}
    </Page>
  );
}

// =============================================================
// 4) Classement des meilleurs agents / vendeurs
// =============================================================
export function RankingPage() {
  const { navigate, hasApi, route } = useApp();
  const { t } = useTranslation();
  const [kind, setKind] = useState(route.kind === "landlord" ? "landlord" : "agent");
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (!hasApi) return;
    setRows(null);
    AgentAPI.leaderboard(kind).then((r) => setRows(r.leaderboard || [])).catch(() => setRows([]));
  }, [kind, hasApi]);
  if (!hasApi) return <Page max="max-w-md"><p className="text-center text-gray-500">{t("shell.admin.needBackend")}</p></Page>;
  const medal = ["bg-amber-400 text-amber-950", "bg-gray-300 text-gray-800", "bg-orange-300 text-orange-950"];
  return (
    <Page max="max-w-3xl">
      <BackBtn onClick={() => navigate("discover")} />
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 text-teal-900"><Trophy size={24} /></span>
        <div><h1 className="mr-display text-2xl font-extrabold text-gray-900 sm:text-3xl">{t("pro.rank.title")}</h1><p className="text-sm text-gray-500">{t("pro.rank.subtitle")}</p></div>
      </div>
      <div className="mt-5 inline-flex gap-1 rounded-xl bg-white p-1 ring-1 ring-gray-200">
        {["agent", "landlord"].map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-lg px-4 py-2 text-sm font-bold ${kind === k ? "bg-teal-700 text-white" : "text-gray-500"}`}>{t(`pro.rank.tab.${k}`)}</button>
        ))}
      </div>
      {!rows ? <Spinner /> : rows.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-white py-14 text-center text-sm text-gray-500 ring-1 ring-gray-100">{t("pro.rank.empty")}</div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((r) => {
            const top = r.rank <= 3;
            const ring = ["ring-amber-300", "ring-gray-300", "ring-orange-300"][r.rank - 1] || "ring-gray-100";
            const stat = (value, label, tone = "text-gray-900") => (
              <div className="rounded-2xl bg-gray-50 px-3 py-3 text-center ring-1 ring-gray-100">
                <div className={`mr-display truncate text-lg font-extrabold sm:text-xl ${tone}`}>{value}</div>
                <div className="mt-0.5 truncate text-[11px] font-medium text-gray-500 sm:text-xs">{label}</div>
              </div>
            );
            return (
              <button key={r.id} onClick={() => navigate("agent", { id: r.id })} className={`block w-full rounded-3xl bg-white p-5 text-left shadow-sm ring-2 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6 ${ring}`}>
                <div className="flex items-center gap-4 sm:gap-5">
                  <span className={`mr-display grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-extrabold sm:h-14 sm:w-14 sm:text-xl ${medal[r.rank - 1] || "bg-gray-100 text-gray-500"}`}>{top ? <Trophy size={22} /> : r.rank}</span>
                  <Avatar name={r.name} src={r.avatar} size={80} className="ring-4 ring-teal-50" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-display truncate text-xl font-extrabold text-gray-900 sm:text-2xl">{r.name}</span>
                      {r.verified && <BadgeCheck size={20} className="shrink-0 text-teal-600" />}
                    </span>
                    {r.username && <span className="block text-sm font-semibold text-gray-400">@{r.username}</span>}
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700">#{r.rank} · {t(`pro.roles.${r.role}`)}</span>
                      {r.city && <span className="text-sm text-gray-500">{t(`cities.${r.city}`)}</span>}
                      {r.agencyName && <span className="text-sm text-gray-500">· {r.agencyName}</span>}
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-sm text-gray-600"><Stars value={r.stats.rating} size={18} /> {r.stats.reviewCount ? <b>{r.stats.rating.toFixed(1)}</b> : null} <span className="text-gray-400">{r.stats.reviewCount ? `(${r.stats.reviewCount} ${t("agent.reviews")})` : t("pro.rank.noReviews")}</span></span>
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {stat(r.stats.closed, t("pro.profile.deals"), "text-teal-700")}
                  {stat(formatGNF(r.stats.soldValue), t("pro.profile.soldTotal", { count: r.stats.sold }))}
                  {stat(formatGNF(r.stats.rentedValue), t("pro.profile.rentedTotal", { count: r.stats.rented }))}
                  {stat(r.stats.active, t("pro.profile.activeListings"))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-teal-700 px-4 py-3 text-white">
                  <span className="text-xs font-semibold text-white/75 sm:text-sm">{t("pro.profile.totalWorth")}</span>
                  <span className="mr-display text-lg font-extrabold sm:text-xl">{formatGNF(r.stats.totalValue)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-center text-xs text-gray-400">{t("pro.rank.howRanked")}</p>
    </Page>
  );
}

// =============================================================
// 5) Profil public d'un agent / vendeur (données réelles)
// =============================================================
export function ProPublicProfile({ id }) {
  const { navigate, back, user, openAuth, startConversation } = useApp();
  const { t } = useTranslation();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { setD(null); setErr(false); AgentAPI.get(id).then(setD).catch(() => setErr(true)); }, [id]);
  const listings = useMemo(() => (d ? d.properties.map(fromApi) : []), [d]);
  if (err) return <div className="mx-auto max-w-2xl px-5 py-24 text-center text-gray-500">{t("agent.notFound")}</div>;
  if (!d) return <Spinner />;
  const a = d.agent;
  const s = d.stats;
  const active = listings.filter((p) => p.status === "available");
  const closed = listings.filter((p) => p.status !== "available");
  return (
    <Page>
      <BackBtn onClick={back} />
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar name={a.name} src={a.avatar} size={80} className="!rounded-3xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="mr-display text-2xl font-extrabold text-gray-900">{a.name}</h1>{a.username && <span className="text-sm font-semibold text-gray-400">@{a.username}</span>}{a.verified && <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700 ring-1 ring-teal-100"><BadgeCheck size={13} /> {t("pro.verif.approved")}</span>}{d.rank && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-100"><Trophy size={12} /> {t("pro.profile.rank", { rank: d.rank, kind: t(`pro.rank.tab.${a.role}`) })}</span>}</div>
            <p className="mt-1 text-sm text-gray-500">{[t(`pro.roles.${a.role}`), a.agencyName, a.city && t(`cities.${a.city}`), a.yearsExperience ? t("pro.profile.years", { count: a.yearsExperience }) : null, t("agent.memberSince", { year: new Date(a.memberSince).getFullYear() })].filter(Boolean).join(" · ")}</p>
            <div className="mt-3 flex items-center gap-2"><Stars value={s.rating} /> <span className="text-sm font-semibold text-gray-700">{s.reviewCount ? s.rating.toFixed(1) : "—"}</span> <span className="text-sm text-gray-400">({s.reviewCount} {t("agent.reviews")})</span></div>
            {a.bio && <p className="mt-3 max-w-xl text-sm text-gray-600">{a.bio}</p>}
          </div>
          {active.length > 0 && user?.id !== a.id && (
            <button onClick={() => { if (!user) return openAuth(); Promise.resolve(startConversation(active[0])).then((cid) => cid && navigate("messages", { conv: cid })); }} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800"><MessageSquare size={16} /> {t("detail.sendMessage")}</button>
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-gray-100 pt-6 sm:grid-cols-4">
          {[
            [t("pro.profile.deals"), s.closed],
            [t("pro.profile.soldTotal", { count: s.sold }), formatGNF(s.soldValue)],
            [t("pro.profile.rentedTotal", { count: s.rented }), formatGNF(s.rentedValue)],
            [t("pro.profile.activeListings"), s.active],
          ].map(([label, v]) => (
            <div key={label} className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100"><div className="mr-display text-xl font-extrabold text-teal-700">{v}</div><div className="mt-0.5 text-xs font-medium text-gray-500">{label}</div></div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl bg-teal-700 p-4 text-white"><div className="text-xs font-semibold text-white/70">{t("pro.profile.totalWorth")}</div><div className="mr-display text-2xl font-extrabold">{formatGNF(s.totalValue)}</div></div>
      </div>
      {active.length > 0 && (
        <div className="mt-8"><h2 className="mr-display text-xl font-bold text-gray-900">{t("agent.listingsTitle")}</h2><div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{active.map((p, i) => <PropertyCard key={p.id} p={p} delay={i * 60} />)}</div></div>
      )}
      {closed.length > 0 && (
        <div className="mt-8"><h2 className="mr-display text-xl font-bold text-gray-900">{t("pro.profile.closedTitle")}</h2><div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{closed.map((p, i) => <PropertyCard key={p.id} p={p} delay={i * 60} />)}</div></div>
      )}
      <div className="mt-10"><ReviewsBlock agentId={id} /></div>
    </Page>
  );
}

// =============================================================
// 6) Admin : file de vérification des agents / vendeurs
// =============================================================
export function AdminVerifications() {
  const { showToast } = useApp();
  const { t } = useTranslation();
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState(null);
  const [reject, setReject] = useState({}); // userId -> reason (panneau ouvert)
  const [busy, setBusy] = useState(null);
  const load = () => { setRows(null); AdminAPI.verifications(status).then((r) => setRows(r.verifications || [])).catch(() => setRows([])); };
  useEffect(load, [status]);
  const decide = async (userId, decision) => {
    setBusy(userId);
    try {
      await AdminAPI.decideVerification(userId, decision, reject[userId] || "");
      showToast(t(decision === "approve" ? "pro.admin.approvedToast" : "pro.admin.rejectedToast"));
      setRows((rs) => rs.filter((r) => r.userId !== userId));
    } catch (e) { showToast(e.message); }
    setBusy(null);
  };
  const row = (label, v) => (v || v === 0 ? <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt><dd className="text-sm font-medium text-gray-800">{v}</dd></div> : null);
  return (
    <div className="mt-6">
      <p className="text-sm text-gray-500">{t("pro.admin.subtitle")}</p>
      <div className="mt-3 inline-flex gap-1 rounded-xl bg-white p-1 ring-1 ring-gray-200">
        {["pending", "approved", "rejected"].map((k) => (
          <button key={k} onClick={() => setStatus(k)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${status === k ? "bg-teal-700 text-white" : "text-gray-500"}`}>{t(`pro.verif.${k}`)}</button>
        ))}
      </div>
      {!rows ? <Spinner /> : rows.length === 0 ? (
        <div className="mt-4 rounded-3xl bg-white py-12 text-center text-sm text-gray-400 ring-1 ring-gray-100">{t("pro.admin.empty")}</div>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map((r) => {
            const p = r.profile;
            const open = reject[r.userId] !== undefined;
            return (
              <div key={r.userId} className="rounded-3xl bg-white p-5 ring-1 ring-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3"><Avatar name={r.name} size={44} /><div><div className="mr-display font-extrabold text-gray-900">{p.fullName}</div><div className="text-xs text-gray-500">{r.email} · {t(`pro.roles.${r.role}`)}</div></div></div>
                  <VerifBadge state={r.verification} />
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  {row(t("pro.onboarding.phone"), p.phone)}
                  {row(t("pro.onboarding.city"), t(`cities.${p.city}`))}
                  {row(t("pro.onboarding.address"), p.address)}
                  {row(t("pro.onboarding.idType"), t(`pro.idTypes.${p.idType}`))}
                  {row(t("pro.onboarding.idNumber"), p.idNumber)}
                  {r.role === "agent" && row(t("pro.onboarding.experience"), p.yearsExperience)}
                  {row(t("pro.onboarding.agency"), p.agencyName)}
                  {row(t("pro.onboarding.license"), p.licenseNumber)}
                  {row(t("pro.admin.submitted"), fmtDate(p.submittedAt))}
                </dl>
                {p.bio && <p className="mt-3 rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">{p.bio}</p>}
                {status === "rejected" && p.rejectionReason && <p className="mt-3 text-sm text-rose-700"><b>{t("pro.onboarding.rejectedBecause")}</b> {p.rejectionReason}</p>}
                {open && (
                  <textarea rows={2} autoFocus value={reject[r.userId]} onChange={(e) => setReject((m) => ({ ...m, [r.userId]: e.target.value }))} placeholder={t("pro.admin.reasonPh")} className={`${inp} mt-4`} />
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {status !== "approved" && !open && <Btn variant="solid" className="px-5 py-2.5 text-sm" disabled={busy === r.userId} onClick={() => decide(r.userId, "approve")}><Check size={16} /> {t("pro.admin.approve")}</Btn>}
                  {status !== "rejected" && (open
                    ? <><button disabled={busy === r.userId || !reject[r.userId]?.trim()} onClick={() => decide(r.userId, "reject")} className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{t("pro.admin.confirmReject")}</button><button onClick={() => setReject((m) => { const n = { ...m }; delete n[r.userId]; return n; })} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-gray-600 ring-1 ring-gray-200"><X size={14} className="inline" /> {t("post.form.cancel")}</button></>
                    : <button onClick={() => setReject((m) => ({ ...m, [r.userId]: "" }))} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-rose-600 ring-1 ring-rose-200">{t("pro.admin.reject")}</button>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================
// 7) Nouveau mot de passe (lien reçu par e-mail)
// =============================================================
export function ResetPasswordPage() {
  const { route, navigate, openAuth } = useApp();
  const { t } = useTranslation();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const submit = async () => {
    setErr("");
    if (pw.length < 6) return setErr(t("pro.reset.tooShort"));
    if (pw !== pw2) return setErr(t("pro.reset.mismatch"));
    setBusy(true);
    try {
      await AuthAPI.resetPassword(route.token, pw);
      setDone(true);
      try { window.history.replaceState(null, "", "/"); } catch { /* ignore */ }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <Page max="max-w-md">
      <div className="rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-gray-100">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700">{done ? <CheckCircle2 size={26} /> : <Lock size={24} />}</span>
        <h1 className="mr-display mt-4 text-2xl font-extrabold text-gray-900">{t(done ? "pro.reset.doneTitle" : "pro.reset.title")}</h1>
        {done ? (
          <>
            <p className="mt-2 text-sm text-gray-500">{t("pro.reset.doneText")}</p>
            <Btn variant="solid" className="mt-6 w-full py-3.5" onClick={() => { navigate("home"); openAuth(); }}>{t("auth.login")}</Btn>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-500">{t("pro.reset.subtitle")}</p>
            <input type="password" autoComplete="new-password" className={`${inp} mt-5`} placeholder={t("pro.reset.newPassword")} value={pw} onChange={(e) => setPw(e.target.value)} />
            <input type="password" autoComplete="new-password" className={`${inp} mt-3`} placeholder={t("pro.reset.confirm")} value={pw2} onChange={(e) => setPw2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            {err && <p className="mt-3 text-xs font-semibold text-rose-600">{err}</p>}
            <Btn variant="solid" className="mt-5 w-full py-3.5" disabled={busy || !route.token} onClick={submit}>{busy ? "…" : t("pro.reset.save")}</Btn>
          </>
        )}
      </div>
    </Page>
  );
}

// =============================================================
// 8) Admin : modération des annonces
// =============================================================
export function AdminListings() {
  const { navigate, showToast, reloadProperties } = useApp();
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const load = (query = q) => AdminAPI.properties({ q: query }).then((r) => setRows(r.properties || [])).catch(() => setRows([]));
  useEffect(() => { load(""); }, []);
  const feature = async (p) => {
    try { await AdminAPI.setFeatured(p.id, !p.featured); setRows((rs) => rs.map((x) => (x.id === p.id ? { ...x, featured: !p.featured } : x))); reloadProperties(); }
    catch (e) { showToast(e.message); }
  };
  const remove = async (id) => {
    try { await AdminAPI.deleteProperty(id); setRows((rs) => rs.filter((x) => x.id !== id)); setConfirmId(null); reloadProperties(); showToast(t("pro.dash.deletedToast")); }
    catch (e) { showToast(e.message); }
  };
  return (
    <div className="mt-6">
      <p className="text-sm text-gray-500">{t("pro.adminListings.subtitle")}</p>
      <input value={q} onChange={(e) => { setQ(e.target.value); load(e.target.value); }} placeholder={t("pro.adminListings.search")} className="mt-3 w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm text-gray-800 ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
      {!rows ? <Spinner /> : rows.length === 0 ? (
        <div className="mt-4 rounded-3xl bg-white py-12 text-center text-sm text-gray-400 ring-1 ring-gray-100">{t("pro.admin.empty")}</div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100">
          {rows.map((p) => (
            <div key={p.id} className="border-b border-gray-50 px-4 py-3 last:border-0">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate("detail", { id: p.id })} className="h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100"><img src={coverOf(fromApi(p))} alt={p.title} className="h-full w-full object-cover" /></button>
                <div className="min-w-0 flex-1">
                  <button onClick={() => navigate("detail", { id: p.id })} className="mr-display block max-w-full truncate text-left text-sm font-bold text-gray-900 hover:text-teal-700">{p.title}</button>
                  <div className="truncate text-xs text-gray-500">{p.landlord?.name} · {p.landlord?.email}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                    <span className="text-teal-700">{formatGNF(p.price)}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-500">{t(`pro.status.${p.status || "available"}`)}</span>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-1 text-gray-500"><Eye size={11} /> {p.views ?? 0}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button onClick={() => feature(p)} title={t("pro.adminListings.feature")} className={`grid h-9 w-9 place-items-center rounded-xl ring-1 ${p.featured ? "bg-amber-500 text-teal-900 ring-amber-500" : "bg-white text-gray-400 ring-gray-200 hover:text-amber-500"}`}><Star size={15} fill={p.featured ? "currentColor" : "none"} /></button>
                  <button onClick={() => setConfirmId(confirmId === p.id ? null : p.id)} title={t("pro.dash.delete")} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-rose-500 ring-1 ring-rose-200 hover:bg-rose-50"><Trash2 size={15} /></button>
                </div>
              </div>
              {confirmId === p.id && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  <span>{t("pro.dash.deleteConfirm")}</span>
                  <span className="flex gap-1.5"><button onClick={() => remove(p.id)} className="rounded-full bg-rose-600 px-3 py-1.5 font-bold text-white">{t("pro.dash.deleteYes")}</button><button onClick={() => setConfirmId(null)} className="rounded-full bg-white px-3 py-1.5 font-bold text-gray-600 ring-1 ring-gray-200">{t("post.form.cancel")}</button></span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================
// 9) Listes de personnes réelles (Découvrir / Favoris → Agents)
// =============================================================
export function PeopleList({ mode = "discover" }) {
  const { navigate, properties, favorites, user, openAuth, startConversation } = useApp();
  const { t } = useTranslation();
  const [people, setPeople] = useState(null);
  useEffect(() => {
    if (mode !== "discover") return;
    Promise.all([AgentAPI.leaderboard("agent"), AgentAPI.leaderboard("landlord")])
      .then(([a, l]) => setPeople([...(a.leaderboard || []), ...(l.leaderboard || [])]))
      .catch(() => setPeople([]));
  }, [mode]);
  // Favoris : les agents / vendeurs des annonces enregistrées.
  const favOwners = useMemo(() => {
    if (mode !== "favorites") return [];
    const seen = new Map();
    for (const p of properties.filter((x) => favorites.includes(x.id) && x.ownerId)) {
      if (!seen.has(p.ownerId)) seen.set(p.ownerId, { id: p.ownerId, name: p.landlordInfo?.name, avatar: p.landlordInfo?.avatar, listing: p, verified: p.ownerVerified });
    }
    return [...seen.values()];
  }, [mode, properties, favorites]);
  const rows = mode === "discover" ? people : favOwners;
  if (!rows) return <Spinner />;
  if (rows.length === 0) {
    return <div className="mt-3 rounded-3xl bg-white px-4 py-10 text-center text-sm text-gray-500 ring-1 ring-gray-100">{t(mode === "discover" ? "pro.rank.empty" : "pro.people.noFavAgents")}</div>;
  }
  return (
    <div className="mt-3 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 border-b border-gray-50 px-4 py-3.5 last:border-0 hover:bg-teal-50/40">
          <button onClick={() => navigate("agent", { id: r.id })} className="shrink-0"><Avatar name={r.name} src={r.avatar} size={44} /></button>
          <button onClick={() => navigate("agent", { id: r.id })} className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-1"><span className="mr-display truncate font-bold text-gray-900">{r.name}</span>{r.verified && <BadgeCheck size={14} className="shrink-0 text-teal-600" />}</span>
            <span className="block truncate text-xs text-gray-500">{mode === "discover"
              ? [t(`pro.roles.${r.role}`), r.city && t(`cities.${r.city}`), r.stats?.closed ? `${r.stats.closed} ${t("pro.rank.deals")}` : null].filter(Boolean).join(" · ")
              : r.listing?.title}</span>
          </button>
          {mode === "favorites" && r.id !== user?.id && (
            <button onClick={() => { if (!user) return openAuth(); Promise.resolve(startConversation(r.listing)).then((cid) => cid && navigate("messages", { conv: cid })); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100" aria-label={t("detail.sendMessage")}><MessageSquare size={17} /></button>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================
// 10) Modifier mon profil : photo, nom, nom d'utilisateur
// =============================================================
export function EditProfilePage() {
  const { user, navigate, showToast, login, hasApi, openAuth, refreshUser } = useApp();
  const { t } = useTranslation();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = React.useRef(null);
  useEffect(() => { setName(user?.name || ""); setUsername(user?.username || ""); }, [user?.id]);
  if (!user) return <Page max="max-w-md"><div className="text-center"><Btn variant="solid" className="px-6 py-3" onClick={openAuth}>{t("shell.signIn")}</Btn></div></Page>;

  const cleanUser = username.trim().replace(/^@/, "").toLowerCase();
  const userOk = !cleanUser || /^[a-z0-9._]{3,30}$/.test(cleanUser);
  const changed = name.trim() !== (user.name || "") || cleanUser !== (user.username || "");
  const apply = (u) => (hasApi ? login(u, { silent: true }) : refreshUser(u));

  const pickPhoto = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    setPhotoBusy(true); setErr("");
    try {
      const small = await shrinkImage(file, 512, 0.85);
      if (hasApi) { const r = await AuthAPI.uploadAvatar(small); apply(r.user); }
      else refreshUser({ avatar: URL.createObjectURL(small) });
      showToast(t("pro.profileEdit.photoSaved"));
    } catch (e) { setErr(e.message); }
    setPhotoBusy(false);
  };
  const removePhoto = async () => {
    setPhotoBusy(true); setErr("");
    try { if (hasApi) { const r = await AuthAPI.removeAvatar(); apply(r.user); } else refreshUser({ avatar: null }); }
    catch (e) { setErr(e.message); }
    setPhotoBusy(false);
  };
  const save = async () => {
    setErr("");
    if (name.trim().length < 2) return setErr(t("pro.profileEdit.nameShort"));
    if (!userOk) return setErr(t("pro.profileEdit.usernameRule"));
    setBusy(true);
    try {
      if (hasApi) { const r = await AuthAPI.updateMe({ name: name.trim(), username: cleanUser || null }); apply(r.user); }
      else refreshUser({ name: name.trim(), username: cleanUser || null });
      showToast(t("pro.profileEdit.saved"));
      navigate("profile");
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <Page max="max-w-xl">
      <BackBtn onClick={() => navigate("profile")} />
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
        <h1 className="mr-display text-2xl font-extrabold text-gray-900">{t("pro.profileEdit.title")}</h1>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="relative">
            <Avatar name={name || user.name} src={user.avatar} size={96} />
            {photoBusy && <span className="absolute inset-0 grid place-items-center rounded-full bg-white/70 text-xs font-bold text-teal-700">…</span>}
          </div>
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Btn variant="solid" className="px-5 py-2.5 text-sm" disabled={photoBusy} onClick={() => fileRef.current?.click()}><Upload size={15} /> {t(user.avatar ? "pro.profileEdit.changePhoto" : "pro.profileEdit.addPhoto")}</Btn>
            {user.avatar && <button onClick={removePhoto} disabled={photoBusy} className="text-xs font-semibold text-rose-600 hover:underline">{t("pro.profileEdit.removePhoto")}</button>}
            <span className="text-xs text-gray-400">{t("pro.profileEdit.photoHint")}</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files); e.target.value = ""; }} />
        </div>
        <div className="mt-7 space-y-5">
          <div><label className={lab}>{t("pro.profileEdit.name")}</label><input className={inp} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
          <div>
            <label className={lab}>{t("pro.profileEdit.username")}</label>
            <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">@</span><input className={`${inp} pl-9 ${userOk ? "" : "ring-rose-400"}`} value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())} placeholder={t("pro.profileEdit.usernamePh")} maxLength={31} autoCapitalize="none" autoCorrect="off" /></div>
            <p className={`mt-1 text-xs ${userOk ? "text-gray-400" : "text-rose-500"}`}>{t("pro.profileEdit.usernameRule")}</p>
          </div>
          <div><label className={lab}>{t("auth.email")}</label><input className={`${inp} text-gray-500`} value={user.email || ""} disabled /></div>
          <div>
            <label className={lab}>{t("pro.profileEdit.accountType")}</label>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200"><span className="text-sm font-bold text-gray-800">{t(`pro.roles.${user.role || "tenant"}`)}</span>{["agent", "landlord"].includes(user.role) && <VerifBadge state={user.verification} />}</div>
            <p className="mt-1 text-xs text-gray-400">{t("pro.profileEdit.roleNote")}</p>
          </div>
          {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
          <Btn variant="solid" className="w-full py-3.5" disabled={busy || !changed || !userOk} onClick={save}><Check size={18} /> {busy ? "…" : t("pro.profileEdit.save")}</Btn>
        </div>
      </div>
    </Page>
  );
}
