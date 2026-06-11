import { connectDB } from "./config/db";
import { Transaction } from "./models/Transaction";
import { User } from "./models/User";

async function seed() {
  await connectDB();
  await Promise.all([User.deleteMany({}), Transaction.deleteMany({})]);

  const admin = await User.create({
    name: "System Admin",
    username: "admin",
    password: "Admin@123",
    role: "admin",
    initial_balance: 0,
    status: "active"
  });

  const users = await User.create([
    { name: "Ayesha Khan", username: "ayesha", password: "User@123", initial_balance: 25000 },
    { name: "Bilal Ahmed", username: "bilal", password: "User@123", initial_balance: 15000 },
    { name: "Sara Malik", username: "sara", password: "User@123", initial_balance: 30000 }
  ]);

  await Transaction.create([
    { userId: users[0]._id, amount: 12000, type: "IN", description: "Client payment", date: new Date() },
    { userId: users[0]._id, amount: 3500, type: "OUT", description: "Office supplies", date: new Date() },
    { userId: users[1]._id, amount: 8000, type: "IN", description: "Invoice received", date: new Date() },
    { userId: users[1]._id, amount: 1200, type: "OUT", description: "Courier charges", date: new Date() },
    { userId: users[2]._id, amount: 5000, type: "IN", description: "Bank deposit", date: new Date() },
    { userId: users[2]._id, amount: 2700, type: "OUT", description: "Maintenance", date: new Date() }
  ]);

  console.log(`Seed complete. Admin id: ${admin._id}`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
