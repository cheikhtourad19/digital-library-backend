const mongoose = require("mongoose");

const livreSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: true,
    },
    auteur: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    categorie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categorie",
      required: true,
    },
    prix: {
      type: Number,
      required: true,
    },
    fichierPDF: {
      type: String, // URL or path to PDF file
      required: true,
    },
    couverture: {
      type: String, // URL or path to cover image
      required: true,
    },
    dateAjout: {
      type: Date,
      default: Date.now,
    },
    nombrePages: {
      type: Number,
      default: 0,
    },
    evaluations: {
      type: [Number],
      default: [],
    },
    avis: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Livre", livreSchema);
