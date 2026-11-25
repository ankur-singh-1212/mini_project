import mongoose from "mongoose";
const auditSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: mongoose.Schema.Types.Mixed },
    ip: String,
  },
  { timestamps: true }
);
auditSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
export default mongoose.model("AuditLog", auditSchema);
