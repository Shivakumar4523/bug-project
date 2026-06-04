import mongoose, { Schema } from "mongoose";

const namedSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    color: { type: String, default: "#1976d2" },
    description: { type: String, default: "" }
  },
  { timestamps: true }
);

const emailTemplateSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    body: { type: String, required: true }
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", namedSchema);
export const Priority = mongoose.model("Priority", namedSchema);
export const Status = mongoose.model("Status", namedSchema);
export const EmailTemplate = mongoose.model("EmailTemplate", emailTemplateSchema);
