import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const issueTypes = ["Bug", "Task", "Story", "Improvement"] as const;
export const issuePriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const issueSeverities = ["MINOR", "MAJOR", "CRITICAL", "BLOCKER"] as const;
export const issueStatuses = ["OPEN", "BUG_BUCKET", "ASSIGNED", "IN_PROGRESS", "FIXED", "READY_FOR_TESTING", "REOPENED", "CLOSED"] as const;
export const issueCategories = ["UI Bug", "Backend Bug", "API Bug", "Database Bug", "Performance Bug", "Security Bug", "Mobile Bug", "Enhancement Request"] as const;

export const issueModulePages = ["Login Page", "Dashboard", "Reports", "User Management", "API", "Database", "Mobile UI", "Notifications", "Authentication", "Chat", "File Upload"] as const;

const issueSchema = new Schema(
  {
    issueNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: issueTypes, default: "Bug" },
    category: { type: String, enum: issueCategories, required: true },
    modulePage: { type: String, enum: issueModulePages, required: true, default: "Login Page" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    priority: { type: String, enum: issuePriorities, default: "MEDIUM" },
    severity: { type: String, enum: issueSeverities, default: "MAJOR" },
    status: { type: String, enum: issueStatuses, default: "OPEN" },
    labels: [{ type: String, trim: true }],
    attachments: [{ type: String }],
    dueDate: { type: Date },
    watchers: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export type IssueDocument = InferSchemaType<typeof issueSchema> & { _id: mongoose.Types.ObjectId };
export const Issue = mongoose.model("Issue", issueSchema);
