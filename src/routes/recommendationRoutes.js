const express = require("express");

const router = express.Router();
const recommendationController = require("../controllers/recommendationController");

router.get("/age", recommendationController.getRecommendedBooksByAgeGroup);
router.get("/trending", recommendationController.getTrendingBooks);
router.get("/new", recommendationController.getNewBooks);


module.exports = router;
