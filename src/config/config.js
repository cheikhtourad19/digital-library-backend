require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/digital-library",
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  JWT_EXPIRE: process.env.JWT_EXPIRE || "7d",
  BASE_ADMIN_NOM: process.env.BASE_ADMIN_NOM || "Base Admin",
  BASE_ADMIN_EMAIL: process.env.BASE_ADMIN_EMAIL || "admin@digital-library.com",
  BASE_ADMIN_PASSWORD: process.env.BASE_ADMIN_PASSWORD || "Admin@123456",
};
