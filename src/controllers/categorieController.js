const Categorie = require("../models/Categorie");
const ApiResponse = require("../utils/ApiResponse");

/**
 * GET /categories
 * Public - retrieve all categories.
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await Categorie.find().sort({ nom: 1 });
    return res
      .status(200)
      .json(ApiResponse.ok(categories, "Catégories récupérées"));
  } catch (error) {
    console.error("getCategories error:", error);
    return res
      .status(500)
      .json(ApiResponse.fail("Erreur lors de la récupération des catégories"));
  }
};

/**
 * POST /categories
 * Admin only - create a new category.
 */
exports.createCategorie = async (req, res) => {
  try {
    const { nom, description } = req.body;

    if (!nom || !nom.trim()) {
      return res
        .status(400)
        .json(ApiResponse.fail("Le nom de la catégorie est requis"));
    }

    const existing = await Categorie.findOne({ nom: nom.trim() });
    if (existing) {
      return res
        .status(409)
        .json(ApiResponse.fail("Cette catégorie existe déjà"));
    }

    const categorie = await Categorie.create({
      nom: nom.trim(),
      description: description ? description.trim() : "",
    });

    return res
      .status(201)
      .json(ApiResponse.ok(categorie, "Catégorie créée avec succès"));
  } catch (error) {
    console.error("createCategorie error:", error);

    if (error?.code === 11000) {
      return res
        .status(409)
        .json(ApiResponse.fail("Cette catégorie existe déjà"));
    }

    return res
      .status(500)
      .json(ApiResponse.fail("Erreur lors de la création de la catégorie"));
  }
};
