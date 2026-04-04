const mongoose = require("mongoose");

const commandeSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    livre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Livre",
      required: true,
    },
    dateCommande: {
      type: Date,
      default: Date.now,
    },
    montant: {
      type: Number,
      required: true,
    },
    statut: {
      type: String,
      enum: ["en_attente", "confirmée", "livrée", "annulée"],
      default: "en_attente",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Commande", commandeSchema);
