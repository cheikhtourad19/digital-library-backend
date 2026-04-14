const express = require("express");
const router = express.Router();

const categorieController = require("../controllers/categorieController");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");

// GET /categories
router.get("/", verifyToken,categorieController.getCategories);

// POST /categories
router.post("/", verifyToken, isAdmin, categorieController.createCategorie);

module.exports = router;
