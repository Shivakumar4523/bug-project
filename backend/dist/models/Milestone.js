import mongoose, { Schema } from "mongoose";
const milestoneSchema = new Schema({
    name: { type: String, required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    dueDate: { type: Date },
    status: { type: String, enum: ["Planned", "Active", "Done"], default: "Planned" }
}, { timestamps: true });
export const Milestone = mongoose.model("Milestone", milestoneSchema);
