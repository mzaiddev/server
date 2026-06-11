import mongoose from "mongoose";
import { env } from "./env";

mongoose.set("strictQuery", false);

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    console.log("MongoDB already connected", env.mongoUri);
    return;
  }

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error);
  });

  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
