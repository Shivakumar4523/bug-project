import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./errorHandler.js";
import { roles, User, type UserRole } from "../models/User.js";

export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) throw new AppError(401, "Authentication required");

  try {
    const payload = jwt.verify(token, env.accessSecret) as Express.User;
    const user = await User.findById(payload.id).select("email name role disabled");
    if (!user || user.disabled) throw new AppError(401, "Invalid or disabled user");
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role as UserRole
    };
    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, "Invalid or expired access token");
  }
};

export function authorize(...allowed: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw new AppError(401, "Authentication required");
    if (!allowed.includes(req.user.role)) throw new AppError(403, "Insufficient permissions");
    next();
  };
}

export const allRoles = roles;
