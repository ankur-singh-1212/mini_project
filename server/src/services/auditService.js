import AuditLog from "../models/AuditLog.js";

export async function recordAudit({ actor, action, entityType, entityId, details, ip }) {
  try {
    await AuditLog.create({ actor, action, entityType, entityId, details, ip });
  } catch (e) {
    console.error("[audit] failed", e.message);
  }
}
