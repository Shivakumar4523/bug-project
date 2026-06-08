import mongoose, { Schema, type InferSchemaType } from "mongoose";

const chatMessageSchema = new Schema(
  {
    scope: { type: String, enum: ["Direct", "Project"], required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User" },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    body: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

chatMessageSchema.index({ scope: 1, sender: 1, recipient: 1, createdAt: 1 });
chatMessageSchema.index({ scope: 1, project: 1, createdAt: 1 });

export type ChatMessageDocument = InferSchemaType<typeof chatMessageSchema> & { _id: mongoose.Types.ObjectId };
export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
