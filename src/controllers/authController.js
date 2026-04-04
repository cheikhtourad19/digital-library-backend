const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * Signup - Client only
 */
exports.signup = async (req, res) => {
  try {
    const { nom, email, motDePasse } = req.body;

    // Validation
    if (!nom || !email || !motDePasse) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "Cet email est déjà enregistré" });
    }

    // Create new client user
    // Password hashing is handled by User model pre-save hook
    const newUser = new User({
      nom,
      email,
      motDePasse,
      isAdmin: false, // Always false for signup
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
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de l'inscription", error: error.message });
  }
};

/**
 * Login - Admin and Client
 */
exports.login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    // Validation
    if (!email || !motDePasse) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    // Generate JWT token
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
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la connexion", error: error.message });
  }
};
