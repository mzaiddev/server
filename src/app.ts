import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { ensureDatabaseConnection } from "./middleware/database";
import authRoutes from "./routes/authRoutes";
import reportRoutes from "./routes/reportRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import userRoutes from "./routes/userRoutes";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

if (env.nodeEnv === "production" || process.env.VERCEL === "1") {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const localDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(
        origin,
      );
      if (
        env.clientOrigins.includes(origin) ||
        (env.nodeEnv !== "production" && localDevOrigin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/", (_req, res) => res.json({ name: "LedgerPro API", status: "ok" }));
app.get(["/favicon.ico", "/favicon.png"], (_req, res) => res.status(204).end());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", ensureDatabaseConnection);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reports", reportRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
