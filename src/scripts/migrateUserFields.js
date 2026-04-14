require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/database");
const User = require("../models/User");

const SEXES = ["Homme", "Femme"];
const BATCH_SIZE = 500;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const pick = (values) => values[rand(0, values.length - 1)];

const randomDateNaissance = () => {
  const today = new Date();
  const minAge = 18;
  const maxAge = 70;
  const age = rand(minAge, maxAge);
  const date = new Date(today);
  date.setFullYear(today.getFullYear() - age);
  date.setMonth(rand(0, 11));
  date.setDate(rand(1, 28));
  date.setHours(0, 0, 0, 0);
  return date;
};

const run = async () => {
  await connectDB();

  const cursor = User.find({}, { _id: 1 }).lean().cursor();
  const bulkOps = [];
  let processedCount = 0;

  for await (const user of cursor) {
    processedCount += 1;
    bulkOps.push({
      updateOne: {
        filter: { _id: user._id },
        update: {
          $set: {
            dateNaissance: randomDateNaissance(),
            sexe: pick(SEXES),
          },
        },
      },
    });

    if (bulkOps.length >= BATCH_SIZE) {
      await User.bulkWrite(bulkOps, { ordered: false });
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    await User.bulkWrite(bulkOps, { ordered: false });
  }

  console.log("Migration terminée:");
  console.log(`- utilisateurs mis à jour: ${processedCount}`);
  console.log("- dateNaissance et sexe ont été randomisés pour chaque user");
};

run()
  .catch((error) => {
    console.error("Migration error:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch (_) {
      // ignore
    }
  });
