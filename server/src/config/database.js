import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let memoryServer = null;

export async function connectDatabase(uri) {
  const mongoUri = uri || process.env.MONGO_URI;
  if (mongoUri) {
    await mongoose.connect(mongoUri, { autoIndex: true });
    return mongoose.connection;
  }
  // Development/test convenience: in-memory MongoDB when no URI is configured.
  if (process.env.NODE_ENV !== "production") {
    memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    await mongoose.connect(memUri, { autoIndex: true });
    console.warn("[db] No MONGO_URI configured. Using in-memory MongoDB (dev only, data is not persistent).");
    return mongoose.connection;
  }
  throw new Error("MONGO_URI is required in production.");
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function isMemoryDb() {
  return !!memoryServer;
}
