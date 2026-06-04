import { Router } from "express";
import { reportController } from "../controllers/reportController.js";
import { authenticate, authorize } from "../middleware/auth.js";

export const reportRoutes = Router();
reportRoutes.use(authenticate);
reportRoutes.use(authorize("Admin"));
reportRoutes.get("/dashboard", reportController.dashboard);
reportRoutes.get("/", reportController.reports);
