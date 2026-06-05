import { Router } from "express";
import { Notification } from "../models/Notification.js";
import { authenticate } from "../middleware/auth.js";

export const notificationRoutes = Router();
notificationRoutes.use(authenticate);
notificationRoutes.get("/", async (req, res) => {
  res.json(await Notification.find({ user: req.user!.id }).sort({ createdAt: -1 }).limit(5));
});
notificationRoutes.put("/:id/read", async (req, res) => {
  res.json(await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user!.id }, { read: true }, { new: true }));
});
