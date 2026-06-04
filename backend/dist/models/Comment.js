import mongoose, { Schema } from "mongoose";
const commentSchema = new Schema({
    issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    attachments: [{ type: String }],
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });
export const Comment = mongoose.model("Comment", commentSchema);
