const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MAX_RECHERCHES = 20;

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    motDePasse: {
      type: String,
      required: true,
      minlength: 8,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },

    historiqueRecherche: {
      type: [String],
      default: [],
    },

    livresAchetes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Livre",
      },
    ],

    dateNaissance: {
      type: Date,
      default: null,
    },

    sexe: {
      type: String,
      enum: ["Homme", "Femme"],
      default: "Homme",
    },

    actif: {
      type: Boolean,
      default: true,
    },
    derniereConnexion: {
      type: Date,
      default: null,
    },

    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("motDePasse")) return;
  const salt = await bcrypt.genSalt(10);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
});

userSchema.methods.verifierMotDePasse = async function (motDePassePlain) {
  return bcrypt.compare(motDePassePlain, this.motDePasse);
};

userSchema.methods.ajouterRecherche = async function (terme) {
  this.historiqueRecherche = [
    terme,
    ...this.historiqueRecherche.filter((t) => t !== terme),
  ].slice(0, MAX_RECHERCHES);
  await this.save();
};

userSchema.methods.possedeLivre = function (livreId) {
  return this.livresAchetes.some((id) => id.equals(livreId));
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.motDePasse;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
