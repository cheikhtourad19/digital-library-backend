const mongoose = require("mongoose");

const avisSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    commentaire: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

const livreSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: true,
      trim: true,
    },
    auteur: {
      type: [String],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    categorie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categorie",
      required: true,
    },
    prix: {
      type: Number,
      required: true,
      min: 0,
    },
    fichierPDF: {
      type: String, 
      required: true,
    },
    couverture: {
      type: String, 
      required: true,
    },
    nombrePages: {
      type: Number,
      default: 0,
      min: 0,
    },
    langue: {
      type: String,
      default: "fr",
    },
    isbn: {
      type: String,
      trim: true,
      default: "",
    },
    datePublication: {
      type: Date,
    },

    avis: {
      type: [avisSchema],
      default: [],
    },

    noteMoyenne: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // ── Soft delete flag ─────────────────────────────────────────────────────
    actif: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

livreSchema.index({ titre: "text", auteur: "text", description: "text" }); 
livreSchema.index({ categorie: 1 });
livreSchema.index({ prix: 1 });

livreSchema.virtual("nombreAvis").get(function () {
  return this.avis.length;
});

livreSchema.methods.recalculerNote = async function () {
  if (this.avis.length === 0) {
    this.noteMoyenne = 0;
  } else {
    const total = this.avis.reduce((sum, a) => sum + a.note, 0);
    this.noteMoyenne = Math.round((total / this.avis.length) * 10) / 10;
  }
  await this.save();
};

module.exports = mongoose.model("Livre", livreSchema);
