import { FilterQuery, Types } from "mongoose";
import { ITransaction, Transaction } from "../models/Transaction";
import { IUser, User } from "../models/User";

export type BalanceSummary = {
  initialBalance: number;
  totalIn: number;
  totalOut: number;
  currentBalance: number;
};

export async function getTotalsByUser(match: FilterQuery<ITransaction> = {}) {
  const rows = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$userId",
        totalIn: { $sum: { $cond: [{ $eq: ["$type", "IN"] }, "$amount", 0] } },
        totalOut: { $sum: { $cond: [{ $eq: ["$type", "OUT"] }, "$amount", 0] } }
      }
    }
  ]);

  return new Map<string, { totalIn: number; totalOut: number }>(
    rows.map((row) => [String(row._id), { totalIn: row.totalIn, totalOut: row.totalOut }])
  );
}

export async function getUserBalance(userId: string | Types.ObjectId): Promise<BalanceSummary> {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const totals = await getTotalsByUser({ userId: new Types.ObjectId(String(userId)) });
  const row = totals.get(String(userId)) ?? { totalIn: 0, totalOut: 0 };
  const initialBalance = user.initial_balance;

  return {
    initialBalance,
    totalIn: row.totalIn,
    totalOut: row.totalOut,
    currentBalance: initialBalance + row.totalIn - row.totalOut
  };
}

export async function enrichUsersWithBalances(users: IUser[]) {
  const totals = await getTotalsByUser({ userId: { $in: users.map((user) => user._id) } });
  return users.map((user) => {
    const row = totals.get(String(user._id)) ?? { totalIn: 0, totalOut: 0 };
    return {
      id: String(user._id),
      name: user.name,
      username: user.username,
      role: user.role,
      initial_balance: user.initial_balance,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      totalIn: row.totalIn,
      totalOut: row.totalOut,
      currentBalance: user.initial_balance + row.totalIn - row.totalOut
    };
  });
}
