import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env.js";

let io: Server | undefined;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: env.clientUrl, credentials: true }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token || typeof token !== "string") return next(new Error("Authentication required"));
    try {
      socket.data.user = jwt.verify(token, env.accessSecret) as Express.User;
      next();
    } catch {
      next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.user.id}`);
  });

  return io;
}

export function emitNotification(userId: string, notification: unknown) {
  io?.to(`user:${userId}`).emit("notification:new", notification);
}
