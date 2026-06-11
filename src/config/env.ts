import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error(
    "Missing MongoDB connection string. Set MONGO_URI or MONGODB_URI in environment.",
  );
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv,
  mongoUri,
  jwtSecret: process.env.JWT_SECRET || "development-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5174",
  clientOrigins: (
    process.env.CLIENT_ORIGINS ||
    process.env.CLIENT_ORIGIN ||
    "http://localhost:5174"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
