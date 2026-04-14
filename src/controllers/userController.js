const User = require("../models/User");
const ApiResponse = require("../utils/ApiResponse");

const toSafeUser = (user) => ({
  id: user._id,
  nom: user.nom,
  email: user.email,
  isAdmin: user.isAdmin,
  historiqueRecherche: user.historiqueRecherche,
  dateCreation: user.dateCreation,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * getAlluser -> admin
 */
exports.getAlluser = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const safeUsers = users.map(toSafeUser);

    return res
      .status(200)
      .json(ApiResponse.ok(safeUsers, "Liste des utilisateurs récupérée"));
  } catch (error) {
    console.error("getAlluser error:", error);
    return res
      .status(500)
      .json(
        ApiResponse.fail("Erreur lors de la récupération des utilisateurs"),
      );
  }
};

/**
 * getUserinfo -> admin
 */
exports.getUserinfo = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(ApiResponse.fail("Utilisateur introuvable"));
    }

    return res
      .status(200)
      .json(
        ApiResponse.ok(toSafeUser(user), "Informations utilisateur récupérées"),
      );
  } catch (error) {
    console.error("getUserinfo error:", error);
    return res
      .status(500)
      .json(
        ApiResponse.fail(
          "Erreur lors de la récupération des informations utilisateur",
        ),
      );
  }
};

/**
 * me -> auth
 */
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json(ApiResponse.fail("Utilisateur introuvable"));
    }

    return res
      .status(200)
      .json(ApiResponse.ok(toSafeUser(user), "Profil utilisateur récupéré"));
  } catch (error) {
    console.error("me error:", error);
    return res
      .status(500)
      .json(ApiResponse.fail("Erreur lors de la récupération du profil"));
  }
};

/**
 * editinfo -> auth
 */
exports.editinfo = async (req, res) => {
  try {
    const { nom, email } = req.body;

    if (!nom && !email) {
      return res
        .status(400)
        .json(ApiResponse.fail("Aucune information à mettre à jour"));
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json(ApiResponse.fail("Utilisateur introuvable"));
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res
          .status(409)
          .json(ApiResponse.fail("Cet email est déjà utilisé"));
      }
      user.email = email;
    }

    if (nom) {
      user.nom = nom;
    }

    await user.save();

    return res
      .status(200)
      .json(ApiResponse.ok(toSafeUser(user), "Informations mises à jour"));
  } catch (error) {
    console.error("editinfo error:", error);
    return res
      .status(500)
      .json(ApiResponse.fail("Erreur lors de la mise à jour du profil"));
  }
};

exports.deleteUser = async (req, res) => {
  const { userId } = req.params; // <-- match your route

  try {
    console.log("Deleting id:", userId);

    const user = await User.findByIdAndDelete(userId);

    console.log("Deleted user:", user);

    if (!user) {
      return res.status(404).json(ApiResponse.fail("User not found"));
    }

    return res.status(200).json(ApiResponse.ok(user, "User supprimé"));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(ApiResponse.fail("Erreur lors de la suppression du user"));
  }
};
