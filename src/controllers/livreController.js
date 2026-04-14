const Livre = require("../models/Livre");
const Commande = require("../models/Commande");
const {
  minioClient,
  minioPublicClient,
  BUCKETS,
} = require("../config/minio.js");
const { v4: uuidv4 } = require("uuid");
const pdfParseLib = require("pdf-parse");
const path = require("path");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Upload a file buffer to MinIO and return its public/presigned URL.
 * @param {Buffer} buffer      - File buffer from multer memoryStorage
 * @param {string} originalName
 * @param {string} bucket      - Target MinIO bucket
 * @param {string} folder      - Subfolder prefix inside bucket
 * @param {string} mimetype
 * @returns {Promise<string>}  - Object name (key) stored in MinIO
 */
const uploadToMinio = async (
  buffer,
  originalName,
  bucket,
  folder,
  mimetype,
) => {
  const ext = path.extname(originalName);
  const objectName = `${folder}/${uuidv4()}${ext}`;

  await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
    "Content-Type": mimetype,
  });

  return objectName; // store the key, generate presigned URLs on demand
};

/**
 * Delete an object from MinIO.
 * Silently ignores errors (e.g. object already gone).
 */
const deleteFromMinio = async (bucket, objectName) => {
  try {
    if (objectName) await minioClient.removeObject(bucket, objectName);
  } catch (_) {
    // non-critical – log in production
  }
};

/**
 * Generate a presigned GET URL valid for 1 hour.
 */
const presignedUrl = (bucket, objectName) =>
  minioPublicClient.presignedGetObject(bucket, objectName, 60 * 60);

/**
 * Extract page count from a PDF buffer.
 */
const getPdfPageCount = async (pdfBuffer) => {
  // pdf-parse v2 exposes PDFParse class; older versions export a function.
  if (typeof pdfParseLib === "function") {
    const data = await pdfParseLib(pdfBuffer);
    return Number(data.numpages) || 0;
  }

  if (pdfParseLib?.PDFParse) {
    const parser = new pdfParseLib.PDFParse({ data: pdfBuffer });
    try {
      const textResult = await parser.getText();
      return Number(textResult.total) || 0;
    } finally {
      await parser.destroy();
    }
  }

  throw new Error("Bibliothèque pdf-parse incompatible");
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /livres
 * Admin only — create a new book with PDF + cover upload.
 * Expects multipart/form-data with fields: pdf, couverture + body fields.
 */
exports.creerLivre = async (req, res) => {
  try {
    const {
      titre,
      auteur,
      description,
      categorie,
      prix,
      langue,
      isbn,
      datePublication,
    } = req.body;

    if (!req.files?.pdf?.[0] || !req.files?.couverture?.[0]) {
      return res
        .status(400)
        .json({ message: "Le fichier PDF et la couverture sont requis." });
    }

    const pdfFile = req.files.pdf[0];
    const coverFile = req.files.couverture[0];

    // Validate file types
    if (pdfFile.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "Le fichier doit être un PDF." });
    }
    if (!coverFile.mimetype.startsWith("image/")) {
      return res
        .status(400)
        .json({ message: "La couverture doit être une image." });
    }

    const nombrePages = await getPdfPageCount(pdfFile.buffer);

    // Upload both files to MinIO in parallel
    const [pdfKey, coverKey] = await Promise.all([
      uploadToMinio(
        pdfFile.buffer,
        pdfFile.originalname,
        BUCKETS.PDFS,
        "livres",
        pdfFile.mimetype,
      ),
      uploadToMinio(
        coverFile.buffer,
        coverFile.originalname,
        BUCKETS.COVERS,
        "couvertures",
        coverFile.mimetype,
      ),
    ]);

    const livre = await Livre.create({
      titre,
      auteur: Array.isArray(auteur) ? auteur : [auteur],
      description,
      categorie,
      prix: Number(prix),
      nombrePages,
      langue: langue || "fr",
      isbn: isbn || "",
      datePublication: datePublication || null,
      fichierPDF: pdfKey,
      couverture: coverKey,
    });

    res.status(201).json({ message: "Livre créé avec succès.", livre });
  } catch (err) {
    console.error("creerLivre:", err);
    res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
};

/**
 * GET /livres
 * Public — list all active books with optional filters + pagination.
 * Query params: categorie, minPrix, maxPrix, langue, search, page, limite
 */
exports.getLivres = async (req, res) => {
  try {
    const {
      categorie,
      minPrix,
      maxPrix,
      langue,
      search,
      page = 1,
      limite = 12,
    } = req.query;

    const filtre = { actif: true };

    if (categorie) filtre.categorie = categorie;
    if (langue) filtre.langue = langue;
    if (minPrix || maxPrix) {
      filtre.prix = {};
      if (minPrix) filtre.prix.$gte = Number(minPrix);
      if (maxPrix) filtre.prix.$lte = Number(maxPrix);
    }
    if (search) {
      filtre.$text = { $search: search };
    }

    const skip = (Number(page) - 1) * Number(limite);

    const [livres, total] = await Promise.all([
      Livre.find(filtre)
        .select("-fichierPDF -avis")
        .populate("categorie", "nom slug")
        .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
        .skip(skip)
        .limit(Number(limite))
        .lean(),
      Livre.countDocuments(filtre),
    ]);

    const livresAvecUrls = await Promise.all(
      livres.map(async (l) => ({
        ...l,
        couvertureUrl: await presignedUrl(BUCKETS.COVERS, l.couverture),
      })),
    );

    res.json({
      livres: livresAvecUrls,
      pagination: {
        total,
        page: Number(page),
        limite: Number(limite),
        pages: Math.ceil(total / Number(limite)),
      },
    });
  } catch (err) {
    console.error("getLivres:", err);
    res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
};

/**
 * GET /livres/:id
 * Public — get book details (no PDF key, no download URL).
 */
exports.getLivreById = async (req, res) => {
  try {
    const livre = await Livre.findOne({ _id: req.params.id, actif: true })
      .select("-fichierPDF")
      .populate("categorie", "nom slug")
      .populate("avis.client", "nom")
      .lean();

    if (!livre) return res.status(404).json({ message: "Livre non trouvé." });

    livre.couvertureUrl = await presignedUrl(BUCKETS.COVERS, livre.couverture);

    res.json(livre);
  } catch (err) {
    console.error("getLivreById:", err);
    res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
};

/**
 * GET /livres/:id/lire
 * Protected (verifyToken) — generate a short-lived presigned PDF URL.
 * Only accessible if the user has purchased the book.
 */
exports.getLivrePDF = async (req, res) => {
  try {
    const livre = await Livre.findOne({
      _id: req.params.id,
      actif: true,
    }).select("fichierPDF titre");
    if (!livre) return res.status(404).json({ message: "Livre non trouvé." });

    // Admins can always access
    if (!req.user.isAdmin) {
      const commande = await Commande.findOne({
        client: req.user._id,
        statut: "confirmée",
        "livres.livre": livre._id,
      });

      if (!commande) {
        return res
          .status(403)
          .json({ message: "Accès refusé. Vous n'avez pas acheté ce livre." });
      }
    }

    // Presigned URL valid for 2 hours
    const url = await minioPublicClient.presignedGetObject(
      BUCKETS.PDFS,
      livre.fichierPDF,
      2 * 60 * 60,
    );

    res.json({ url, titre: livre.titre });
  } catch (err) {
    console.error("getLivrePDF:", err);
    res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
};

/**
 * PUT /livres/:id
 * Admin only — update book metadata and optionally replace files.
 */
exports.modifierLivre = async (req, res) => {
  try {
    const livre = await Livre.findById(req.params.id);
    if (!livre) return res.status(404).json({ message: "Livre non trouvé." });

    const {
      titre,
      auteur,
      description,
      categorie,
      prix,
      nombrePages,
      langue,
      isbn,
      datePublication,
    } = req.body;

    // Update scalar fields
    if (titre) livre.titre = titre;
    if (auteur) livre.auteur = Array.isArray(auteur) ? auteur : [auteur];
    if (description) livre.description = description;
    if (categorie) livre.categorie = categorie;
    if (prix !== undefined) livre.prix = Number(prix);
    if (nombrePages !== undefined) livre.nombrePages = Number(nombrePages);
    if (langue) livre.langue = langue;
    if (isbn !== undefined) livre.isbn = isbn;
    if (datePublication !== undefined) livre.datePublication = datePublication;

    // Replace PDF if a new one was uploaded
    if (req.files?.pdf?.[0]) {
      const pdfFile = req.files.pdf[0];
      if (pdfFile.mimetype !== "application/pdf") {
        return res
          .status(400)
          .json({ message: "Le fichier doit être un PDF." });
      }
      await deleteFromMinio(BUCKETS.PDFS, livre.fichierPDF);
      livre.fichierPDF = await uploadToMinio(
        pdfFile.buffer,
        pdfFile.originalname,
        BUCKETS.PDFS,
        "livres",
        pdfFile.mimetype,
      );
    }

    // Replace cover if a new one was uploaded
    if (req.files?.couverture?.[0]) {
      const coverFile = req.files.couverture[0];
      if (!coverFile.mimetype.startsWith("image/")) {
        return res
          .status(400)
          .json({ message: "La couverture doit être une image." });
      }
      await deleteFromMinio(BUCKETS.COVERS, livre.couverture);
      livre.couverture = await uploadToMinio(
        coverFile.buffer,
        coverFile.originalname,
        BUCKETS.COVERS,
        "couvertures",
        coverFile.mimetype,
      );
    }

    await livre.save();
    res.json({ message: "Livre mis à jour.", livre });
  } catch (err) {
    console.error("modifierLivre:", err);
    res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
};

/**
 * DELETE /livres/:id
 * Admin only — soft delete (sets actif = false).
 */
exports.supprimerLivre = async (req, res) => {
  try {
    const livre = await Livre.findById(req.params.id);
    if (!livre) return res.status(404).json({ message: "Livre non trouvé." });

    livre.actif = false;
    await livre.save();

    res.json({ message: "Livre désactivé avec succès." });
  } catch (err) {
    console.error("supprimerLivre:", err);
    res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
};

/**
 * POST /livres/:id/avis
 * Protected (verifyToken) — add or update the authenticated user's review.
 * Only allowed if the user has purchased the book.
 */
exports.ajouterAvis = async (req, res) => {
  try {
    const { note, commentaire } = req.body;

    if (!note || note < 1 || note > 5) {
      return res
        .status(400)
        .json({ message: "La note doit être entre 1 et 5." });
    }

    const livre = await Livre.findOne({ _id: req.params.id, actif: true });
    if (!livre) return res.status(404).json({ message: "Livre non trouvé." });

    // Check purchase
    const commande = await Commande.findOne({
      client: req.user._id,
      statut: "confirmée",
      "livres.livre": livre._id,
    });

    if (!commande) {
      return res.status(403).json({
        message: "Vous devez acheter ce livre avant de laisser un avis.",
      });
    }

    // Upsert: remove existing review from this user, add the new one
    livre.avis = livre.avis.filter((a) => !a.client.equals(req.user._id));
    livre.avis.push({
      client: req.user._id,
      note: Number(note),
      commentaire: commentaire || "",
    });

    await livre.recalculerNote();

    res.json({ message: "Avis enregistré.", noteMoyenne: livre.noteMoyenne });
  } catch (err) {
    console.error("ajouterAvis:", err);
    res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
};

/**
 * DELETE /livres/:id/avis
 * Protected (verifyToken) — remove the authenticated user's own review.
 */
exports.supprimerAvis = async (req, res) => {
  try {
    const livre = await Livre.findOne({ _id: req.params.id, actif: true });
    if (!livre) return res.status(404).json({ message: "Livre non trouvé." });

    const before = livre.avis.length;
    livre.avis = livre.avis.filter((a) => !a.client.equals(req.user._id));

    if (livre.avis.length === before) {
      return res.status(404).json({ message: "Aucun avis à supprimer." });
    }

    await livre.recalculerNote();
    res.json({ message: "Avis supprimé." });
  } catch (err) {
    console.error("supprimerAvis:", err);
    res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
};
