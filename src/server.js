require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");

const config = require("./config/config");
const connectDB = require("./config/database");
const ensureBaseAdmin = require("./services/adminSeedService");

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categorieRoutes = require("./routes/categorieRoutes");
const statsRoutes = require("./routes/statsRoutes");

// Initialize app
const app = express();

const { initBuckets } = require("./config/minio");
initBuckets();

// ── Middleware ────────────────────────────────────────────────
app.options("/{*path}", cors());
app.use(
  cors({
    origin: "*",
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
  }),
);
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Request logger ────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length) console.log("Body:", req.body);
  next();
});

// ── Routes ────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categorieRoutes);
app.use("/api/livres", require("./routes/livreRoutes"));
app.use("/api/stats", statsRoutes);

// ── Health check ──────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "API is running" });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

// ── Start server ──────────────────────────────────────────────
const PORT = config.PORT;

const startServer = async () => {
  await connectDB();
  await ensureBaseAdmin();

  app.listen(PORT, () => {
    console.log(`\n✓ Server running at http://localhost:${PORT}`);
    console.log(`✓ Environment: ${config.NODE_ENV}\n`);
  });
};

startServer();

module.exports = app;
