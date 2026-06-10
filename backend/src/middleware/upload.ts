import path from "node:path";
import multer from "multer";
import { AppError } from "./errorHandler.js";

const allowed = new Set([".png", ".jpg", ".jpeg", ".pdf", ".docx", ".zip", ".xlsx"]);
const excelAllowed = new Set([".xlsx"]);

const storage = multer.diskStorage({
  destination: "uploads",
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeBase}`);
  }
});

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb((allowed.has(ext) ? null : new AppError(400, "Unsupported file type")) as any, allowed.has(ext));
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

export const excelUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb((excelAllowed.has(ext) ? null : new AppError(400, "Please upload an .xlsx Excel file")) as any, excelAllowed.has(ext));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});
