import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User, UserRole } from "../models/User";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

type TokenPayload = {
  id: string;
  role: UserRole;
};

export const protect = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : undefined;
  if (!token) throw new AppError("Authentication required", 401);

  const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
  const user = await User.findById(decoded.id);
  if (!user || user.status !== "active") throw new AppError("User is not authorized", 401);

  req.user = user;
  next();
});

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
}
