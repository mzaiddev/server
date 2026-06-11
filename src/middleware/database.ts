import { NextFunction, Request, Response } from "express";
import { connectDB } from "../config/db";
import { AppError } from "../utils/AppError";

export async function ensureDatabaseConnection(_req: Request, _res: Response, next: NextFunction) {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection unavailable:", error);
    next(
      new AppError(
        "Database connection unavailable. Check MONGO_URI/MONGODB_URI and MongoDB network access.",
        503
      )
    );
  }
}
