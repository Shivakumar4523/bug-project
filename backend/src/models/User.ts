import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const roles = ["Admin", "Developer", "Tester"] as const;
export type UserRole = (typeof roles)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: roles, required: true },
    department: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    refreshTokenHash: { type: String, default: "" },
    resetTokenHash: { type: String, default: "" },
    resetTokenExpiresAt: { type: Date },

    // User SMTP Settings
    smtpEnabled: { type: Boolean, default: false },
    smtpHost: { type: String, default: "" },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: "" },
    smtpPass: { type: String, default: "" }
    },
    { timestamps: true }
    );

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.model("User", userSchema);
