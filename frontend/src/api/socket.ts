import { io, type Socket } from "socket.io-client";
import { getToken } from "./client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? window.location.origin;
let socket: Socket | null = null;

export function connectSocket() {
  const token = getToken();
  if (!token) return null;
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
