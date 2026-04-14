const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");

router.get("/", verifyToken, isAdmin, userController.getAlluser);

router.get("/me", verifyToken, userController.me);

router.put("/me", verifyToken, userController.editinfo);

router.get("/:userId", verifyToken, isAdmin, userController.getUserinfo);

router.delete("/:userId", verifyToken, isAdmin, userController.deleteUser);

module.exports = router;
