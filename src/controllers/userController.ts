import { Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { enrichUsersWithBalances, getUserBalance } from "../services/balanceService";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

const numericQuery = z.preprocess((value) => (value === undefined ? undefined : Number(value)), z.number().optional());

export const userCreateSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    username: z.string().min(2).transform((value) => value.toLowerCase()),
    password: z.string().min(6),
    role: z.enum(["admin", "user"]).default("user"),
    initial_balance: z.number().default(0),
    status: z.enum(["active", "inactive"]).default("active")
  })
});

export const userUpdateSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    username: z.string().min(2).transform((value) => value.toLowerCase()).optional(),
    password: z.string().min(6).optional(),
    role: z.enum(["admin", "user"]).optional(),
    initial_balance: z.number().optional(),
    status: z.enum(["active", "inactive"]).optional()
  })
});

export const userListSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    page: numericQuery,
    limit: numericQuery,
    sort: z.string().optional()
  })
});

export const userStatusSchema = z.object({
  body: z.object({ status: z.enum(["active", "inactive"]) })
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.create(req.body);
  const [enriched] = await enrichUsersWithBalances([user]);
  res.status(201).json({ user: enriched });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);
  const sort = String(req.query.sort || "name");
  const query: Record<string, unknown> = {};

  if (req.query.status) query.status = req.query.status;
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { username: { $regex: req.query.search, $options: "i" } }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query).sort(sort).skip((page - 1) * limit).limit(limit),
    User.countDocuments(query)
  ]);

  res.json({ users: await enrichUsersWithBalances(users), page, limit, total, pages: Math.ceil(total / limit) });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  const [enriched] = await enrichUsersWithBalances([user]);
  res.json({ user: enriched });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select("+password");
  if (!user) throw new AppError("User not found", 404);
  Object.assign(user, req.body);
  await user.save();
  const fresh = await User.findById(user._id);
  const [enriched] = await enrichUsersWithBalances(fresh ? [fresh] : []);
  res.json({ user: enriched });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  if (String(req.user?._id) === req.params.id) throw new AppError("Admins cannot delete their own account", 400);
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  res.json({ message: "User deleted" });
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  if (String(req.user?._id) === req.params.id && req.body.status === "inactive") {
    throw new AppError("Admins cannot deactivate their own account", 400);
  }
  const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!user) throw new AppError("User not found", 404);
  const [enriched] = await enrichUsersWithBalances([user]);
  res.json({ user: enriched });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const user = await User.findById(req.user._id).select("+password");
  if (!user) throw new AppError("User not found", 404);
  const allowed = ["name", "password"] as const;
  allowed.forEach((key) => {
    if (req.body[key]) user[key] = req.body[key];
  });
  await user.save();
  res.json({ user: { id: user._id, name: user.name, username: user.username, role: user.role, balance: await getUserBalance(user._id) } });
});
