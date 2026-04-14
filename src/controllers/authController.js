const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * Signup - Client only
 */
exports.signup = async (req, res) => {
  try {
    const { nom, email, motDePasse , dateNaissance, sexe } = req.body;

  
    if (!nom || !email || !motDePasse) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "Cet email est déjà enregistré" });
    }

    
    const newUser = new User({
      nom,
      email,
      motDePasse,
      isAdmin: false, 
      dateNaissance,
      sexe,
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, isAdmin: newUser.isAdmin },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "Inscription réussie",
      token,
      user: {
        id: newUser._id,
        nom: newUser.nom,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        dateNaissance: newUser.dateNaissance,
        sexe: newUser.sexe,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de l'inscription", error: error.message });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    // Validation
    if (!email || !motDePasse) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    
    const isPasswordValid = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    
    const token = jwt.sign(
      { userId: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" },
    );

    res.status(200).json({
      message: "Connexion réussie",
      token,
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        isAdmin: user.isAdmin,
        dateNaissance: user.dateNaissance,
        sexe: user.sexe,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la connexion", error: error.message });
  }
};

exports.editPassword = async (req, res) => {
  try {
    const { userId } = req.user; // Assuming user ID is available in req.user
    const { currentPassword, newPassword } = req.body;

   
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.motDePasse,
    );
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Mot de passe actuel incorrect" });
    }

    
    user.motDePasse = newPassword;
    await user.save();

    res.status(200).json({ message: "Mot de passe mis à jour avec succès" });
  } catch (error) {
    console.error("Edit password error:", error);
    res.status(500).json({
      message: "Erreur lors de la mise à jour du mot de passe",
      error: error.message,
    });
  }


};
