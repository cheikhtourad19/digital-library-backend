const express = require("express");
const router = express.Router();
const multer = require("multer");
const livreController = require("../controllers/livreController");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");

// ─── Multer — memory storage, files go straight to MinIO ─────────────────────
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max per file
  },
});

// Accepts: pdf (1 file) + couverture (1 file)
const uploadLivre = upload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "couverture", maxCount: 1 },
]);

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * Public routes
 */

// GET /livres?categorie=&minPrix=&maxPrix=&langue=&search=&page=&limite=
router.get("/", verifyToken, livreController.getLivres);

// GET /livres/:id
router.get("/:id", verifyToken, livreController.getLivreById);

/**
 * Protected routes (authenticated users)
 */

// GET /livres/:id/lire  — returns a short-lived presigned PDF URL
// Access is granted only if the user has a confirmed purchase
router.get("/:id/lire", verifyToken, livreController.getLivrePDF);

// POST /livres/:id/avis  — add or update a review (must have purchased the book)
router.post("/:id/avis", verifyToken, livreController.ajouterAvis);

// DELETE /livres/:id/avis  — remove own review
router.delete("/:id/avis", verifyToken, livreController.supprimerAvis);

/**
 * Admin-only routes
 */

// POST /livres  — create a book (multipart: pdf + couverture)
router.post("/", verifyToken, isAdmin, uploadLivre, livreController.creerLivre);

// PUT /livres/:id  — update metadata and/or replace files
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadLivre,
  livreController.modifierLivre,
);

// DELETE /livres/:id  — soft delete
router.delete("/:id", verifyToken, isAdmin, livreController.supprimerLivre);

// ─── Multer error handler (must be the last middleware on this router) ─────────
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Erreur upload : ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

module.exports = router;
