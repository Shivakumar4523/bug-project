import mongoose, { Schema, type InferSchemaType } from "mongoose";

const activityLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entity: { type: Schema.Types.ObjectId },
    entityType: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export type ActivityLogDocument = InferSchemaType<typeof activityLogSchema> & { _id: mongoose.Types.ObjectId };
export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
