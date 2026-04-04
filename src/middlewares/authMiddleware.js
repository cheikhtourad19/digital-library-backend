const jwt = require("jsonwebtoken");

/**
 * Verify JWT token and extract user info
 */
exports.verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ message: "Token manquant" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

/**
 * Check if user is admin
 */
exports.isAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res
      .status(403)
      .json({ message: "Accès réservé aux administrateurs" });
  }
  next();
};

/**
 * Check if user is client (not admin)
 */
exports.isClient = (req, res, next) => {
  if (!req.user || req.user.isAdmin) {
    return res.status(403).json({ message: "Accès réservé aux clients" });
  }
  next();
};
