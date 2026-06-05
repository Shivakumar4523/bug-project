import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { userController } from "../controllers/userController.js";
import { excelUpload } from "../middleware/upload.js";

export const userRoutes = Router();
userRoutes.use(authenticate);
userRoutes.get("/", userController.list);
userRoutes.get("/me", userController.me);
userRoutes.put("/me/smtp", userController.updateOwnSmtp);
userRoutes.get("/:id", userController.get);
userRoutes.post("/", authorize("Admin"), userController.create);
userRoutes.post("/import", authorize("Admin"), excelUpload.single("file"), userController.importExcel);
userRoutes.put("/:id", authorize("Admin"), userController.update);
userRoutes.delete("/:id", authorize("Admin"), userController.remove);
