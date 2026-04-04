const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    motDePasse: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false, // false = Client, true = Admin
    },
    historiqueRecherche: {
      type: [String],
      default: [],
    },
    dateCreation: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

/**
 * Hash password before saving
 */
userSchema.pre("save", async function () {
  // Only hash if password is new or modified
  if (!this.isModified("motDePasse")) {
    return;
  }

  // Hash password with salt rounds = 10
  const salt = await bcrypt.genSalt(10);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
});

module.exports = mongoose.model("User", userSchema);
