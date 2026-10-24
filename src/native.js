// ============================================================
// MansaRent — couche « application native » (Capacitor)
// Barre d'état, écran de démarrage, vibrations, clavier, bouton retour
// Android et notifications push. Sur le web, tout est ignoré sans erreur.
// ============================================================
import { Capacitor } from "@capacitor/core";

export const IS_NATIVE = Capacitor.isNativePlatform();
export const PLATFORM = Capacitor.getPlatform(); // "android" | "ios" | "web"

// Mode « app » : appli native, PWA installée, ou aperçu simulateur (?app=1).
function detectAppMode() {
  if (IS_NATIVE) return true;
  try {
    const q = new URLSearchParams(window.location.search).get("app");
    if (q === "1") sessionStorage.setItem("mr_app", "1");
    if (q === "0") sessionStorage.removeItem("mr_app");
    if (sessionStorage.getItem("mr_app") === "1") return true;
  } catch { /* stockage indisponible */ }
  try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; } catch { return false; }
}
export const APP_MODE = detectAppMode();

const html = document.documentElement;
if (APP_MODE) html.classList.add("mr-app");
if (IS_NATIVE) html.classList.add("mr-native", `mr-${PLATFORM}`);

// Pas de zoom à deux doigts dans l'app (le texte reste lisible : champs en 16 px).
if (APP_MODE) {
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover");
  // iOS ignore user-scalable=no : on bloque aussi le geste de zoom.
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
}

// ---- Vibrations légères ---------------------------------------------
let Haptics = null;
let lastTap = 0;
export function tap(style = "LIGHT") {
  if (!Haptics) return;
  Haptics.impact({ style }).catch(() => {});
}
export function success() {
  if (Haptics) Haptics.notification({ type: "SUCCESS" }).catch(() => {});
}

// ---- Bouton retour Android ----------------------------------------------
// L'application enregistre ici sa fonction : elle renvoie true si elle a
// pu revenir en arrière (page précédente, fenêtre fermée…).
let backHandler = () => false;
export function setBackHandler(fn) { backHandler = fn || (() => false); }

// ---- Notifications push ----------------------------------------------------
let pushHandlers = { onToken: null, onReceive: null, onOpen: null };
export function setPushHandlers(h) { pushHandlers = { ...pushHandlers, ...h }; }
// Firebase doit être configuré (google-services.json) sinon Android plante
// à l'enregistrement : activé seulement si VITE_PUSH_ENABLED=1 au build.
export const PUSH_READY = IS_NATIVE && import.meta.env.VITE_PUSH_ENABLED === "1";
let pushStarted = false;

export async function registerPush() {
  if (!PUSH_READY || pushStarted) return;
  pushStarted = true;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") { pushStarted = false; return; }
    await PushNotifications.addListener("registration", (t) => pushHandlers.onToken?.(t.value, PLATFORM));
    await PushNotifications.addListener("registrationError", (e) => console.warn("[push]", e?.error));
    await PushNotifications.addListener("pushNotificationReceived", (n) => pushHandlers.onReceive?.(n));
    await PushNotifications.addListener("pushNotificationActionPerformed", (a) => pushHandlers.onOpen?.(a.notification));
    await PushNotifications.register();
  } catch (e) {
    pushStarted = false;
    console.warn("[push]", e?.message || e);
  }
}

// ---- Initialisation (une seule fois, au démarrage) --------------------------
export async function initNative() {
  if (!IS_NATIVE) return;
  try {
    const [{ StatusBar, Style }, hap, { Keyboard }, { App }] = await Promise.all([
      import("@capacitor/status-bar"),
      import("@capacitor/haptics"),
      import("@capacitor/keyboard"),
      import("@capacitor/app"),
    ]);
    Haptics = hap.Haptics;

    // Barre d'état assortie à l'en-tête blanc : icônes sombres.
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    if (PLATFORM === "android") {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      StatusBar.setBackgroundColor({ color: "#ffffff" }).catch(() => {});
    }

    // Clavier : on masque la barre d'onglets pendant la saisie.
    Keyboard.addListener("keyboardWillShow", () => html.classList.add("mr-kb-open"));
    Keyboard.addListener("keyboardWillHide", () => html.classList.remove("mr-kb-open"));
    if (PLATFORM === "ios") Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {});

    // Bouton retour Android : page précédente, sinon on quitte l'app.
    App.addListener("backButton", () => {
      if (!backHandler()) App.exitApp();
    });

    // Vibration légère sur chaque bouton / lien touché.
    document.addEventListener("click", (e) => {
      const el = e.target.closest?.("button, a, [role='button'], label[for], input[type='checkbox'], input[type='radio'], select");
      if (!el || el.disabled) return;
      const now = Date.now();
      if (now - lastTap < 60) return;
      lastTap = now;
      tap();
    }, true);
  } catch (e) {
    console.warn("[native]", e?.message || e);
  }
}

// Masque l'écran de démarrage une fois la première page affichée.
export async function hideSplash() {
  if (!IS_NATIVE) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch { /* noop */ }
}
