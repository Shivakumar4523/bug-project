import { ActivityLog } from "../models/ActivityLog.js";
export async function logActivity(user, action, entityType, entity, metadata) {
    await ActivityLog.create({ user, action, entityType, entity, metadata });
}
