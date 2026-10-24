// ============================================================
// MansaRent — Stockage images via Cloudflare R2 (API compatible S3)
// ============================================================
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Sans R2 : les images sont enregistrées sur le disque du backend (backend/uploads)
// et servies sous /api/uploads. Parfait en local ; en production, connectez R2.
export const UPLOADS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");
const EXT_OK = /^(jpg|jpeg|png|webp|gif|heic|heif)$/i;

const hasR2 = () =>
  !!process.env.R2_ACCOUNT_ID &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY &&
  !!process.env.R2_BUCKET_NAME;

// Client construit à la demande : les clés peuvent arriver de l'admin
// (syncIntegrationsToEnv) après le démarrage — pas seulement du .env.
function client() {
  if (!hasR2()) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export const Storage = {
  get enabled() { return hasR2(); },
  async upload(buffer, { contentType = "image/jpeg", ext = "jpg", prefix = "properties" } = {}) {
    const s3 = client();
    if (!s3) {
      const safeExt = EXT_OK.test(ext) ? ext.toLowerCase() : "jpg";
      const rel = `${prefix.replace(/[^a-z0-9_-]/gi, "")}/${randomUUID()}.${safeExt}`;
      await mkdir(path.join(UPLOADS_DIR, path.dirname(rel)), { recursive: true });
      await writeFile(path.join(UPLOADS_DIR, rel), buffer);
      // UPLOADS_BASE_URL (ex. https://api.mansarent.com) si le frontend est sur un autre domaine.
      return { key: rel, url: `${process.env.UPLOADS_BASE_URL || ""}/api/uploads/${rel}`, local: true };
    }
    const BUCKET = process.env.R2_BUCKET_NAME || "";
    const PUBLIC_URL = process.env.R2_PUBLIC_URL || ""; // ex. https://pub-xxx.r2.dev
    const key = `${prefix}/${new Date().getFullYear()}/${randomUUID()}.${ext}`;
    await s3.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType })
    );
    const url = PUBLIC_URL ? `${PUBLIC_URL}/${key}` : await this.signedUrl(key);
    return { key, url };
  },
  async signedUrl(key, expiresIn = 3600) {
    const s3 = client();
    if (!s3) return null;
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }), { expiresIn });
  },
};
