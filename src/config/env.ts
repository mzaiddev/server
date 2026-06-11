import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri:
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ledger_management",
  jwtSecret: process.env.JWT_SECRET || "development-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5174",
  clientOrigins: (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "http://localhost:5174")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
