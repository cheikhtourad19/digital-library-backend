require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = require("../config/database");
const ensureBaseAdmin = require("../services/adminSeedService");

const Categorie = require("../models/Categorie");
const Livre = require("../models/Livre");
const User = require("../models/User");
const Commande = require("../models/Commande");

const FIRST_NAMES = [
  "Amine",
  "Sami",
  "Lina",
  "Yasmine",
  "Nour",
  "Moussa",
  "Aicha",
  "Hassan",
  "Maryam",
  "Khadija",
  "Omar",
  "Aya",
  "Ilyas",
  "Fatima",
  "Younes",
  "Imane",
  "Rania",
  "Salma",
  "Adam",
  "Bilal",
];

const LAST_NAMES = [
  "Diop",
  "Fall",
  "Sow",
  "Ba",
  "Ndiaye",
  "Lo",
  "Traore",
  "Keita",
  "Camara",
  "Diallo",
  "Bensalem",
  "Mansour",
  "Rahmani",
  "Said",
  "Haddad",
  "Toumi",
  "Cherif",
  "Benali",
  "Mahmoud",
  "Sarr",
];

const CATEGORY_SEEDS = [
  { nom: "Roman", description: "Romans et fictions" },
  { nom: "Science", description: "Vulgarisation et ouvrages scientifiques" },
  { nom: "Business", description: "Entrepreneuriat, management et finance" },
  { nom: "Histoire", description: "Histoire moderne et contemporaine" },
  { nom: "Technologie", description: "Programmation et systèmes" },
  { nom: "Développement personnel", description: "Mindset et productivité" },
  { nom: "Biographie", description: "Parcours inspirants" },
  { nom: "Poésie", description: "Poésie classique et moderne" },
  { nom: "Éducation", description: "Apprentissage et pédagogie" },
  { nom: "Santé", description: "Bien-être, nutrition et sport" },
];

const LANGUES = ["fr", "en", "ar"];
const MODE_PAIEMENT = ["carte", "paypal", "virement", "autre"];
const STATUTS = [
  "confirmée",
  "confirmée",
  "confirmée",
  "en_attente",
  "remboursée",
  "échouée",
];

const parseArg = (flag, defaultValue) => {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!match) return defaultValue;
  const value = Number.parseInt(match.split("=")[1], 10);
  return Number.isNaN(value) ? defaultValue : value;
};

const hasFlag = (flag) => process.argv.includes(flag);

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

const randomDateInPastDays = (days = 365) => {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, days));
  d.setHours(rand(0, 23), rand(0, 59), rand(0, 59), 0);
  return d;
};

const randomAuthors = () => {
  const count = rand(1, 3);
  const authors = new Set();
  while (authors.size < count) {
    authors.add(`${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`);
  }
  return Array.from(authors);
};

const createMockCategories = async () => {
  const created = [];
  for (const c of CATEGORY_SEEDS) {
    const existing = await Categorie.findOne({ nom: c.nom });
    if (existing) {
      created.push(existing);
      continue;
    }
    const doc = await Categorie.create(c);
    created.push(doc);
  }
  return created;
};

const createMockUsers = async (count) => {
  const users = [];
  for (let i = 0; i < count; i += 1) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const suffix = `${Date.now()}${i}${rand(100, 999)}`;
    users.push({
      nom: `${first} ${last}`,
      email: `client.${suffix}@mocklibrary.dev`,
      motDePasse: "Client@1234",
      isAdmin: false,
      actif: Math.random() > 0.08,
      derniereConnexion: Math.random() > 0.2 ? randomDateInPastDays(90) : null,
      historiqueRecherche: ["roman", "best seller", "business", "science"]
        .sort(() => 0.5 - Math.random())
        .slice(0, rand(0, 4)),
    });
  }

  return User.insertMany(users);
};

const createMockLivres = async (count, categories) => {
  const livres = [];

  for (let i = 1; i <= count; i += 1) {
    const category = pick(categories);
    const prix = Number((rand(4, 45) + Math.random()).toFixed(2));
    const datePublication = randomDateInPastDays(3650);
    const isbn = `${rand(100, 999)}-${rand(10, 99)}-${rand(100000, 999999)}-${rand(10, 99)}-${rand(0, 9)}`;

    livres.push({
      titre: `Livre Mock #${i}`,
      auteur: randomAuthors(),
      description: `Description auto-générée pour le livre mock numéro ${i}.`,
      categorie: category._id,
      prix,
      fichierPDF: `mock/livres/livre-${i}.pdf`,
      couverture: `mock/couvertures/livre-${i}.jpg`,
      nombrePages: rand(80, 650),
      langue: pick(LANGUES),
      isbn,
      datePublication,
      actif: Math.random() > 0.05,
      noteMoyenne: Number((Math.random() * 5).toFixed(1)),
      createdAt: randomDateInPastDays(540),
      updatedAt: new Date(),
    });
  }

  return Livre.insertMany(livres);
};

const createMockCommandes = async (count, users, livres) => {
  const commandes = [];

  for (let i = 0; i < count; i += 1) {
    const client = pick(users);
    const statut = pick(STATUTS);
    const itemsCount = rand(1, 5);

    const usedLivreIds = new Set();
    const items = [];

    while (items.length < itemsCount) {
      const livre = pick(livres);
      const id = String(livre._id);
      if (usedLivreIds.has(id)) continue;
      usedLivreIds.add(id);

      items.push({
        livre: livre._id,
        prixAchat: livre.prix,
        titreLivre: livre.titre,
      });
    }

    const montantTotal = Number(
      items.reduce((sum, item) => sum + item.prixAchat, 0).toFixed(2),
    );

    const createdAt = randomDateInPastDays(365);

    commandes.push({
      client: client._id,
      livres: items,
      montantTotal,
      modePaiement: pick(MODE_PAIEMENT),
      transactionId: `tx_${Date.now()}_${i}_${rand(1000, 9999)}`,
      statut,
      dateCommande: createdAt,
      createdAt,
      updatedAt: createdAt,
    });
  }

  const inserted = await Commande.insertMany(commandes);

  const boughtByUser = new Map();
  for (const commande of inserted) {
    if (commande.statut !== "confirmée") continue;

    const key = String(commande.client);
    if (!boughtByUser.has(key)) boughtByUser.set(key, new Set());

    const set = boughtByUser.get(key);
    for (const line of commande.livres) {
      set.add(String(line.livre));
    }
  }

  const updates = [];
  for (const [userId, livreSet] of boughtByUser.entries()) {
    updates.push(
      User.updateOne(
        { _id: userId },
        { $set: { livresAchetes: Array.from(livreSet) } },
      ),
    );
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return inserted;
};

const resetCollections = async () => {
  await Promise.all([
    Commande.deleteMany({}),
    Livre.deleteMany({}),
    Categorie.deleteMany({}),
    User.deleteMany({ isAdmin: { $ne: true } }),
  ]);
};

const run = async () => {
  const livresCount = parseArg("--livres", 100);
  const usersCount = parseArg("--users", 60);
  const commandesCount = parseArg("--commandes", 250);
  const reset = hasFlag("--reset");

  if (livresCount <= 0 || usersCount <= 0 || commandesCount <= 0) {
    throw new Error(
      "Les valeurs --livres, --users et --commandes doivent être > 0",
    );
  }

  console.log("\nSeeding mock data...");
  console.log(
    `Options: livres=${livresCount}, users=${usersCount}, commandes=${commandesCount}, reset=${reset}`,
  );

  await connectDB();
  await ensureBaseAdmin();

  if (reset) {
    console.log("Reset des collections cible...");
    await resetCollections();
  }

  const categories = await createMockCategories();
  const users = await createMockUsers(usersCount);
  const livres = await createMockLivres(livresCount, categories);
  const commandes = await createMockCommandes(commandesCount, users, livres);

  const confirmed = commandes.filter((c) => c.statut === "confirmée").length;

  console.log("\nSeed terminé avec succès:");
  console.log(`- Catégories: ${categories.length}`);
  console.log(`- Users mock créés: ${users.length}`);
  console.log(`- Livres mock créés: ${livres.length}`);
  console.log(`- Commandes mock créées: ${commandes.length}`);
  console.log(`- Commandes confirmées: ${confirmed}`);
  console.log(
    "\nVous pouvez maintenant tester /api/stats/* avec un token admin.",
  );
};

run()
  .catch((error) => {
    console.error("Seed error:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch (_) {
      // ignore
    }
  });
