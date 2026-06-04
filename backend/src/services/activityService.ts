import { ActivityLog } from "../models/ActivityLog.js";

export async function logActivity(user: string | undefined, action: string, entityType: string, entity?: string, metadata?: unknown) {
  await ActivityLog.create({ user, action, entityType, entity, metadata });
}
