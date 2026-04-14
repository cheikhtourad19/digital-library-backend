const mongoose = require("mongoose");

// ── Sub-document: one book line item within an order ─────────────────────────
const ligneCommandeSchema = new mongoose.Schema(
  {
    livre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Livre",
      required: true,
    },
    // Snapshot the price at purchase time so future price changes don't
    // alter historical order records.
    prixAchat: {
      type: Number,
      required: true,
      min: 0,
    },
    titreLivre: {
      type: String, // Snapshot of title for display without always populating
      required: true,
    },
  },
  { _id: false }, // no separate _id needed for line items
);

// ── Main schema ───────────────────────────────────────────────────────────────
const commandeSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── One or more books per order ───────────────────────────────────────────
    livres: {
      type: [ligneCommandeSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Une commande doit contenir au moins un livre.",
      },
    },

    // ── Total amount paid (sum of prixAchat, stored for quick access) ─────────
    montantTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    // ── Payment info ──────────────────────────────────────────────────────────
    modePaiement: {
      type: String,
      enum: ["carte", "paypal", "virement", "autre"],
      required: true,
    },
    transactionId: {
      type: String, // ID returned by Stripe / PayPal / etc.
      default: null,
    },

    // ── Order lifecycle ───────────────────────────────────────────────────────
    statut: {
      type: String,
      enum: ["en_attente", "confirmée", "échouée", "remboursée"],
      default: "en_attente",
    },

    dateCommande: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
commandeSchema.index({ client: 1, createdAt: -1 });
commandeSchema.index({ statut: 1 });
commandeSchema.index({ "livres.livre": 1 }); // quickly find all orders for a book

// ── Virtual: list of livre IDs (convenient for access-control checks) ─────────
commandeSchema.virtual("livreIds").get(function () {
  return this.livres.map((l) => l.livre);
});

module.exports = mongoose.model("Commande", commandeSchema);
