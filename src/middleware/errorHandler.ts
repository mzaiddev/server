import { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = env.nodeEnv === "production";

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid resource id" });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: "Duplicate value already exists" });
  }

  res.status(statusCode).json({
    message: err.message || "Internal server error",
    ...(isProduction ? {} : { stack: err.stack })
  });
};
