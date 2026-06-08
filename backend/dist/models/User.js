import mongoose, { Schema } from "mongoose";
export const roles = ["Admin", "Developer", "Tester"];
const userSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: roles, required: true },
    department: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    smtp: {
        enabled: { type: Boolean, default: false },
        host: { type: String, default: "", trim: true },
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        user: { type: String, default: "", trim: true },
        passEncrypted: { type: String, default: "" },
        fromName: { type: String, default: "", trim: true }
    },
    refreshTokenHash: { type: String, default: "" },
    resetTokenHash: { type: String, default: "" },
    resetTokenExpiresAt: { type: Date }
}, { timestamps: true });
export const User = mongoose.model("User", userSchema);
