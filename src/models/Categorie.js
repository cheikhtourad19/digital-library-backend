const mongoose = require("mongoose");

const categorieSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
  },
  { timestamps: true },
);

// Auto-generate slug from nom before saving
categorieSchema.pre("save", function () {
  if (this.isModified("nom")) {
    this.slug = this.nom
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }
});

module.exports = mongoose.model("Categorie", categorieSchema);
