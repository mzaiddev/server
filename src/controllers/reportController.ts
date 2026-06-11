import { Request, Response } from "express";
import { z } from "zod";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";
import { enrichUsersWithBalances } from "../services/balanceService";
import { sendExcel, sendPdf } from "../services/exportService";
import { dashboardReport, monthlyReport } from "../services/reportService";
import { asyncHandler } from "../utils/asyncHandler";

const numberQuery = z.preprocess((value) => (value === undefined ? undefined : Number(value)), z.number().optional());

export const monthlyReportSchema = z.object({
  query: z.object({
    month: numberQuery,
    year: numberQuery,
    userId: z.string().optional()
  })
});

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardReport({ role: req.user!.role, userId: String(req.user!._id) });
  res.json(data);
});

export const monthly = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const month = Number(req.query.month || now.getMonth() + 1);
  const year = Number(req.query.year || now.getFullYear());
  const userId = req.user!.role === "admin" ? (req.query.userId as string | undefined) : String(req.user!._id);
  res.json(await monthlyReport({ month, year, userId }));
});

export const globalSearch = asyncHandler(async (req: Request, res: Response) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ users: [], transactions: [] });

  const userQuery = {
    $or: [{ name: { $regex: q, $options: "i" } }, { username: { $regex: q, $options: "i" } }]
  };
  const users = req.user!.role === "admin" ? await User.find(userQuery).limit(5) : [];

  const transactionQuery: Record<string, unknown> = {
    ...(req.user!.role === "admin" ? {} : { userId: req.user!._id }),
    $or: [{ description: { $regex: q, $options: "i" } }]
  };
  const transactions = await Transaction.find(transactionQuery).populate("userId", "name username").sort({ date: -1 }).limit(8);

  res.json({ users, transactions });
});

export const exportData = asyncHandler(async (req: Request, res: Response) => {
  const type = String(req.query.type || "transactions");
  const format = String(req.query.format || "excel");
  const month = Number(req.query.month || new Date().getMonth() + 1);
  const year = Number(req.query.year || new Date().getFullYear());
  let rows: Record<string, unknown>[] = [];

  if (type === "users" && req.user!.role === "admin") {
    rows = await enrichUsersWithBalances(await User.find().sort({ name: 1 }));
  } else if (type === "reports") {
    const report = await monthlyReport({ month, year, userId: req.user!.role === "admin" ? (req.query.userId as string) : String(req.user!._id) });
    rows = report.reports;
  } else {
    const query = req.user!.role === "admin" ? {} : { userId: req.user!._id };
    rows = (await Transaction.find(query).populate("userId", "name username").sort({ date: -1 }).lean()).map((tx) => ({
      id: String(tx._id),
      user: (tx.userId as unknown as { name?: string })?.name,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      date: tx.date
    }));
  }

  if (format === "pdf") return sendPdf(res, `${type} export`, rows);
  return sendExcel(res, `${type}-export`, rows);
});
