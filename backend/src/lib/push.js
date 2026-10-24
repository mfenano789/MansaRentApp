// ============================================================
// MansaRent — Notifications push (Firebase Cloud Messaging)
// Android directement, iPhone via la clé APNs ajoutée dans Firebase.
// Sans compte de service configuré (admin → Intégrations → Firebase),
// tout est ignoré silencieusement : l'API continue de fonctionner.
// ============================================================
import { prisma } from "./db.js";

let app = null;
let appKey = "";

async function messaging() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  if (app && appKey === raw) return app.messaging();
  try {
    const admin = (await import("firebase-admin")).default;
    const cred = JSON.parse(raw);
    if (cred.private_key) cred.private_key = cred.private_key.replace(/\\n/g, "\n");
    if (app) await app.delete().catch(() => {});
    app = admin.initializeApp({ credential: admin.credential.cert(cred) }, `mansarent-${Date.now()}`);
    appKey = raw;
    return app.messaging();
  } catch (e) {
    console.warn("[push] Firebase non configuré :", e.message);
    return null;
  }
}

const DEAD = /registration-token-not-registered|invalid-registration-token|invalid-argument/;

export const Push = {
  /** Envoie une notification à tous les téléphones d'un utilisateur. */
  async toUser(userId, { title, body, data = {} }) {
    if (!userId) return { sent: 0 };
    const m = await messaging();
    if (!m) return { sent: 0 };
    const devices = await prisma.deviceToken.findMany({ where: { userId }, select: { token: true } });
    if (!devices.length) return { sent: 0 };
    const tokens = devices.map((d) => d.token);
    const res = await m.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: "high", notification: { color: "#0b5a3a", sound: "default", icon: "ic_stat_mansarent" } },
      apns: { payload: { aps: { sound: "default" } } },
    });
    // Jetons périmés (appli désinstallée…) : on les retire.
    const dead = res.responses.map((r, i) => (!r.success && DEAD.test(r.error?.code || "") ? tokens[i] : null)).filter(Boolean);
    if (dead.length) await prisma.deviceToken.deleteMany({ where: { token: { in: dead } } }).catch(() => {});
    return { sent: res.successCount };
  },
};
