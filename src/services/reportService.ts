import { Types } from "mongoose";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";
import { getTotalsByUser, getUserBalance } from "./balanceService";

function monthRange(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export async function monthlyReport(options: { month: number; year: number; userId?: string }) {
  const { start, end } = monthRange(options.month, options.year);
  const users = await User.find(options.userId ? { _id: options.userId } : {}).sort({ name: 1 });

  const reports = await Promise.all(
    users.map(async (user) => {
      const userId = user._id;
      const [beforeTotals, periodTotals] = await Promise.all([
        getTotalsByUser({ userId, date: { $lt: start } }),
        getTotalsByUser({ userId, date: { $gte: start, $lt: end } })
      ]);
      const before = beforeTotals.get(String(userId)) ?? { totalIn: 0, totalOut: 0 };
      const period = periodTotals.get(String(userId)) ?? { totalIn: 0, totalOut: 0 };
      const openingBalance = user.initial_balance + before.totalIn - before.totalOut;
      const closingBalance = openingBalance + period.totalIn - period.totalOut;

      return {
        userId: String(userId),
        name: user.name,
        username: user.username,
        openingBalance,
        totalIn: period.totalIn,
        totalOut: period.totalOut,
        closingBalance
      };
    })
  );

  return { month: options.month, year: options.year, reports };
}

export async function dashboardReport(options: { role: "admin" | "user"; userId: string }) {
  const isAdmin = options.role === "admin";
  const userFilter = isAdmin ? {} : { _id: options.userId };
  const txFilter = isAdmin ? {} : { userId: new Types.ObjectId(options.userId) };
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [users, totalUsers, activeUsers, totals, monthly, recentTransactions] = await Promise.all([
    User.find(userFilter).sort({ name: 1 }),
    User.countDocuments(userFilter),
    User.countDocuments({ ...userFilter, status: "active" }),
    getTotalsByUser(txFilter),
    Transaction.aggregate([
      { $match: { ...txFilter, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" }, type: "$type" },
          amount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    Transaction.find(txFilter).populate("userId", "name username").sort({ date: -1 }).limit(8)
  ]);

  let totalIn = 0;
  let totalOut = 0;
  let totalInitial = 0;
  users.forEach((user) => {
    const row = totals.get(String(user._id)) ?? { totalIn: 0, totalOut: 0 };
    totalIn += row.totalIn;
    totalOut += row.totalOut;
    totalInitial += user.initial_balance;
  });

  const monthlyMap = new Map<string, { month: string; IN: number; OUT: number; count: number }>();
  monthly.forEach((row) => {
    const key = `${row._id.year}-${String(row._id.month).padStart(2, "0")}`;
    const current = monthlyMap.get(key) ?? { month: key, IN: 0, OUT: 0, count: 0 };
    current[row._id.type as "IN" | "OUT"] = row.amount;
    current.count += row.count;
    monthlyMap.set(key, current);
  });

  const topUsers = users
    .map((user) => {
      const row = totals.get(String(user._id)) ?? { totalIn: 0, totalOut: 0 };
      return {
        id: String(user._id),
        name: user.name,
        username: user.username,
        balance: user.initial_balance + row.totalIn - row.totalOut
      };
    })
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  const ownBalance = isAdmin ? null : await getUserBalance(options.userId);

  return {
    totalUsers,
    activeUsers,
    totalBalance: totalInitial + totalIn - totalOut,
    totalIn,
    totalOut,
    balance: ownBalance,
    monthly: Array.from(monthlyMap.values()),
    balanceTrend: Array.from(monthlyMap.values()).reduce<Array<{ month: string; balance: number }>>((rows, item) => {
      const previous = rows.at(-1)?.balance ?? totalInitial;
      rows.push({ month: item.month, balance: previous + item.IN - item.OUT });
      return rows;
    }, []),
    topUsers,
    recentTransactions
  };
}
