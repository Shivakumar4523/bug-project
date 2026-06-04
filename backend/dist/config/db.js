import mongoose from "mongoose";
import { env } from "./env.js";
let memoryServer;
function canUseMemoryFallback(error) {
    const isProduction = process.env.NODE_ENV === "production";
    const isLocalMongo = env.mongoUri.includes("localhost") || env.mongoUri.includes("127.0.0.1");
    return !isProduction && isLocalMongo && error instanceof Error;
}
export async function connectDb() {
    mongoose.set("strictQuery", true);
    try {
        await mongoose.connect(env.mongoUri);
        console.log("MongoDB connected");
    }
    catch (error) {
        if (!canUseMemoryFallback(error))
            throw error;
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        memoryServer = await MongoMemoryServer.create();
        await mongoose.connect(memoryServer.getUri());
        console.warn("Local MongoDB unavailable; using in-memory MongoDB for this dev session");
    }
}
