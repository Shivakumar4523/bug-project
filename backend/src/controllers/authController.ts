import type { RequestHandler } from "express";
import { z } from "zod";
import { authService } from "../services/authService.js";
import { roles } from "../models/User.js";

export const schemas = {
  register: z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), role: z.enum(roles), department: z.string().optional() }),
  login: z.object({ email: z.string().email(), password: z.string().min(1) }),
  refresh: z.object({ refreshToken: z.string().min(10) }),
  forgot: z.object({ email: z.string().email() }),
  reset: z.object({ token: z.string().min(10), password: z.string().min(8) })
};

export const authController = {
  me: (async (req, res) => res.json(await authService.me(req.user!.id))) as RequestHandler,
  register: (async (req, res) => res.status(201).json(await authService.register(req.body))) as RequestHandler,
  login: (async (req, res) => res.json(await authService.login(req.body.email, req.body.password))) as RequestHandler,
  refresh: (async (req, res) => res.json(await authService.refresh(req.body.refreshToken))) as RequestHandler,
  forgot: (async (req, res) => {
    await authService.forgotPassword(req.body.email);
    res.json({ message: "If the email exists, a reset message was sent" });
  }) as RequestHandler,
  reset: (async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ message: "Password reset complete" });
  }) as RequestHandler
};
