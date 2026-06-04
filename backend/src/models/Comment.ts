import mongoose, { Schema, type InferSchemaType } from "mongoose";

const commentSchema = new Schema(
  {
    issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    attachments: [{ type: String }],
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export type CommentDocument = InferSchemaType<typeof commentSchema> & { _id: mongoose.Types.ObjectId };
export const Comment = mongoose.model("Comment", commentSchema);
