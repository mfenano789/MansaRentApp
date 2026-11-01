// ============================================================
// MansaRent — Transactions
//  · Vente        : l'acheteur contacte MansaRent (l'agent reste caché)
//  · Court séjour : réservation avec dates, type Airbnb
//  · Admin        : boîte « Demandes » avec le dossier complet de l'agent
// ============================================================
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck, MessageSquare, CalendarDays, Users, Minus, Plus, Clock, Info, Phone, Mail, MapPin,
  BadgeCheck, ChevronDown, Building2, Contact as IdCard, StickyNote, Send, Check, X, Home, CalendarCheck, MessageCircle,
  CreditCard, Smartphone, Wallet, LoaderCircle as Loader2, CircleCheck, CircleX, RefreshCw, Banknote,
} from "lucide-react";
import { useApp, Btn, Avatar, formatGNF, formatGNFFull } from "./MansaRent.jsx";
import { BookingAPI, LeadAPI, PaymentAPI, PayoutAPI } from "./services/api.js";

// ---- Petits utilitaires ---------------------------------------------------------
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); return dayKey(new Date(y, m - 1, d + n)); };
const nightsOf = (a, b) => (a && b ? Math.round((Date.UTC(...b.split("-").map((v, i) => (i === 1 ? v - 1 : +v))) - Date.UTC(...a.split("-").map((v, i) => (i === 1 ? v - 1 : +v)))) / 86400000) : 0);
const fmtDay = (s, lang) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short" }) : "");
const isHotel = (p) => p?.rentalTypeKey === "rentalTypes.hotel";
const isShort = (p) => p?.rentalTypeKey === "rentalTypes.shortStay" || isHotel(p);
const isSale = (p) => p?.rentalTypeKey === "rentalTypes.sale";

/** Suffixe de prix : « /mois », « /nuit » ou rien pour une vente. */
export function PriceSuffix({ p, className = "text-xs font-medium text-gray-400" }) {
  const { t } = useTranslation();
  if (isSale(p)) return null;
  return <span className={className}>{isShort(p) ? t("deals.perNight") : t("propertyCard.perMonth")}</span>;
}

const card = "rounded-3xl bg-white p-6 shadow-lg ring-1 ring-gray-100";

// =================================================================================
// VENTE — l'acheteur écrit à MansaRent
// =================================================================================
export function SaleContactCard({ p }) {
  const { user, openAuth, startConversation, navigate } = useApp();
  const { t } = useTranslation();
  const [mode, setMode] = useState(null); // null | "visit"
  const [visit, setVisit] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (extra = {}) => {
    if (!user) return openAuth();
    setBusy(true);
    const cid = await Promise.resolve(startConversation(p, extra));
    setBusy(false);
    if (cid) navigate("messages", { conv: cid });
  };
  const askVisit = () => {
    if (!visit) return;
    send({ visitAt: new Date(visit).toISOString(), message: note.trim() || t("deals.sale.visitDefault") });
  };
  const minVisit = `${dayKey(Date.now() + 86400000)}T09:00`;
  const own = user && p.ownerId && p.ownerId === user.id;

  if (own) {
    return (
      <div className={card}>
        <div className="text-sm text-gray-500">{t("pro.salePrice")}</div>
        <div className="mr-display mt-1 text-3xl font-extrabold text-teal-700">{formatGNF(p.price)}</div>
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-teal-50 p-4 text-sm text-teal-800 ring-1 ring-teal-100"><ShieldCheck size={18} className="mt-0.5 shrink-0" /> {t("deals.sale.own")}</p>
        <Btn variant="ghost" className="mt-4 w-full py-3" onClick={() => navigate("dashboard")}>{t("pro.dash.title")}</Btn>
      </div>
    );
  }

  return (
    <div className={card}>
      <div className="text-sm text-gray-500">{t("pro.salePrice")}</div>
      <div className="mr-display mt-1 text-3xl font-extrabold text-teal-700">{formatGNF(p.price)}</div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-teal-50 p-4 ring-1 ring-teal-100">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-700 text-white"><ShieldCheck size={20} /></span>
        <div>
          <div className="mr-display flex items-center gap-1.5 font-extrabold text-gray-900">MansaRent <BadgeCheck size={15} className="text-teal-600" /></div>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{t("deals.sale.handled")}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-xs text-gray-600">
        {["deals.sale.step1", "deals.sale.step2", "deals.sale.step3"].map((k) => (
          <li key={k} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-teal-600" strokeWidth={3} />{t(k)}</li>
        ))}
      </ul>

      {mode === "visit" ? (
        <div className="mt-5 space-y-3">
          <label className="block text-xs font-semibold text-gray-600">{t("deals.sale.visitWhen")}</label>
          <input type="datetime-local" min={minVisit} value={visit} onChange={(e) => setVisit(e.target.value)} className="w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("deals.sale.visitNote")} className="w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <div className="flex gap-2">
            <Btn variant="ghost" className="flex-1 py-3" onClick={() => setMode(null)}>{t("deals.cancel")}</Btn>
            <Btn variant="solid" className="flex-1 py-3" disabled={!visit || busy} onClick={askVisit}><CalendarDays size={16} /> {t("deals.sale.visitSend")}</Btn>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-2.5">
          <Btn variant="solid" className="w-full py-3.5" disabled={busy} onClick={() => send()}><MessageSquare size={18} /> {t("deals.sale.contact")}</Btn>
          <Btn variant="ghost" className="w-full py-3.5" onClick={() => (user ? setMode("visit") : openAuth())}><CalendarDays size={18} /> {t("deals.sale.visit")}</Btn>
        </div>
      )}
      <div className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl bg-amber-50 py-2.5 text-center text-xs font-medium text-amber-700"><ShieldCheck size={13} /> {t("deals.sale.safe")}</div>
    </div>
  );
}

// =================================================================================
// COURT SÉJOUR — réservation type Airbnb
// =================================================================================
export function BookingWidget({ p }) {
  const { user, openAuth, navigate, showToast, loadConversations, hasApi, startConversation } = useApp();
  const { t, i18n } = useTranslation();
  const today = dayKey(Date.now());
  const minNights = Math.max(1, Number(p.minNights) || 1);
  const hotel = isHotel(p);
  const totalUnits = hotel ? Math.max(1, Number(p.units) || 1) : 1;
  const [rooms, setRooms] = useState(1);
  const perRoom = Math.max(1, Number(p.maxGuests) || 2);
  const maxGuests = perRoom * rooms;
  const [payOnline, setPayOnline] = useState(null); // null = inconnu
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasApi || typeof p.id !== "string") return;
    BookingAPI.availability(p.id).then((r) => { setBlocked(r.blocked || []); setPayOnline(!!r.payOnline); }).catch(() => {});
  }, [p.id]);

  const nights = nightsOf(checkIn, checkOut);
  const total = nights > 0 ? nights * p.price * rooms : 0;
  useEffect(() => { if (guests > maxGuests) setGuests(maxGuests); }, [maxGuests]);
  const clash = checkIn && checkOut && blocked.some((b) => checkIn < b.to && checkOut > b.from);
  const problem = !checkIn || !checkOut ? ""
    : nights < 1 ? t("deals.book.errOrder")
    : nights < minNights ? t("deals.book.errMin", { count: minNights })
    : clash ? t("deals.book.errTaken")
    : "";

  const pickIn = (v) => {
    setCheckIn(v); setError("");
    if (!checkOut || nightsOf(v, checkOut) < minNights) setCheckOut(addDays(v, minNights));
  };
  const submit = async () => {
    if (!user) return openAuth();
    if (!checkIn || !checkOut) return setError(t("deals.book.errDates"));
    if (problem) return setError(problem);
    setBusy(true); setError("");
    try {
      if (!hasApi || typeof p.id !== "string") {
        const cid = await Promise.resolve(startConversation(p));
        showToast(t("deals.book.sent"));
        if (cid) navigate("messages", { conv: cid });
        return;
      }
      const r = await BookingAPI.create({ propertyId: p.id, checkIn, checkOut, guests, units: rooms, message: message.trim() });
      showToast(t(hotel ? "deals.book.hotelBooked" : "deals.book.sent"));
      await loadConversations();
      navigate("bookings", { tab: "trips", focus: r.booking?.id });
    } catch (e) {
      setError(e.message || t("deals.book.errGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const inp = "w-full min-w-0 rounded-xl border-0 bg-transparent px-3 pb-2.5 pt-0.5 text-sm font-semibold text-gray-900 focus:outline-none";
  if (user && p.ownerId && p.ownerId === user.id) {
    return (
      <div className={card}>
        <div className="flex items-baseline gap-1"><span className="mr-display text-3xl font-extrabold text-teal-700">{formatGNF(p.price)}</span><span className="text-sm text-gray-400">{t("deals.perNight")}</span></div>
        <p className="mt-1 text-xs text-gray-500">{t("deals.pay.youReceiveNight", { amount: formatGNFFull(p.hostPrice ?? p.price) })}</p>
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-teal-50 p-4 text-sm text-teal-800 ring-1 ring-teal-100"><CalendarCheck size={18} className="mt-0.5 shrink-0" /> {t("deals.book.own")}</p>
        <Btn variant="solid" className="mt-4 w-full py-3" onClick={() => navigate("bookings", { tab: "hosting" })}>{t("deals.book.manage")}</Btn>
      </div>
    );
  }
  return (
    <div className={card}>
      <div className="flex items-baseline gap-1">
        <span className="mr-display text-3xl font-extrabold text-teal-700">{formatGNF(p.price)}</span>
        <span className="text-sm text-gray-400">{t("deals.perNight")}</span>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-gray-200">
        <div className="grid grid-cols-2 divide-x divide-gray-200">
          <label className="block">
            <span className="block px-3 pt-2.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">{t("deals.book.checkIn")}</span>
            <input type="date" min={today} value={checkIn} onChange={(e) => pickIn(e.target.value)} className={inp} />
          </label>
          <label className="block">
            <span className="block px-3 pt-2.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">{t("deals.book.checkOut")}</span>
            <input type="date" min={checkIn ? addDays(checkIn, minNights) : addDays(today, minNights)} value={checkOut} onChange={(e) => { setCheckOut(e.target.value); setError(""); }} className={inp} />
          </label>
        </div>
        {hotel && totalUnits > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2.5">
            <span>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500">{t("deals.book.rooms")}</span>
              <span className="text-sm font-semibold text-gray-900">{t("deals.book.roomsCount", { count: rooms })}</span>
            </span>
            <span className="flex items-center gap-2">
              <button type="button" aria-label="- chambre" disabled={rooms <= 1} onClick={() => setRooms((n) => Math.max(1, n - 1))} className="grid h-8 w-8 place-items-center rounded-full text-gray-600 ring-1 ring-gray-300 disabled:opacity-30"><Minus size={15} /></button>
              <span className="w-5 text-center text-sm font-bold">{rooms}</span>
              <button type="button" aria-label="+ chambre" disabled={rooms >= totalUnits} onClick={() => setRooms((n) => Math.min(totalUnits, n + 1))} className="grid h-8 w-8 place-items-center rounded-full text-gray-600 ring-1 ring-gray-300 disabled:opacity-30"><Plus size={15} /></button>
            </span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2.5">
          <span>
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500">{t("deals.book.guests")}</span>
            <span className="text-sm font-semibold text-gray-900">{t("deals.book.guestsCount", { count: guests })}</span>
          </span>
          <span className="flex items-center gap-2">
            <button type="button" aria-label="-" disabled={guests <= 1} onClick={() => setGuests((g) => Math.max(1, g - 1))} className="grid h-8 w-8 place-items-center rounded-full text-gray-600 ring-1 ring-gray-300 disabled:opacity-30"><Minus size={15} /></button>
            <span className="w-5 text-center text-sm font-bold">{guests}</span>
            <button type="button" aria-label="+" disabled={guests >= maxGuests} onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))} className="grid h-8 w-8 place-items-center rounded-full text-gray-600 ring-1 ring-gray-300 disabled:opacity-30"><Plus size={15} /></button>
          </span>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-gray-400">{hotel ? t("deals.book.hotelLimits", { min: minNights, per: perRoom }) : t("deals.book.limits", { min: minNights, max: maxGuests })}</p>

      {blocked.length > 0 && (
        <div className="mt-3 rounded-2xl bg-gray-50 px-3 py-2.5">
          <div className="text-[11px] font-bold text-gray-500">{t("deals.book.booked")}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {blocked.slice(0, 6).map((b) => <span key={b.from} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 ring-1 ring-gray-200">{fmtDay(b.from, i18n.language)} → {fmtDay(b.to, i18n.language)}</span>)}
          </div>
        </div>
      )}

      <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("deals.book.messagePh")} className="mt-3 w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />

      {nights > 0 && !problem && (
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between text-gray-600"><span>{formatGNFFull(p.price)} × {t("deals.book.nights", { count: nights })}{rooms > 1 ? ` × ${t("deals.book.roomsCount", { count: rooms })}` : ""}</span><span>{formatGNFFull(total)}</span></div>
          <div className="flex justify-between text-gray-600"><span>{t("deals.book.feesIncluded")}</span><span className="font-semibold text-teal-700"><Check size={13} className="inline" strokeWidth={3} /></span></div>
          <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-extrabold text-gray-900"><span>{t("deals.book.total")}</span><span>{formatGNFFull(total)}</span></div>
        </div>
      )}
      {(error || problem) && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error || problem}</p>}

      <Btn variant="solid" className="mt-4 w-full py-3.5" disabled={busy || !!problem} onClick={submit}><CalendarCheck size={18} /> {busy ? "…" : t(hotel ? "deals.book.bookNow" : "deals.book.request")}</Btn>
      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-500"><Info size={13} className="mt-0.5 shrink-0" />
        {t(hotel ? (payOnline ? "deals.book.hotelHowPay" : "deals.book.hotelHowArrival") : payOnline ? "deals.book.howItWorksPay" : "deals.book.howItWorksArrival")}
      </p>
      {payOnline ? <PayMethods className="mt-3" /> : payOnline === false && <div className="mt-3 flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-[11px] font-bold text-gray-600 ring-1 ring-gray-200"><Banknote size={13} /> {t("deals.pay.onArrivalChip")}</div>}
    </div>
  );
}

/** Infos pratiques d'un court séjour (colonne principale du détail). */
export function ShortStayInfo({ p }) {
  const { t } = useTranslation();
  const hotel = isHotel(p);
  const items = [
    ...(hotel ? [[Home, t("deals.info.rooms", { count: Math.max(1, Number(p.units) || 1) })]] : []),
    [Users, t(hotel ? "deals.info.perRoom" : "deals.info.guests", { count: Math.max(1, Number(p.maxGuests) || 2) })],
    [CalendarDays, t("deals.info.minNights", { count: Math.max(1, Number(p.minNights) || 1) })],
    ...(p.checkInTime ? [[Clock, t("deals.info.checkIn", { time: p.checkInTime })]] : []),
    ...(p.checkOutTime ? [[Clock, t("deals.info.checkOut", { time: p.checkOutTime })]] : []),
  ];
  return (
    <div className="mt-8">
      <h2 className="mr-display text-xl font-bold text-gray-900">{t("deals.info.title")}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map(([Ic, label], i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100"><Ic size={17} className="text-teal-600" /><span className="text-sm font-semibold text-gray-700">{label}</span></div>
        ))}
      </div>
      {p.houseRules && (
        <div className="mt-4 rounded-2xl bg-amber-50/60 px-4 py-3 ring-1 ring-amber-100">
          <div className="text-xs font-extrabold uppercase tracking-wider text-amber-700">{t("deals.info.rules")}</div>
          <p className="mt-1.5 whitespace-pre-line text-sm text-gray-700">{p.houseRules}</p>
        </div>
      )}
    </div>
  );
}

/** Champs supplémentaires du formulaire de publication pour un court séjour. */
export function ShortStayFields({ form, set, lab, inp, sel, hotel = false }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl bg-teal-50/50 p-5 ring-1 ring-teal-100">
      <div className="mr-display text-sm font-extrabold text-teal-800">{t(hotel ? "deals.post.hotelTitle" : "deals.post.title")}</div>
      <p className="mt-0.5 text-xs text-gray-500">{t("deals.post.hint")}</p>
      {Number(form.price) > 0 && (
        <div className="mt-3 grid gap-2 rounded-2xl bg-white p-3 text-xs ring-1 ring-teal-100 sm:grid-cols-2">
          <div><span className="text-gray-500">{t("deals.post.youReceive")}</span><div className="text-sm font-extrabold text-gray-900">{formatGNFFull(Number(form.price))} {t("deals.perNight")}</div></div>
          <div><span className="text-gray-500">{t("deals.post.guestPays")}</span><div className="text-sm font-extrabold text-teal-700">{formatGNFFull(Math.round(Number(form.price) * 1.1))} {t("deals.perNight")}</div></div>
          <p className="text-[11px] text-gray-500 sm:col-span-2">{t("deals.post.split")}</p>
        </div>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {hotel && <div><label className={lab}>{t("deals.post.units")}</label><input type="number" min="1" max="500" className={inp} value={form.units} onChange={(e) => set("units", e.target.value)} /><p className="mt-1 text-[11px] text-gray-500">{t("deals.post.unitsHint")}</p></div>}
        <div><label className={lab}>{t(hotel ? "deals.post.perRoom" : "deals.post.maxGuests")}</label><select className={sel} value={form.maxGuests} onChange={(e) => set("maxGuests", e.target.value)}>{Array.from({ length: 16 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
        <div><label className={lab}>{t("deals.post.minNights")}</label><select className={sel} value={form.minNights} onChange={(e) => set("minNights", e.target.value)}>{[1, 2, 3, 4, 5, 7, 14, 30].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
        <div><label className={lab}>{t("deals.post.checkIn")}</label><input type="time" className={inp} value={form.checkInTime} onChange={(e) => set("checkInTime", e.target.value)} /></div>
        <div><label className={lab}>{t("deals.post.checkOut")}</label><input type="time" className={inp} value={form.checkOutTime} onChange={(e) => set("checkOutTime", e.target.value)} /></div>
        <div className="sm:col-span-2"><label className={lab}>{t("deals.post.rules")}</label><textarea rows={3} className={inp} placeholder={t("deals.post.rulesPh")} value={form.houseRules} onChange={(e) => set("houseRules", e.target.value)} /></div>
      </div>
    </div>
  );
}

// =================================================================================
// MES SÉJOURS / RÉSERVATIONS REÇUES
// =================================================================================
const STATUS_STYLE = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  awaiting_payment: "bg-orange-50 text-orange-700 ring-orange-200",
  confirmed: "bg-teal-50 text-teal-700 ring-teal-200",
  expired: "bg-gray-100 text-gray-500 ring-gray-200",
  accepted: "bg-teal-50 text-teal-700 ring-teal-200",
  completed: "bg-sky-50 text-sky-700 ring-sky-200",
  declined: "bg-gray-100 text-gray-500 ring-gray-200",
  cancelled: "bg-gray-100 text-gray-500 ring-gray-200",
};

/** Petits logos des moyens de paiement acceptés. */
function PayMethods({ className = "" }) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700 ring-1 ring-orange-100"><Smartphone size={12} /> Orange Money</span>
      <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-[11px] font-bold text-yellow-800 ring-1 ring-yellow-100"><Smartphone size={12} /> MTN MoMo</span>
      <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200"><CreditCard size={12} /> {t("deals.pay.card")}</span>
    </div>
  );
}

const fmtWhen = (iso, lang) => (iso ? new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

/** Ce que l'hôte gagne sur une réservation (frais MansaSend déduits de sa part). */
function HostMoney({ b }) {
  const { t, i18n } = useTranslation();
  if (!["confirmed", "completed", "awaiting_payment", "pending"].includes(b.status) && !b.payoutStatus) return null;
  const paid = b.paymentStatus === "paid";
  const ps = b.payoutStatus;
  if (b.paymentStatus === "on_arrival") {
    return (
      <div className="mx-4 mb-3 rounded-2xl bg-gray-50 px-3 py-2.5 text-xs ring-1 ring-gray-100">
        <div className="flex justify-between text-gray-600"><span>{t("deals.pay.guestPaysOnSite")}</span><span className="font-semibold">{formatGNFFull(b.total)}</span></div>
        <div className="flex justify-between text-gray-600"><span>{t("deals.pay.commissionToSend")}</span><span>− {formatGNFFull(b.commission)}</span></div>
        <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 text-sm font-extrabold text-gray-900"><span>{t("deals.pay.youKeep")}</span><span>{formatGNFFull(b.hostAmount)}</span></div>
        <div className="mt-1.5 text-[11px] font-semibold text-gray-500">{t(b.commissionStatus === "collected" ? "deals.pay.commissionSettled" : "deals.pay.commissionLater")}</div>
      </div>
    );
  }
  return (
    <div className="mx-4 mb-3 rounded-2xl bg-teal-50/60 px-3 py-2.5 text-xs ring-1 ring-teal-100">
      <div className="flex justify-between text-gray-600"><span>{t("deals.pay.guestPaid")}</span><span className="font-semibold">{formatGNFFull(b.total)}</span></div>
      <div className="flex justify-between text-gray-600"><span>{t("deals.pay.mansarentShare")}</span><span>− {formatGNFFull(b.commission)}</span></div>
      {paid && b.payoutFees != null && <div className="flex justify-between text-gray-600"><span>{t("deals.pay.fees")}</span><span>− {formatGNFFull(b.payoutFees)}</span></div>}
      <div className="mt-1 flex justify-between border-t border-teal-100 pt-1 text-sm font-extrabold text-gray-900"><span>{t("deals.pay.youReceive")}</span><span>{formatGNFFull(paid && b.payoutAmount != null ? b.payoutAmount : b.hostAmount)}</span></div>
      <div className="mt-1.5 flex items-center gap-1.5 font-semibold text-teal-800">
        <Banknote size={13} />
        {!paid ? t("deals.pay.waitingGuest")
          : ps === "scheduled" ? t("deals.pay.payoutOn", { date: fmtWhen(b.payoutDueAt, i18n.language) })
          : ps === "paid" ? t("deals.pay.payoutDone", { date: fmtWhen(b.payoutAt, i18n.language) })
          : ps === "manual" || ps === "processing" ? t("deals.pay.payoutProcessing")
          : ps === "failed" ? t("deals.pay.payoutFailed")
          : ps === "cancelled" ? t("deals.pay.payoutCancelled")
          : null}
      </div>
    </div>
  );
}

function BookingCard({ b, asHost, onAct, busy, onPay }) {
  const { navigate } = useApp();
  const { t, i18n } = useTranslation();
  const other = asHost ? b.guest : b.host;
  const future = b.checkIn > dayKey(Date.now());
  const img = Array.isArray(b.property?.images) && b.property.images[0];
  return (
    <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100">
      <div className="flex gap-4 p-4">
        <button onClick={() => navigate("detail", { id: b.propertyId })} className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
          {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-gray-300"><Home size={22} /></span>}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="mr-display truncate font-extrabold text-gray-900">{b.property?.title}</div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_STYLE[b.status] || STATUS_STYLE.pending}`}>{t(`deals.status.${b.status}`)}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><CalendarDays size={13} /> {fmtDay(b.checkIn, i18n.language)} → {fmtDay(b.checkOut, i18n.language)} · {t("deals.book.nights", { count: b.nights })}{b.units > 1 ? ` · ${t("deals.book.roomsCount", { count: b.units })}` : ""} · {t("deals.book.guestsCount", { count: b.guests })}</div>
          <div className="mt-1 text-sm font-bold text-teal-700">{formatGNFFull(asHost ? b.hostAmount || b.total : b.total)}{asHost && <span className="ml-1 text-[11px] font-semibold text-gray-400">{t("deals.pay.yourShare")}</span>}</div>
          {b.paymentStatus === "on_arrival" && ["confirmed", "completed"].includes(b.status) && <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-gray-600"><Banknote size={12} /> {t(asHost ? "deals.pay.collectOnArrival" : "deals.pay.payOnArrival", { amount: formatGNFFull(b.total) })}</div>}
          {!asHost && b.paymentStatus === "paid" && <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-teal-700"><CircleCheck size={12} /> {t("deals.pay.paidVia", { method: t(`deals.pay.method.${b.payMethod || "om"}`) })}</div>}
          {!asHost && ["refund_pending", "refunded"].includes(b.paymentStatus) && <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-sky-700"><RefreshCw size={12} /> {t(`deals.pay.${b.paymentStatus}`, { amount: formatGNFFull(b.refundAmount || b.total) })}</div>}
          {other && <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500"><Avatar name={other.name} src={other.avatar} size={18} /> {asHost ? t("deals.trips.guest") : t("deals.trips.host")} : <b className="text-gray-700">{other.name}</b></div>}
        </div>
      </div>
      {b.message && <p className="mx-4 mb-3 rounded-2xl bg-gray-50 px-3 py-2 text-xs italic text-gray-600">“{b.message}”</p>}
      {asHost && <HostMoney b={b} />}
      {!asHost && b.status === "awaiting_payment" && (
        <div className="mx-4 mb-3 rounded-2xl bg-orange-50 p-3 ring-1 ring-orange-100">
          <div className="text-sm font-extrabold text-orange-800">{t("deals.pay.acceptedTitle")}</div>
          <p className="mt-0.5 text-xs text-orange-700">{t("deals.pay.payBefore", { date: fmtWhen(b.payBy, i18n.language) })}</p>
          {b.canPayOnline === false ? (
            <p className="mt-2 text-xs font-semibold text-gray-600">{t("deals.pay.offline")}</p>
          ) : (
            <Btn variant="solid" className="mt-2.5 w-full py-3" disabled={busy} onClick={() => onPay(b)}><Wallet size={17} /> {t("deals.pay.payNow", { amount: formatGNFFull(b.total) })}</Btn>
          )}
          <PayMethods className="mt-2.5" />
        </div>
      )}
      {!asHost && b.status === "confirmed" && b.paymentStatus === "paid" && b.refundUntil && <p className="mx-4 mb-3 text-[11px] text-gray-500">{new Date(b.refundUntil) > new Date() ? t("deals.pay.refundUntil", { date: fmtWhen(b.refundUntil, i18n.language) }) : t("deals.pay.noRefund")}</p>}
      <div className="flex flex-wrap gap-2 border-t border-gray-50 px-4 py-3">
        {asHost && b.status === "pending" && (
          <>
            <Btn variant="solid" className="px-4 py-2 text-xs" disabled={busy} onClick={() => onAct(b, "accept")}><Check size={14} /> {t("deals.trips.accept")}</Btn>
            <Btn variant="ghost" className="px-4 py-2 text-xs" disabled={busy} onClick={() => onAct(b, "decline")}><X size={14} /> {t("deals.trips.decline")}</Btn>
          </>
        )}
        {((!asHost && ["pending", "awaiting_payment"].includes(b.status)) || (["confirmed", "awaiting_payment"].includes(b.status) && future)) && (
          <button disabled={busy} onClick={() => onAct(b, "cancel")} className="rounded-full px-4 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">{t("deals.trips.cancel")}</button>
        )}
        {b.conversationId && <button onClick={() => navigate("messages", { conv: b.conversationId })} className="ml-auto flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50"><MessageCircle size={14} /> {t("deals.trips.message")}</button>}
      </div>
    </div>
  );
}

export function BookingsPage() {
  const { user, openAuth, route, showToast, loadConversations } = useApp();
  const { t } = useTranslation();
  const canHost = ["agent", "landlord", "hotel", "admin"].includes(user?.role);
  const [tab, setTab] = useState(route.tab === "hosting" && canHost ? "hosting" : "trips");
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = (quiet = false) => {
    if (!quiet) setRows(null);
    (tab === "hosting" ? BookingAPI.host() : BookingAPI.mine())
      .then((r) => setRows(r.bookings || []))
      .catch(() => setRows((x) => x || []));
  };
  useEffect(() => { if (user) load(); }, [tab, user?.id]);
  // Retour dans l'appli après le paiement (navigateur externe) : on rafraîchit.
  useEffect(() => {
    const onShow = () => { if (document.visibilityState === "visible" && user) load(true); };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [tab, user?.id]);
  const pay = async (b) => {
    setBusy(true);
    try {
      const r = await PaymentAPI.pay(b.id);
      window.location.href = r.paymentUrl; // page MansaSend : Orange Money, MTN ou carte
    } catch (e) { showToast(e.message); setBusy(false); }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <CalendarCheck size={34} className="mx-auto text-teal-600" />
        <p className="mt-4 text-sm text-gray-500">{t("deals.trips.login")}</p>
        <Btn variant="solid" className="mt-5 px-6 py-3" onClick={openAuth}>{t("shell.signIn")}</Btn>
      </div>
    );
  }
  const act = async (b, action) => {
    const late = b.paymentStatus === "paid" && b.refundUntil && new Date(b.refundUntil) <= new Date() && tab !== "hosting";
    if (action === "cancel" && !window.confirm(late ? t("deals.trips.confirmCancelNoRefund") : t("deals.trips.confirmCancel"))) return;
    setBusy(true);
    try {
      await BookingAPI.act(b.id, action);
      showToast(t(`deals.trips.done.${action}`));
      load(); loadConversations();
    } catch (e) { showToast(e.message); }
    setBusy(false);
  };
  const ACTIVE = ["pending", "awaiting_payment", "confirmed"];
  const upcoming = (rows || []).filter((b) => ACTIVE.includes(b.status));
  const past = (rows || []).filter((b) => !ACTIVE.includes(b.status));

  return (
    <div className="min-h-screen bg-gray-50/70"><div className="mx-auto max-w-3xl px-5 py-8 lg:py-12">
      <h1 className="mr-display text-2xl font-extrabold text-gray-900 sm:text-3xl">{t("deals.trips.title")}</h1>
      <p className="mt-1 text-sm text-gray-500">{t("deals.trips.subtitle")}</p>
      {canHost && (
        <div className="mt-5 inline-flex rounded-full bg-white p-1 ring-1 ring-gray-200">
          {["trips", "hosting"].map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-5 py-2 text-sm font-bold ${tab === k ? "bg-teal-700 text-white" : "text-gray-600"}`}>{t(`deals.trips.tab.${k}`)}</button>
          ))}
        </div>
      )}
      {tab === "hosting" && <PayoutSettings />}
      {!rows ? (
        <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="mr-skel h-32 rounded-3xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-gray-100">
          <CalendarDays size={30} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">{t(tab === "hosting" ? "deals.trips.emptyHost" : "deals.trips.empty")}</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && <h2 className="mt-7 text-xs font-extrabold uppercase tracking-wider text-gray-500">{t("deals.trips.upcoming")}</h2>}
          <div className="mt-3 space-y-3">{upcoming.map((b) => <BookingCard key={b.id} b={b} asHost={tab === "hosting"} onAct={act} busy={busy} onPay={pay} />)}</div>
          {past.length > 0 && <h2 className="mt-7 text-xs font-extrabold uppercase tracking-wider text-gray-500">{t("deals.trips.past")}</h2>}
          <div className="mt-3 space-y-3">{past.map((b) => <BookingCard key={b.id} b={b} asHost={tab === "hosting"} onAct={act} busy={busy} onPay={pay} />)}</div>
        </>
      )}
    </div></div>
  );
}

/** Numéro Orange Money / MTN où l'hôte reçoit ses versements automatiques. */
function PayoutSettings() {
  const { showToast } = useApp();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [operator, setOperator] = useState("om");
  const [phone, setPhone] = useState("");
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    PayoutAPI.get().then((r) => { setData(r); setOperator(r.operator || "om"); setPhone(r.phone || r.profilePhone || ""); setEdit(!r.phone); }).catch(() => setData({}));
  }, []);
  if (!data) return null;
  const save = async () => {
    setBusy(true);
    try { const r = await PayoutAPI.save(operator, phone); setData({ ...data, ...r }); setEdit(false); showToast(t("deals.payout.saved")); }
    catch (e) { showToast(e.message); }
    setBusy(false);
  };
  return (
    <div className="mt-5 rounded-3xl bg-white p-5 ring-1 ring-gray-100">
      <div className="flex items-center gap-2"><Banknote size={18} className="text-teal-600" /><span className="mr-display font-extrabold text-gray-900">{t("deals.payout.title")}</span></div>
      <p className="mt-1 text-xs text-gray-500">{t("deals.payout.hint")}</p>
      {!edit && data.phone ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-teal-50 px-4 py-3">
          <span className="text-sm font-bold text-teal-800">{data.operator === "momo" ? "MTN MoMo" : "Orange Money"} · {data.phone}</span>
          <button onClick={() => setEdit(true)} className="text-xs font-bold text-teal-700 hover:underline">{t("deals.payout.change")}</button>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-[170px_1fr_auto]">
          <select value={operator} onChange={(e) => setOperator(e.target.value)} className="mr-sel appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm ring-1 ring-gray-200 focus:outline-none">
            <option value="om">Orange Money</option><option value="momo">MTN MoMo</option>
          </select>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+224 6XX XX XX XX" className="rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <Btn variant="solid" className="px-5 py-3 text-sm" disabled={busy || phone.replace(/\D/g, "").length < 8} onClick={save}>{t("deals.lead.save")}</Btn>
        </div>
      )}
    </div>
  );
}

/** Page affichée au retour de MansaSend (/?payment=<id>) : on attend la confirmation. */
export function PaymentReturnPage() {
  const { route, navigate, user, openAuth } = useApp();
  const { t } = useTranslation();
  const [st, setSt] = useState(null);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const check = () => PaymentAPI.status(route.id).then((r) => { if (alive) setSt(r); }).catch(() => {});
    check();
    const id = setInterval(() => { setTries((n) => n + 1); check(); }, 3000);
    return () => { alive = false; clearInterval(id); };
  }, [route.id, user?.id]);
  useEffect(() => { if (window.history?.replaceState) window.history.replaceState(null, "", "/"); }, []);
  if (!user) return <div className="mx-auto max-w-md px-5 py-24 text-center"><Btn variant="solid" className="px-6 py-3" onClick={openAuth}>{t("shell.signIn")}</Btn></div>;
  const paid = st?.paymentStatus === "paid";
  const failed = st && st.paymentStatus === "unpaid" && tries > 2;
  const waiting = !paid && !failed && tries < 20;
  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <span className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${paid ? "bg-teal-50 text-teal-600" : failed ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-600"}`}>
        {paid ? <CircleCheck size={40} /> : failed ? <CircleX size={40} /> : <Loader2 size={36} className="animate-spin" />}
      </span>
      <h1 className="mr-display mt-6 text-2xl font-extrabold text-gray-900">{t(paid ? "deals.pay.successTitle" : failed ? "deals.pay.failTitle" : waiting ? "deals.pay.waitTitle" : "deals.pay.slowTitle")}</h1>
      <p className="mt-2 text-sm text-gray-500">{st?.title}{paid ? ` · ${formatGNFFull(st.total)}` : ""}</p>
      <p className="mt-2 text-sm text-gray-500">{t(paid ? "deals.pay.successText" : failed ? "deals.pay.failText" : "deals.pay.waitText")}</p>
      <Btn variant="solid" className="mt-7 px-6 py-3" onClick={() => navigate("bookings", { tab: "trips" })}>{t("deals.pay.toTrips")}</Btn>
    </div>
  );
}

/** Commissions dues par les hôtes et hôtels pour les séjours payés à l'arrivée. */
function AdminCommissions() {
  const { showToast } = useApp();
  const { t } = useTranslation();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = () => PaymentAPI.adminCommissions().then(setD).catch(() => setD({ hosts: [], total: 0 }));
  useEffect(() => { load(); }, []);
  if (!d) return null;
  const collect = async (hostId) => {
    if (!window.confirm(t("deals.adminPay.confirmCollect"))) return;
    setBusy(hostId);
    try { await PaymentAPI.collectCommission(hostId); showToast(t("shell.admin.saved")); await load(); } catch (e) { showToast(e.message); }
    setBusy(null);
  };
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="mr-display text-base font-extrabold text-gray-900">{t("deals.adminPay.commissionsTitle")}</h3>
        <span className="text-sm font-extrabold text-teal-700">{formatGNFFull(d.total)}</span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{t("deals.adminPay.commissionsHint")}</p>
      {d.hosts.length === 0 ? <p className="mt-2 rounded-2xl bg-white px-4 py-6 text-center text-sm text-gray-400 ring-1 ring-gray-100">{t("deals.adminPay.commissionsEmpty")}</p> : (
        <div className="mt-2 space-y-2">
          {d.hosts.map((g) => (
            <div key={g.host.id} className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-gray-900">{g.host.company || g.host.name} <span className="font-semibold text-gray-400">· {t(`pro.roles.${g.host.role}`)}</span></div>
                  <div className="truncate text-xs text-gray-500">{[g.host.phone, g.host.email].filter(Boolean).join(" · ")}</div>
                </div>
                <span className="text-base font-extrabold text-gray-900">{formatGNFFull(g.total)}</span>
                <Btn variant="solid" className="px-4 py-2 text-xs" disabled={busy === g.host.id} onClick={() => collect(g.host.id)}><Check size={13} /> {t("deals.adminPay.markCollected")}</Btn>
              </div>
              <div className="mt-2 space-y-1 border-t border-gray-50 pt-2">
                {g.bookings.map((b) => <div key={b.id} className="flex justify-between gap-2 text-[11px] text-gray-500"><span className="truncate">{b.hotel ? "🏨 " : ""}{b.title} · {t("deals.book.nights", { count: b.nights })}{b.units > 1 ? ` × ${b.units}` : ""}</span><span className="shrink-0 font-semibold text-gray-700">{formatGNFFull(b.commission)}</span></div>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Admin : argent encaissé, commission, versements et remboursements à envoyer. */
export function AdminPayments() {
  const { showToast } = useApp();
  const { t, i18n } = useTranslation();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = () => PaymentAPI.adminOverview().then(setD).catch((e) => setD({ error: e.message }));
  useEffect(() => { load(); }, []);
  if (!d) return <div className="mt-6 space-y-3">{[0, 1].map((i) => <div key={i} className="mr-skel h-24 rounded-3xl" />)}</div>;
  if (d.error) return <p className="mt-6 text-sm text-rose-600">{d.error}</p>;
  const act = async (po, action) => {
    let ref;
    if (action === "sent") { ref = window.prompt(t("deals.adminPay.refPrompt")) ?? null; if (ref === null) return; }
    setBusy(po.id);
    try { await PaymentAPI.adminPayout(po.id, action, ref || undefined); showToast(t("shell.admin.saved")); await load(); }
    catch (e) { showToast(e.message); }
    setBusy(null);
  };
  const k = d.totals || {};
  const tiles = [
    [t("deals.adminPay.collected"), formatGNFFull(k.collected), t("deals.adminPay.bookings", { count: k.bookingsPaid || 0 })],
    [t("deals.adminPay.commission"), formatGNFFull(k.commission), `${d.rates?.commissionPct ?? 10} %`],
    [t("deals.adminPay.scheduled"), formatGNFFull(k.scheduledPayouts), t("deals.adminPay.bookings", { count: k.scheduledCount || 0 })],
    [t("deals.adminPay.refunds"), formatGNFFull(k.refunds), ""],
  ];
  return (
    <div className="mt-6 space-y-5">
      {!d.online && <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">{t("deals.adminPay.offline")}</div>}
      {d.online && !d.payoutApi && <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-800 ring-1 ring-sky-200">{t("deals.adminPay.manualMode")}</div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="rounded-3xl bg-white p-4 ring-1 ring-gray-100"><div className="text-xs font-semibold text-gray-500">{label}</div><div className="mr-display mt-1 text-lg font-extrabold text-gray-900">{value}</div>{sub && <div className="text-[11px] text-gray-400">{sub}</div>}</div>
        ))}
      </div>
      <AdminCommissions />
      <div>
        <h3 className="mr-display text-base font-extrabold text-gray-900">{t("deals.adminPay.queue")}</h3>
        {d.queue.length === 0 ? <p className="mt-2 rounded-2xl bg-white px-4 py-6 text-center text-sm text-gray-400 ring-1 ring-gray-100">{t("deals.adminPay.queueEmpty")}</p> : (
          <div className="mt-2 space-y-2">
            {d.queue.map((po) => (
              <div key={po.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${po.kind === "refund" ? "bg-sky-100 text-sky-700" : "bg-teal-100 text-teal-700"}`}>{t(`deals.adminPay.kind.${po.kind}`)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-gray-900">{formatGNFFull(po.amount)} → {po.user?.name || "—"}</div>
                  <div className="truncate text-xs text-gray-500">{po.title} · {po.operator ? (po.operator === "momo" ? "MTN MoMo" : "Orange Money") : ""} {po.account || po.user?.phone || po.user?.email || ""}</div>
                  {po.error && <div className="truncate text-[11px] text-amber-700">{po.error}</div>}
                </div>
                {po.kind === "host" && po.status === "failed" && <Btn variant="ghost" className="px-4 py-2 text-xs" disabled={busy === po.id} onClick={() => act(po, "retry")}><RefreshCw size={13} /> {t("deals.adminPay.retry")}</Btn>}
                <Btn variant="solid" className="px-4 py-2 text-xs" disabled={busy === po.id} onClick={() => act(po, "sent")}><Check size={13} /> {t("deals.adminPay.markSent")}</Btn>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="mr-display text-base font-extrabold text-gray-900">{t("deals.adminPay.recent")}</h3>
        <div className="mt-2 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100">
          {d.recent.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">{t("deals.adminPay.none")}</p>}
          {d.recent.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-50 px-4 py-3 text-xs last:border-0">
              <span className="min-w-0 flex-1 truncate font-bold text-gray-800">{b.property?.title}</span>
              <span className="text-gray-500">{b.guest?.name} → {b.host?.name}</span>
              <span className="font-bold text-gray-900">{formatGNFFull(b.total)}</span>
              <span className="text-teal-700">+{formatGNFFull(b.commission)}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-bold text-gray-600">{t(`deals.adminPay.pay.${b.paymentStatus}`)}</span>
              <span className="rounded-full bg-gray-50 px-2 py-0.5 font-semibold text-gray-500">{t(`deals.adminPay.out.${b.payoutStatus}`)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =================================================================================
// ADMIN — Demandes d'achat
// =================================================================================
const LEAD_STATUSES = ["new", "contacted", "visit", "offer", "sold", "lost"];
const LEAD_STYLE = {
  new: "bg-amber-500 text-white", contacted: "bg-sky-500 text-white", visit: "bg-violet-500 text-white",
  offer: "bg-teal-600 text-white", sold: "bg-green-600 text-white", lost: "bg-gray-400 text-white",
};
const waLink = (phone) => { const d = String(phone || "").replace(/\D/g, ""); return d ? `https://wa.me/${d.startsWith("224") || d.length > 9 ? d : `224${d}`}` : null; };
const toLocalInput = (iso) => { if (!iso) return ""; const d = new Date(iso); return `${dayKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

function Row({ icon: Ic, label, value, href }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-1.5 text-sm">
      <Ic size={15} className="mt-0.5 shrink-0 text-teal-600" />
      <span className="w-28 shrink-0 text-xs font-semibold text-gray-500">{label}</span>
      {href ? <a href={href} target="_blank" rel="noreferrer" className="min-w-0 break-words font-semibold text-teal-700 hover:underline">{value}</a> : <span className="min-w-0 break-words font-semibold text-gray-800">{value}</span>}
    </div>
  );
}

function LeadCard({ lead, onChange }) {
  const { navigate, loadConversations, showToast } = useApp();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(lead.status === "new");
  const [notes, setNotes] = useState(lead.notes || "");
  const [visitAt, setVisitAt] = useState(toLocalInput(lead.visitAt));
  const [dealPrice, setDealPrice] = useState("");
  const [askSold, setAskSold] = useState(false);
  const [busy, setBusy] = useState(false);
  const a = lead.agent || {};
  const img = Array.isArray(lead.property?.images) && lead.property.images[0];

  const save = async (data, msg = t("shell.admin.saved")) => {
    setBusy(true);
    try { const r = await LeadAPI.update(lead.id, data); onChange(r.lead); showToast(msg); }
    catch (e) { showToast(e.message); }
    setBusy(false);
  };
  const setStatus = (s) => (s === "sold" ? setAskSold(true) : save({ status: s }));
  const openChat = async (convId) => { await loadConversations(); navigate("messages", { conv: convId }); };
  const chatAgent = async () => {
    setBusy(true);
    try { const r = await LeadAPI.agentChat(lead.id); onChange({ ...lead, agentConvId: r.conversation.id }); await openChat(r.conversation.id); }
    catch (e) { showToast(e.message); }
    setBusy(false);
  };

  return (
    <div className={`overflow-hidden rounded-3xl bg-white ring-1 ${lead.unread > 0 ? "ring-amber-300" : "ring-gray-100"}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="h-14 w-16 shrink-0 overflow-hidden rounded-2xl bg-gray-100">{img ? <img src={img} alt="" className="h-full w-full object-cover" /> : null}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${LEAD_STYLE[lead.status]}`}>{t(`deals.lead.status.${lead.status}`)}</span>
            {lead.unread > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">{t("deals.lead.unread", { count: lead.unread })}</span>}
          </span>
          <span className="mr-display mt-1 block truncate font-extrabold text-gray-900">{lead.property?.title}</span>
          <span className="block truncate text-xs text-gray-500">{t("deals.lead.buyer")} : <b className="text-gray-700">{lead.buyer?.name}</b> · {t("deals.lead.agent")} : <b className="text-gray-700">{a.name}</b></span>
          {lead.lastMessage && <span className="mt-0.5 block truncate text-xs text-gray-400">“{lead.lastMessage.text}”</span>}
        </span>
        <span className="hidden text-right sm:block"><span className="block text-sm font-extrabold text-teal-700">{formatGNF(lead.property?.price || 0)}</span><span className="text-[11px] text-gray-400">{new Date(lead.lastAt).toLocaleDateString(i18n.language === "en" ? "en-GB" : "fr-FR")}</span></span>
        <ChevronDown size={18} className={`shrink-0 text-gray-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-50 p-4">
          <div className="flex flex-wrap gap-1.5">
            {LEAD_STATUSES.map((s) => (
              <button key={s} disabled={busy} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${lead.status === s ? LEAD_STYLE[s] : "bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"}`}>{t(`deals.lead.status.${s}`)}</button>
            ))}
          </div>
          {askSold && (
            <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-green-50 p-3 ring-1 ring-green-100">
              <label className="min-w-[180px] flex-1 text-xs font-semibold text-green-800">{t("deals.lead.dealPrice")}
                <input type="number" value={dealPrice} onChange={(e) => setDealPrice(e.target.value)} placeholder={String(lead.property?.price || "")} className="mt-1 w-full rounded-xl border-0 bg-white px-3 py-2 text-sm ring-1 ring-green-200 focus:outline-none" />
              </label>
              <Btn variant="green" className="px-4 py-2 text-xs" disabled={busy} onClick={() => { setAskSold(false); save({ status: "sold", dealPrice: Number(dealPrice) > 0 ? Number(dealPrice) : null }, t("deals.lead.soldToast")); }}>{t("deals.lead.confirmSold")}</Btn>
              <button onClick={() => setAskSold(false)} className="px-2 py-2 text-xs font-bold text-gray-500">{t("deals.cancel")}</button>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-xs font-extrabold uppercase tracking-wider text-gray-500">{t("deals.lead.buyer")}</div>
              <div className="mt-2 flex items-center gap-2.5"><Avatar name={lead.buyer?.name} src={lead.buyer?.avatar} size={36} /><div className="min-w-0"><div className="truncate font-bold text-gray-900">{lead.buyer?.name}</div>{lead.buyer?.username && <div className="text-xs text-gray-500">@{lead.buyer.username}</div>}</div></div>
              <div className="mt-2">
                <Row icon={Mail} label={t("deals.lead.email")} value={lead.buyer?.email} href={lead.buyer?.email && `mailto:${lead.buyer.email}`} />
                <Row icon={Phone} label={t("deals.lead.phone")} value={lead.buyer?.phone} href={lead.buyer?.phone && `tel:${lead.buyer.phone}`} />
              </div>
              <Btn variant="solid" className="mt-3 w-full py-2.5 text-sm" onClick={() => openChat(lead.buyerConvId)}><MessageSquare size={15} /> {t("deals.lead.chatBuyer")}</Btn>
            </div>

            <div className="rounded-2xl bg-teal-50/60 p-4 ring-1 ring-teal-100">
              <div className="flex items-center justify-between"><span className="text-xs font-extrabold uppercase tracking-wider text-teal-700">{t("deals.lead.agentFile")}</span><span className="text-[11px] font-semibold text-gray-500">{t("deals.lead.listings", { count: a.listings || 0 })}</span></div>
              <div className="mt-2 flex items-center gap-2.5"><Avatar name={a.name} src={a.avatar} size={36} /><div className="min-w-0"><div className="flex items-center gap-1 truncate font-bold text-gray-900">{a.name}{a.verification === "approved" && <BadgeCheck size={14} className="text-teal-600" />}</div><div className="text-xs text-gray-500">{t(`pro.roles.${a.role}`)}{a.username ? ` · @${a.username}` : ""}</div></div></div>
              <div className="mt-2">
                <Row icon={Phone} label={t("deals.lead.phone")} value={a.phone} href={a.phone && `tel:${a.phone}`} />
                <Row icon={MessageCircle} label="WhatsApp" value={a.phone ? t("deals.lead.whatsapp") : null} href={waLink(a.phone)} />
                <Row icon={Mail} label={t("deals.lead.email")} value={a.email} href={a.email && `mailto:${a.email}`} />
                <Row icon={MapPin} label={t("deals.lead.address")} value={[a.address, a.city].filter(Boolean).join(", ")} />
                <Row icon={Building2} label={t("deals.lead.agency")} value={[a.agencyName, a.licenseNumber && `${t("deals.lead.license")} ${a.licenseNumber}`].filter(Boolean).join(" · ")} />
                <Row icon={IdCard} label={t("deals.lead.id")} value={a.idType ? `${t(`pro.idTypes.${a.idType}`, { defaultValue: a.idType })} · ${a.idNumber || "—"}` : null} />
                <Row icon={Clock} label={t("deals.lead.experience")} value={a.yearsExperience != null ? t("deals.lead.years", { count: a.yearsExperience }) : null} />
              </div>
              <Btn variant="ghost" className="mt-3 w-full py-2.5 text-sm" disabled={busy} onClick={chatAgent}><Send size={15} /> {t(lead.agentConvId ? "deals.lead.chatAgentOpen" : "deals.lead.chatAgent")}</Btn>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <label className="block text-xs font-semibold text-gray-500"><span className="flex items-center gap-1.5"><StickyNote size={13} /> {t("deals.lead.notes")}</span>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("deals.lead.notesPh")} className="mt-1 w-full rounded-xl border-0 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 ring-1 ring-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </label>
            <label className="block text-xs font-semibold text-gray-500"><span className="flex items-center gap-1.5"><CalendarDays size={13} /> {t("deals.lead.visit")}</span>
              <input type="datetime-local" value={visitAt} onChange={(e) => setVisitAt(e.target.value)} className="mt-1 w-full rounded-xl border-0 bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="solid" className="px-5 py-2.5 text-sm" disabled={busy} onClick={() => save({ notes, visitAt: visitAt ? new Date(visitAt).toISOString() : null, ...(visitAt && ["new", "contacted"].includes(lead.status) ? { status: "visit" } : {}) })}><Check size={15} /> {t("deals.lead.save")}</Btn>
            <Btn variant="ghost" className="px-5 py-2.5 text-sm" onClick={() => navigate("detail", { id: lead.propertyId })}>{t("deals.lead.viewListing")}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminLeads() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");
  const [data, setData] = useState(null);
  const load = () => { setData(null); LeadAPI.list(filter).then(setData).catch(() => setData({ leads: [], counts: {} })); };
  useEffect(load, [filter]);
  const counts = data?.counts || {};
  const all = Object.values(counts).reduce((s, n) => s + n, 0);
  const replace = (l) => setData((d) => ({ ...d, leads: d.leads.map((x) => (x.id === l.id ? { ...x, ...l } : x)) }));

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-gray-500">{t("deals.lead.intro")}</p>
      <div className="flex flex-wrap gap-2">
        {["", ...LEAD_STATUSES].map((s) => (
          <button key={s || "all"} onClick={() => setFilter(s)} className={`rounded-full px-3.5 py-2 text-xs font-bold ${filter === s ? "bg-gray-900 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"}`}>
            {s ? t(`deals.lead.status.${s}`) : t("deals.lead.all")} <span className="ml-1 opacity-70">{s ? counts[s] || 0 : all}</span>
          </button>
        ))}
      </div>
      {!data ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="mr-skel h-24 rounded-3xl" />)}</div>
      ) : data.leads.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-gray-100"><Users size={30} className="mx-auto text-gray-300" /><p className="mt-3 text-sm text-gray-500">{t("deals.lead.empty")}</p></div>
      ) : (
        <div className="space-y-3">{data.leads.map((l) => <LeadCard key={l.id} lead={l} onChange={replace} />)}</div>
      )}
    </div>
  );
}
