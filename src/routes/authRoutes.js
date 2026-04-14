const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");
router.post("/signup", authController.signup);

router.post("/login", authController.login);
router.put("/edit-password", verifyToken, authController.editPassword);

module.exports = router;
