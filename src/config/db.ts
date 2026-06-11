import mongoose from "mongoose";
import { env } from "./env";

mongoose.set("strictQuery", false);
mongoose.set("bufferCommands", false);

let connectionPromise: Promise<typeof mongoose> | null = null;
let listenersAttached = false;

function attachConnectionListeners() {
  if (listenersAttached) return;

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error);
  });

  mongoose.connection.on("disconnected", () => {
    connectionPromise = null;
  });

  listenersAttached = true;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (mongoose.connection.readyState === 2 && connectionPromise) {
    return connectionPromise;
  }

  attachConnectionListeners();

  connectionPromise = mongoose
    .connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: env.nodeEnv === "production" ? 5 : 10
    })
    .then((connection) => {
      console.log(`MongoDB connected: ${connection.connection.name}`);
      return connection;
    })
    .catch((error) => {
      connectionPromise = null;
      console.error("MongoDB connection failed:", error.message);
      throw error;
    });

  return connectionPromise;
}
