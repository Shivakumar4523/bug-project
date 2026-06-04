import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import { readSheet } from "read-excel-file/node";
import { env } from "../config/env.js";
import { roles, User, type UserRole } from "../models/User.js";
import { AppError } from "../middleware/errorHandler.js";
import { logActivity } from "../services/activityService.js";

type UserImportRow = {
  row: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  disabled: boolean;
};

type ImportError = {
  row: number;
  email?: string;
  message: string;
};

function sanitize(user: any) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    profileImage: user.profileImage,
    disabled: user.disabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function stringifyCell(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "").trim();
}

function cell(row: Record<string, string>, aliases: string[]) {
  const normalizedAliases = new Set(aliases.map(normalizeKey));
  const entry = Object.entries(row).find(([key]) => normalizedAliases.has(normalizeKey(key)));
  return entry ? entry[1] : "";
}

function parseRole(value: string): UserRole | null {
  if (!value) return "Developer";
  const normalized = normalizeKey(value);
  const match = roles.find((role) => normalizeKey(role) === normalized);
  if (match) return match;
  if (normalized === "dev") return "Developer";
  if (normalized === "qa" || normalized === "test") return "Tester";
  return null;
}

function parseBoolean(value: string) {
  return ["true", "yes", "y", "1", "disabled", "inactive"].includes(value.toLowerCase());
}

async function parseUserRows(file: Express.Multer.File) {
  const worksheet = await readSheet(file.buffer);
  if (worksheet.length < 2) throw new AppError(400, "Excel file does not contain user rows");

  const headers = worksheet[0].map(stringifyCell);
  const rows = worksheet.slice(1);

  const parsed: UserImportRow[] = [];
  const errors: ImportError[] = [];

  rows.forEach((values, index) => {
    const rowNumber = index + 2;
    const row = headers.reduce<Record<string, string>>((record, header, headerIndex) => {
      if (header) record[header] = stringifyCell(values[headerIndex]);
      return record;
    }, {});
    if (Object.values(row).every((value) => !value)) return;

    const name = cell(row, ["name", "full name", "user name"]);
    const email = cell(row, ["email", "email address"]).toLowerCase();
    const password = cell(row, ["password", "temporary password", "temp password"]) || env.adminPassword;
    const department = cell(row, ["department", "dept"]);
    const role = parseRole(cell(row, ["role", "user role"]));
    const disabled = parseBoolean(cell(row, ["disabled", "inactive"]));

    if (!name) {
      errors.push({ row: rowNumber, email, message: "Name is required" });
      return;
    }
    if (!email) {
      errors.push({ row: rowNumber, message: "Email is required" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNumber, email, message: "Email is invalid" });
      return;
    }
    if (!role) {
      errors.push({ row: rowNumber, email, message: "Role must be Admin, Developer, or Tester" });
      return;
    }

    parsed.push({ row: rowNumber, name, email, password, role, department, disabled });
  });

  if (!parsed.length && !errors.length) throw new AppError(400, "Excel file does not contain user rows");

  return { parsed, errors };
}

export const userController = {
  list: (async (_req, res) => {
    const users = await User.find().sort({ name: 1 });
    res.json(users.map(sanitize));
  }) as RequestHandler,
  get: (async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError(404, "User not found");
    res.json(sanitize(user));
  }) as RequestHandler,
  create: (async (req, res) => {
    const { password = env.adminPassword, ...data } = req.body;
    const user = await User.create({ ...data, passwordHash: await bcrypt.hash(password, 12) });
    await logActivity(req.user?.id, "User Created", "User", user._id.toString());
    res.status(201).json(sanitize(user));
  }) as RequestHandler,
  importExcel: (async (req, res) => {
    if (!req.file) throw new AppError(400, "Excel file is required");

    const { parsed, errors } = await parseUserRows(req.file);
    const existingEmails = new Set(await User.find({ email: { $in: parsed.map((row) => row.email) } }).distinct("email"));
    const importedUsers = [];

    for (const row of parsed) {
      if (existingEmails.has(row.email)) {
        errors.push({ row: row.row, email: row.email, message: "Email already exists" });
        continue;
      }

      try {
        const user = await User.create({
          name: row.name,
          email: row.email,
          passwordHash: await bcrypt.hash(row.password, 12),
          role: row.role,
          department: row.department,
          disabled: row.disabled
        });
        existingEmails.add(row.email);
        importedUsers.push(sanitize(user));
      } catch (error) {
        errors.push({ row: row.row, email: row.email, message: error instanceof Error ? error.message : "User import failed" });
      }
    }

    if (importedUsers.length) {
      await logActivity(req.user?.id, "Users Imported", "User", undefined, { created: importedUsers.length, skipped: errors.length });
    }

    res.status(importedUsers.length ? 201 : 200).json({
      created: importedUsers.length,
      skipped: errors.length,
      errors,
      users: importedUsers
    });
  }) as RequestHandler,
  update: (async (req, res) => {
    const { password, ...data } = req.body;
    const update = password ? { ...data, passwordHash: await bcrypt.hash(password, 12) } : data;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!user) throw new AppError(404, "User not found");
    await logActivity(req.user?.id, password ? "Password Reset" : "User Updated", "User", user._id.toString());
    res.json(sanitize(user));
  }) as RequestHandler,
  remove: (async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    await logActivity(req.user?.id, "User Deleted", "User", String(req.params.id));
    res.status(204).send();
  }) as RequestHandler
};
