const Livre = require("../models/Livre");
const Commande = require("../models/Commande");
const User = require("../models/User");

const parsePositiveInt = (value, fallback, min = 1, max = 3650) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const ageGroups = [
  { label: "0-17", min: 0, max: 17 },
  { label: "18-25", min: 18, max: 25 },
  { label: "26-35", min: 26, max: 35 },
  { label: "36-45", min: 36, max: 45 },
  { label: "46-60", min: 46, max: 60 },
  { label: "60+", min: 61, max: 120 },
];

const getAgeRange = (ageGroup) => {
  const group = ageGroups.find((item) => item.label === ageGroup);
  if (!group) return null;

  const sinceDate = new Date();
  sinceDate.setFullYear(sinceDate.getFullYear() - group.max);

  const untilDate = new Date();
  untilDate.setFullYear(untilDate.getFullYear() - group.min);

  return { group, sinceDate, untilDate };
};

const bookProjection = {
  _id: 0,
  livreId: "$_id",
  titre: { $ifNull: ["$livre.titre", "$titreSnapshot"] },
  auteur: { $ifNull: ["$livre.auteur", []] },
  description: "$livre.description",
  categorie: "$categorie",
  prix: "$livre.prix",
  nombrePages: "$livre.nombrePages",
  langue: "$livre.langue",
  isbn: "$livre.isbn",
  datePublication: "$livre.datePublication",
  couverture: "$livre.couverture",
  noteMoyenne: { $ifNull: ["$livre.noteMoyenne", 0] },
  createdAt: "$livre.createdAt",
};

const getUserBirthDate = async (req) => {
  if (req.user?.dateNaissance) {
    return new Date(req.user.dateNaissance);
  }

  if (!req.user?.userId) {
    return null;
  }

  const user = await User.findById(req.user.userId)
    .select("dateNaissance")
    .lean();
  return user?.dateNaissance ? new Date(user.dateNaissance) : null;
};

const getAgeGroupFromBirthDate = (birthDate) => {
  if (!(birthDate instanceof Date) || Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const age = new Date().getFullYear() - birthDate.getFullYear();
  const adjustedAge =
    new Date().getMonth() < birthDate.getMonth() ||
    (new Date().getMonth() === birthDate.getMonth() &&
      new Date().getDate() < birthDate.getDate())
      ? age - 1
      : age;

  return ageGroups.find(
    (group) => adjustedAge >= group.min && adjustedAge <= group.max,
  );
};

const getThreeMonthsAgo = () => {
  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - 3);
  return sinceDate;
};

exports.getRecommendedBooksByAgeGroup = async (req, res) => {
  try {
    const birthDate = await getUserBirthDate(req);
    const ageGroup = getAgeGroupFromBirthDate(birthDate);

    if (!ageGroup) {
      return res.status(400).json({
        message: "Impossible de déterminer le groupe d'âge de l'utilisateur",
      });
    }

    const ageRange = getAgeRange(ageGroup.label);

    const recommendedBooks = await Commande.aggregate([
      { $match: { statut: "confirmée" } },
      {
        $lookup: {
          from: "users",
          localField: "client",
          foreignField: "_id",
          as: "clientInfo",
        },
      },
      { $unwind: "$clientInfo" },
      {
        $match: {
          "clientInfo.dateNaissance": {
            $gte: ageRange.sinceDate,
            $lte: ageRange.untilDate,
          },
        },
      },
      { $unwind: "$livres" },
      {
        $group: {
          _id: "$livres.livre",
          copiesSold: { $sum: 1 },
          revenue: { $sum: "$livres.prixAchat" },
          orderIds: { $addToSet: "$_id" },
          titreSnapshot: { $first: "$livres.titreLivre" },
        },
      },
      {
        $lookup: {
          from: "livres",
          localField: "_id",
          foreignField: "_id",
          as: "livre",
        },
      },
      {
        $addFields: {
          livre: { $arrayElemAt: ["$livre", 0] },
        },
      },
      { $match: { "livre.actif": true } },
      {
        $lookup: {
          from: "categories",
          localField: "livre.categorie",
          foreignField: "_id",
          as: "categorie",
        },
      },
      {
        $addFields: {
          categorie: { $arrayElemAt: ["$categorie", 0] },
        },
      },
      {
        $project: bookProjection,
      },
      { $sort: { copiesSold: -1, revenue: -1 } },
      { $limit: 10 },
    ]);

    return res.status(200).json({
      message: `Recommandations pour le groupe d'âge ${ageGroup.label} récupérées`,
      data: {
        ageGroup: ageGroup.label,
        totalReturned: recommendedBooks.length,
        items: recommendedBooks,
      },
    });
  } catch (error) {
    console.error("getRecommendedBooksByAgeGroup error:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des recommandations",
    });
  }
};

exports.getTrendingBooks = async (req, res) => {
  try {
    const sinceDate = getThreeMonthsAgo();

    const trendingBooks = await Commande.aggregate([
      { $match: { statut: "confirmée", createdAt: { $gte: sinceDate } } },
      { $unwind: "$livres" },
      {
        $group: {
          _id: "$livres.livre",
          copiesSold: { $sum: 1 },
          revenue: { $sum: "$livres.prixAchat" },
          orderIds: { $addToSet: "$_id" },
          titreSnapshot: { $first: "$livres.titreLivre" },
        },
      },
      {
        $lookup: {
          from: "livres",
          localField: "_id",
          foreignField: "_id",
          as: "livre",
        },
      },
      {
        $addFields: {
          livre: { $arrayElemAt: ["$livre", 0] },
        },
      },
      { $match: { "livre.actif": true } },
      {
        $lookup: {
          from: "categories",
          localField: "livre.categorie",
          foreignField: "_id",
          as: "categorie",
        },
      },
      {
        $addFields: {
          categorie: { $arrayElemAt: ["$categorie", 0] },
        },
      },
      {
        $project: bookProjection,
      },
      { $sort: { copiesSold: -1, revenue: -1 } },
      { $limit: 10 },
    ]);

    return res.status(200).json({
      message: "Top livres tendances récupérés",
      data: {
        period: "3 months",
        sinceDate,
        totalReturned: trendingBooks.length,
        items: trendingBooks,
      },
    });
  } catch (error) {
    console.error("getTrendingBooks error:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des livres tendances",
    });
  }
};

exports.getNewBooks = async (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 10, 1, 100);

    const newBooks = await Livre.find({ actif: true })
      .select(
        "titre auteur description categorie prix nombrePages langue isbn datePublication couverture noteMoyenne createdAt",
      )
      .populate("categorie", "nom slug")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      message: "Top livres récents récupérés",
      data: {
        limit,
        totalReturned: newBooks.length,
        items: newBooks,
      },
    });
  } catch (error) {
    console.error("getNewBooks error:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des nouveaux livres",
    });
  }
};
