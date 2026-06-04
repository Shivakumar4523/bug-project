import mongoose, { Schema, type InferSchemaType } from "mongoose";

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    lead: { type: Schema.Types.ObjectId, ref: "User" },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export type TeamDocument = InferSchemaType<typeof teamSchema> & { _id: mongoose.Types.ObjectId };
export const Team = mongoose.model("Team", teamSchema);
