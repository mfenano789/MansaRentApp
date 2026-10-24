// ============================================================
// MansaRent — Upload d'images (multer, mémoire → R2)
// ============================================================
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 }, // 8 Mo / fichier, 8 fichiers max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Seules les images sont acceptées"));
  },
});

export default upload;
