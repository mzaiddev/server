import { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

const numericQuery = z.preprocess((value) => (value === undefined ? undefined : Number(value)), z.number().optional());

export const transactionCreateSchema = z.object({
  body: z.object({
    userId: z.string().optional(),
    amount: z.number().positive(),
    type: z.enum(["IN", "OUT"]),
    description: z.string().min(2),
    date: z.coerce.date().default(() => new Date())
  })
});

export const transactionUpdateSchema = z.object({
  body: z.object({
    userId: z.string().optional(),
    amount: z.number().positive().optional(),
    type: z.enum(["IN", "OUT"]).optional(),
    description: z.string().min(2).optional(),
    date: z.coerce.date().optional()
  })
});

export const transactionListSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    userId: z.string().optional(),
    type: z.enum(["IN", "OUT"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    minAmount: numericQuery,
    maxAmount: numericQuery,
    page: numericQuery,
    limit: numericQuery,
    sort: z.string().optional()
  })
});

function buildTransactionQuery(req: Request) {
  const query: Record<string, unknown> = {};
  if (req.user?.role !== "admin") query.userId = req.user?._id;
  if (req.user?.role === "admin" && req.query.userId) query.userId = new Types.ObjectId(String(req.query.userId));
  if (req.query.type) query.type = req.query.type;
  if (req.query.startDate || req.query.endDate) {
    query.date = {
      ...(req.query.startDate ? { $gte: new Date(String(req.query.startDate)) } : {}),
      ...(req.query.endDate ? { $lte: new Date(String(req.query.endDate)) } : {})
    };
  }
  if (req.query.minAmount || req.query.maxAmount) {
    query.amount = {
      ...(req.query.minAmount ? { $gte: Number(req.query.minAmount) } : {}),
      ...(req.query.maxAmount ? { $lte: Number(req.query.maxAmount) } : {})
    };
  }
  return query;
}

export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.role === "admin" && req.body.userId ? req.body.userId : req.user?._id;
  const user = await User.findById(userId);
  if (!user || user.status !== "active") throw new AppError("Target user not found or inactive", 400);

  const transaction = await Transaction.create({ ...req.body, userId });
  await transaction.populate("userId", "name username");
  res.status(201).json({ transaction });
});

export const listTransactions = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);
  const sort = String(req.query.sort || "-date");
  let query = buildTransactionQuery(req);
  const search = String(req.query.search || "");

  if (search) {
    const matchingUsers = await User.find({
      $or: [{ name: { $regex: search, $options: "i" } }, { username: { $regex: search, $options: "i" } }]
    })
      .select("_id")
      .limit(50);
    const searchClauses: Record<string, unknown>[] = [
      { description: { $regex: search, $options: "i" } },
      { userId: { $in: matchingUsers.map((user) => user._id) } }
    ];
    if (Types.ObjectId.isValid(search)) searchClauses.push({ _id: new Types.ObjectId(search) });
    query = { $and: [query, { $or: searchClauses }] };
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(query).populate("userId", "name username").sort(sort).skip((page - 1) * limit).limit(limit),
    Transaction.countDocuments(query)
  ]);

  res.json({ transactions, page, limit, total, pages: Math.ceil(total / limit) });
});

export const getTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await Transaction.findById(req.params.id).populate("userId", "name username");
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (req.user?.role !== "admin" && String(transaction.userId._id) !== String(req.user?._id)) {
    throw new AppError("Access denied", 403);
  }
  res.json({ transaction });
});

export const updateTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(
    "userId",
    "name username"
  );
  if (!transaction) throw new AppError("Transaction not found", 404);
  res.json({ transaction });
});

export const deleteTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await Transaction.findByIdAndDelete(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);
  res.json({ message: "Transaction deleted" });
});
