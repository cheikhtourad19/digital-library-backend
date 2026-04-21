const express = require("express");
const router = express.Router();

const statsController = require("../controllers/statsController");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");

router.use(verifyToken, isAdmin);

router.get("/overview", statsController.getOverview);
router.get("/top-livres", statsController.getTopLivres);
router.get("/sales-trend", statsController.getSalesTrend);
router.get("/users", statsController.getUsersStats);
router.get("/categories", statsController.getCategoriesStats);
router.get("/top-livres-by-sexe", statsController.getTopLivresBySexe);
router.get("/top-livres-by-age", statsController.getTopLivresByAge);
router.get("/top-categories-by-age", statsController.getTopCategoriesByAge);
module.exports = router;
