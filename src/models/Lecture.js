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
    dernierePage: {
      type: Number,
      default: 0,
    },
    termine: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Lecture", lectureSchema);
