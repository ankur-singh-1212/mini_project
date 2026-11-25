import Complaint from "../models/Complaint.js";
import SLAConfig from "../models/SLAConfig.js";
import { createNotification } from "./notificationService.js";
import { recordAudit } from "./auditService.js";

const EXCLUDED = ["Resolved", "Closed"];

export async function runEscalationPass(io) {
  const now = new Date();
  const candidates = await Complaint.find({
    dueDate: { $lt: now },
    status: { $nin: EXCLUDED },
    isEscalated: false,
  }).populate("assignedAgent reporter");

  let escalated = 0;
  for (const c of candidates) {
    // check sla config escalation enabled
    const cfg = await SLAConfig.findOne({ priority: c.priority });
    if (cfg && cfg.escalationEnabled === false) continue;

    // idempotency: atomically claim
    const claimed = await Complaint.findOneAndUpdate(
      { _id: c._id, isEscalated: false },
      {
        $set: { isEscalated: true, escalatedAt: now, slaStatus: "Breached" },
        $push: { escalationHistory: { level: 1, reason: "SLA deadline missed", scheduledJob: "escalation-cron", at: now } },
      },
      { new: true }
    );
    if (!claimed) continue; // already handled
    escalated++;

    const targets = new Set();
    if (c.assignedAgent?._id) targets.add(c.assignedAgent._id.toString());
    // admins
    const User = (await import("../models/User.js")).default;
    const admins = await User.find({ role: "admin", isActive: true }).select("_id");
    admins.forEach((a) => targets.add(a._id.toString()));

    for (const t of targets) {
      await createNotification({
        userId: t,
        type: "sla_breach",
        title: "SLA breached",
        message: `Complaint ${c.complaintId} has breached its SLA deadline.`,
        link: `/complaints/${c._id}`,
        complaintId: c._id,
        io,
      });
    }
    if (io) {
      io.to(`complaint:${c._id}`).emit("complaint:escalated", { id: c._id.toString(), complaintId: c.complaintId });
    }
    await recordAudit({ actor: null, action: "sla_escalation", entityType: "Complaint", entityId: c._id, details: { complaintId: c.complaintId } });
  }
  // also update slaStatus for all non-terminal
  await updateSlaStatuses();
  return { escalated };
}

async function updateSlaStatuses() {
  const list = await Complaint.find({ status: { $nin: EXCLUDED } }).select("_id createdAt dueDate status slaStatus");
  for (const c of list) {
    const { updateSLAStatus } = await import("./slaService.js");
    const doc = await Complaint.findById(c._id);
    await updateSLAStatus(doc);
    await doc.save();
  }
}
