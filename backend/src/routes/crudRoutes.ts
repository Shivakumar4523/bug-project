import { Router } from "express";
import type { Model } from "mongoose";
import { crudController } from "../controllers/crudController.js";
import { authenticate, authorize } from "../middleware/auth.js";

export function crudRoutes<T>(model: Model<T>, entityType: string) {
  const router = Router();
  const c = crudController(model, entityType);
  router.use(authenticate);
  router.get("/", c.list);
  router.get("/:id", c.get);
  router.post("/", authorize("Admin"), c.create);
  router.put("/:id", authorize("Admin"), c.update);
  router.delete("/:id", authorize("Admin"), c.remove);
  return router;
}
