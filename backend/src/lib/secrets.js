// ============================================================
// MansaRent — Chiffrement des secrets admin (AES-256-GCM)
// Les intégrations saisies dans l'admin sont chiffrées avant stockage.
// PRODUCTION : définissez APP_ENCRYPTION_KEY (64 caractères hexadécimaux).
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Sans clé : clé éphémère (les secrets deviennent illisibles au redémarrage).
// ============================================================
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

let KEY = null;
if (process.env.APP_ENCRYPTION_KEY && /^[0-9a-fA-F]{64}$/.test(process.env.APP_ENCRYPTION_KEY)) {
  KEY = Buffer.from(process.env.APP_ENCRYPTION_KEY, "hex");
} else {
  KEY = randomBytes(32);
  console.warn("[secrets] APP_ENCRYPTION_KEY absente ou invalide — clé éphémère : les intégrations admin ne survivront pas au redémarrage. Définissez-la en production !");
}

export function encryptSecret(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return `v1:${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${data.toString("hex")}`;
}

export function decryptSecret(blob) {
  const [v, ivHex, tagHex, dataHex] = String(blob).split(":");
  if (v !== "v1") throw new Error("Format de secret inconnu");
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

export const isEphemeralKey = () => !process.env.APP_ENCRYPTION_KEY;
