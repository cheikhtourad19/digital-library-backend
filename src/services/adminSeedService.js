const User = require("../models/User");
const config = require("../config/config");

const ensureBaseAdmin = async () => {
  const adminEmail = (
    config.BASE_ADMIN_EMAIL || "admin@digital-library.com"
  ).toLowerCase();

  const existingUser = await User.findOne({ email: adminEmail });

  if (existingUser) {
    if (!existingUser.isAdmin) {
      existingUser.isAdmin = true;
      await existingUser.save();
      console.log(`✓ Compte base admin mis a jour: ${adminEmail}`);
      return;
    }

    console.log(`✓ Compte base admin deja present: ${adminEmail}`);
    return;
  }

  await User.create({
    nom: config.BASE_ADMIN_NOM,
    email: adminEmail,
    motDePasse: config.BASE_ADMIN_PASSWORD,
    isAdmin: true,
  });

  console.log(`✓ Compte base admin cree: ${adminEmail}`);
};

module.exports = ensureBaseAdmin;
