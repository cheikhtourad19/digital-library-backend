const mongoose = require("mongoose");

const lectureSchema = new mongoose.Schema(
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
    dateDebut: {
      type: Date,
      default: Date.now,
    },
    dateDerniereLecture: {
      type: Date,
      default: Date.now,
    },
    dernierePage: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Percentage of the book read (0–100), easier for progress bars in the UI
    progression: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    termine: {
      type: Boolean,
      default: false,
    },
    dateFin: {
      type: Date,
      default: null, // set when termine becomes true
    },
  },
  { timestamps: true }
);

// ── Prevent duplicate Lecture docs for the same (client, livre) pair ──────────
lectureSchema.index({ client: 1, livre: 1 }, { unique: true });

// ── Auto-update dateDerniereLecture and dateFin on every save ─────────────────
lectureSchema.pre("save", function () {
  if (this.isModified("dernierePage") || this.isModified("progression")) {
    this.dateDerniereLecture = new Date();
  }
  if (this.isModified("termine") && this.termine && !this.dateFin) {
    this.dateFin = new Date();
    this.progression = 100;
  }
});

module.exports = mongoose.model("Lecture", lectureSchema);