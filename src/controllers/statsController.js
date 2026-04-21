const User = require("../models/User");
const Livre = require("../models/Livre");
const Commande = require("../models/Commande");

const parsePositiveInt = (value, fallback, min = 1, max = 3650) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const getSinceDate = (days) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return since;
};

const buildDateFormat = (groupBy) =>
  groupBy === "month" ? "%Y-%m" : "%Y-%m-%d";

exports.getOverview = async (req, res) => {
  try {
    const days = parsePositiveInt(req.query.days, 30, 1, 3650);
    const sinceDate = getSinceDate(days);

    const [
      totalUsers,
      activeUsers,
      totalLivres,
      activeLivres,
      confirmedSales,
      salesInWindow,
      newUsersInWindow,
      newLivresInWindow,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ actif: true }),
      Livre.countDocuments(),
      Livre.countDocuments({ actif: true }),
      Commande.aggregate([
        { $match: { statut: "confirmée" } },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: "$montantTotal" },
            booksSold: { $sum: { $size: "$livres" } },
          },
        },
      ]),
      Commande.aggregate([
        { $match: { statut: "confirmée", createdAt: { $gte: sinceDate } } },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: "$montantTotal" },
            booksSold: { $sum: { $size: "$livres" } },
          },
        },
      ]),
      User.countDocuments({ createdAt: { $gte: sinceDate } }),
      Livre.countDocuments({ createdAt: { $gte: sinceDate } }),
    ]);

    const allTimeSales = confirmedSales[0] || {
      orders: 0,
      revenue: 0,
      booksSold: 0,
    };
    const windowSales = salesInWindow[0] || {
      orders: 0,
      revenue: 0,
      booksSold: 0,
    };

    const avgOrderValue =
      allTimeSales.orders > 0
        ? Number((allTimeSales.revenue / allTimeSales.orders).toFixed(2))
        : 0;

    return res.status(200).json({
      message: "Statistiques globales récupérées",
      window: { days, sinceDate },
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: Math.max(totalUsers - activeUsers, 0),
          newInWindow: newUsersInWindow,
        },
        livres: {
          total: totalLivres,
          active: activeLivres,
          inactive: Math.max(totalLivres - activeLivres, 0),
          newInWindow: newLivresInWindow,
        },
        sales: {
          allTime: allTimeSales,
          inWindow: windowSales,
          avgOrderValue,
        },
      },
      lastUpdatedAt: new Date(),
    });
  } catch (error) {
    console.error("getOverview error:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des statistiques globales",
    });
  }
};

exports.getTopLivres = async (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 10, 1, 100);

    const topLivres = await Commande.aggregate([
      { $match: { statut: "confirmée" } },
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
      {
        $project: {
          _id: 0,
          livreId: "$_id",
          titre: { $ifNull: ["$livre.titre", "$titreSnapshot"] },
          auteur: { $ifNull: ["$livre.auteur", []] },
          categorie: "$livre.categorie",
          actif: "$livre.actif",
          noteMoyenne: { $ifNull: ["$livre.noteMoyenne", 0] },
          copiesSold: 1,
          revenue: 1,
          ordersCount: { $size: "$orderIds" },
        },
      },
      { $sort: { copiesSold: -1, revenue: -1 } },
      { $limit: limit },
    ]);

    return res.status(200).json({
      message: "Top livres récupérés",
      data: {
        limit,
        totalReturned: topLivres.length,
        items: topLivres,
      },
    });
  } catch (error) {
    console.error("getTopLivres error:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la récupération du top des livres" });
  }
};

exports.getSalesTrend = async (req, res) => {
  try {
    const days = parsePositiveInt(req.query.days, 30, 1, 3650);
    const groupBy = req.query.groupBy === "month" ? "month" : "day";
    const sinceDate = getSinceDate(days);
    const dateFormat = buildDateFormat(groupBy);

    const trend = await Commande.aggregate([
      { $match: { statut: "confirmée", createdAt: { $gte: sinceDate } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: "$createdAt",
            },
          },
          orders: { $sum: 1 },
          revenue: { $sum: "$montantTotal" },
          booksSold: { $sum: { $size: "$livres" } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: "$_id",
          orders: 1,
          revenue: 1,
          booksSold: 1,
        },
      },
    ]);

    return res.status(200).json({
      message: "Tendance des ventes récupérée",
      data: {
        groupBy,
        days,
        sinceDate,
        points: trend,
      },
    });
  } catch (error) {
    console.error("getSalesTrend error:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération de la tendance des ventes",
    });
  }
};

exports.getUsersStats = async (req, res) => {
  try {
    const days = parsePositiveInt(req.query.days, 30, 1, 3650);
    const groupBy = req.query.groupBy === "month" ? "month" : "day";
    const sinceDate = getSinceDate(days);
    const dateFormat = buildDateFormat(groupBy);

    const [
      totalUsers,
      adminUsers,
      activeUsers,
      newUsersInWindow,
      recentlyConnected,
      registrationsTrend,
      topBuyers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isAdmin: true }),
      User.countDocuments({ actif: true }),
      User.countDocuments({ createdAt: { $gte: sinceDate } }),
      User.countDocuments({ derniereConnexion: { $gte: sinceDate } }),
      User.aggregate([
        { $match: { createdAt: { $gte: sinceDate } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: "$createdAt",
              },
            },
            users: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            period: "$_id",
            users: 1,
          },
        },
      ]),
      Commande.aggregate([
        { $match: { statut: "confirmée" } },
        {
          $group: {
            _id: "$client",
            orders: { $sum: 1 },
            totalSpent: { $sum: "$montantTotal" },
            booksBought: { $sum: { $size: "$livres" } },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $addFields: {
            user: { $arrayElemAt: ["$user", 0] },
          },
        },
        {
          $project: {
            _id: 0,
            userId: "$_id",
            nom: "$user.nom",
            email: "$user.email",
            actif: "$user.actif",
            orders: 1,
            totalSpent: 1,
            booksBought: 1,
          },
        },
      ]),
    ]);

    return res.status(200).json({
      message: "Statistiques utilisateurs récupérées",
      data: {
        summary: {
          total: totalUsers,
          admins: adminUsers,
          clients: Math.max(totalUsers - adminUsers, 0),
          active: activeUsers,
          inactive: Math.max(totalUsers - activeUsers, 0),
          newInWindow: newUsersInWindow,
          connectedInWindow: recentlyConnected,
        },
        registrationsTrend: {
          groupBy,
          days,
          sinceDate,
          points: registrationsTrend,
        },
        topBuyers,
      },
    });
  } catch (error) {
    console.error("getUsersStats error:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des statistiques utilisateurs",
    });
  }
};

exports.getCategoriesStats = async (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 10, 1, 100);

    const categoriesStats = await Commande.aggregate([
      { $match: { statut: "confirmée" } },
      { $unwind: "$livres" },
      {
        $lookup: {
          from: "livres",
          localField: "livres.livre",
          foreignField: "_id",
          as: "livre",
        },
      },
      { $unwind: "$livre" },
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
        $group: {
          _id: "$livre.categorie",
          nom: { $first: "$categorie.nom" },
          slug: { $first: "$categorie.slug" },
          copiesSold: { $sum: 1 },
          revenue: { $sum: "$livres.prixAchat" },
          orderIds: { $addToSet: "$_id" },
          livreIds: { $addToSet: "$livre._id" },
        },
      },
      {
        $project: {
          _id: 0,
          categorieId: "$_id",
          nom: { $ifNull: ["$nom", "Sans catégorie"] },
          slug: 1,
          copiesSold: 1,
          revenue: 1,
          ordersCount: { $size: "$orderIds" },
          uniqueLivres: { $size: "$livreIds" },
        },
      },
      { $sort: { copiesSold: -1, revenue: -1 } },
      { $limit: limit },
    ]);

    return res.status(200).json({
      message: "Statistiques des catégories récupérées",
      data: {
        limit,
        totalReturned: categoriesStats.length,
        items: categoriesStats,
      },
    });
  } catch (error) {
    console.error("getCategoriesStats error:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des statistiques des catégories",
    });
  }
};

exports.getTopLivresBySexe = async (req, res) => {
  const { sexe } = req.query;
  if (!["Homme", "Femme"].includes(sexe)) {
    return res.status(400).json({ message: "Sexe invalide" });
  }
  try {
    const topLivres = await Commande.aggregate([
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
      { $match: { "clientInfo.sexe": sexe } },
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
      {
        $project: {
          _id: 0,
          livreId: "$_id",
          titre: { $ifNull: ["$livre.titre", "$titreSnapshot"] },
          auteur: { $ifNull: ["$livre.auteur", []] },
          categorie: "$livre.categorie",
          actif: "$livre.actif",
          noteMoyenne: { $ifNull: ["$livre.noteMoyenne", 0] },
          copiesSold: 1,
          revenue: 1,
          ordersCount: { $size: "$orderIds" },
        },
      },
      { $sort: { copiesSold: -1, revenue: -1 } },
      { $limit: 10 },
    ]);

    return res.status(200).json({
      message: `Top livres pour le sexe ${sexe} récupérés`,
      data: {
        sexe,
        totalReturned: topLivres.length,
        items: topLivres,
      },
    });
  } catch (error) {
    console.error("getTopLivresBySexe error:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des top livres",
    });
  }
};

exports.getTopLivresByAge = async (req, res) => {
  const ageGroups = [
    { label: "0-17", min: 0, max: 17 },
    { label: "18-25", min: 18, max: 25 },
    { label: "26-35", min: 26, max: 35 },
    { label: "36-45", min: 36, max: 45 },
    { label: "46-60", min: 46, max: 60 },
    { label: "60+", min: 61, max: 120 },
  ];
  const ageGroup = req.query.ageGroup;
  const group = ageGroups.find((g) => g.label === ageGroup);
  if (!group) {
    return res.status(400).json({ message: "Groupe d'âge invalide" });
  }
  try {
    const sinceDate = new Date();
    sinceDate.setFullYear(sinceDate.getFullYear() - group.max);
    const untilDate = new Date();
    untilDate.setFullYear(untilDate.getFullYear() - group.min);

    const topLivres = await Commande.aggregate([
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
          "clientInfo.dateNaissance": { $gte: sinceDate, $lte: untilDate },
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
      {
        $project: {
          _id: 0,
          livreId: "$_id",
          titre: { $ifNull: ["$livre.titre", "$titreSnapshot"] },
          auteur: { $ifNull: ["$livre.auteur", []] },
          categorie: "$livre.categorie",
          actif: "$livre.actif",
          noteMoyenne: { $ifNull: ["$livre.noteMoyenne", 0] },
          copiesSold: 1,
          revenue: 1,
          ordersCount: { $size: "$orderIds" },
        },
      },
      { $sort: { copiesSold: -1, revenue: -1 } },
      { $limit: 10 },
    ]);

    return res.status(200).json({
      message: `Top livres pour le groupe d'âge ${ageGroup} récupérés`,
      data: {
        ageGroup,
        totalReturned: topLivres.length,
        items: topLivres,
      },
    });
  } catch (error) {
    console.error("getTopLivresByAge error:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des top livres",
    });
  }
};

exports.getTopCategoriesByAge = async (req, res) => {
  const ageGroups = [
    { label: "0-17", min: 0, max: 17 },
    { label: "18-25", min: 18, max: 25 },
    { label: "26-35", min: 26, max: 35 },
    { label: "36-45", min: 36, max: 45 },
    { label: "46-60", min: 46, max: 60 },
    { label: "60+", min: 61, max: 120 },
  ];
  const ageGroup = req.query.ageGroup;
  const group = ageGroups.find((g) => g.label === ageGroup);
  if (!group) {
    return res.status(400).json({ message: "Groupe d'âge invalide" });
  }
  try {
    const sinceDate = new Date();
    sinceDate.setFullYear(sinceDate.getFullYear() - group.max);
    const untilDate = new Date();
    untilDate.setFullYear(untilDate.getFullYear() - group.min);

    const topCategories = await Commande.aggregate([
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
          "clientInfo.dateNaissance": { $gte: sinceDate, $lte: untilDate },
        },
      },
      { $unwind: "$livres" },
      {
        $lookup: {
          from: "livres",
          localField: "livres.livre",
          foreignField: "_id",
          as: "livre",
        },
      },
      { $unwind: "$livre" },
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
        $group: {
          _id: "$livre.categorie",
          nom: { $first: "$categorie.nom" },
          slug: { $first: "$categorie.slug" },
          copiesSold: { $sum: 1 },
          revenue: { $sum: "$livres.prixAchat" },
          orderIds: { $addToSet: "$_id" },
          livreIds: { $addToSet: "$livre._id" },
        },
      },
      {
        $project: {
          _id: 0,
          categorieId: "$_id",
          nom: { $ifNull: ["$nom", "Sans catégorie"] },
          slug: 1,
          copiesSold: 1,
          revenue: 1,
          ordersCount: { $size: "$orderIds" },
          uniqueLivres: { $size: "$livreIds" },
        },
      },
      { $sort: { copiesSold: -1, revenue: -1 } },
      { $limit: 10 },
    ]);

    return res.status(200).json({
      message: `Top catégories pour le groupe d'âge ${ageGroup} récupérées`,
      data: {
        ageGroup,
        totalReturned: topCategories.length,
        items: topCategories,
      },
    });
  } catch (error) {
    console.error("getTopCategoriesByAge error:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des top catégories",
    });
  }
};
