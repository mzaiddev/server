import { Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { getUserBalance } from "../services/balanceService";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { signToken } from "../utils/tokens";

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(2).transform((value) => value.toLowerCase()),
    password: z.string().min(6),
    remember: z.boolean().optional()
  })
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ username: req.body.username }).select("+password");
  if (!user || !(await user.comparePassword(req.body.password))) {
    throw new AppError("Invalid username or password", 401);
  }
  if (user.status !== "active") throw new AppError("Account is inactive", 403);

  const token = signToken({ id: user._id, role: user.role });
  const balance = await getUserBalance(user._id);

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      status: user.status,
      initial_balance: user.initial_balance,
      balance
    }
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const balance = await getUserBalance(req.user._id);
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      username: req.user.username,
      role: req.user.role,
      status: req.user.status,
      initial_balance: req.user.initial_balance,
      balance
    }
  });
});
