import SLAConfig from "../models/SLAConfig.js";

const DEFAULTS = {
  Critical: { responseMinutes: 15, resolutionMinutes: 60 },
  High: { responseMinutes: 60, resolutionMinutes: 240 },
  Medium: { responseMinutes: 480, resolutionMinutes: 1440 },
  Low: { responseMinutes: 1440, resolutionMinutes: 4320 },
};

export async function getSLAConfig(priority) {
  const cfg = await SLAConfig.findOne({ priority });
  if (cfg) return cfg;
  const d = DEFAULTS[priority] || DEFAULTS.Medium;
  return { priority, responseMinutes: d.responseMinutes, resolutionMinutes: d.resolutionMinutes, escalationEnabled: true };
}

export async function dueDateFor(priority) {
  const cfg = await getSLAConfig(priority);
  return new Date(Date.now() + cfg.resolutionMinutes * 60 * 1000);
}

export async function responseDueFor(priority) {
  const cfg = await getSLAConfig(priority);
  return new Date(Date.now() + cfg.responseMinutes * 60 * 1000);
}

export async function updateSLAStatus(complaint) {
  // Mutates complaint object/db; caller saves.
  if (["Resolved", "Closed"].includes(complaint.status)) {
    if (complaint.dueDate && new Date() <= complaint.dueDate) complaint.slaStatus = "Met";
    else if (complaint.slaStatus !== "Breached") complaint.slaStatus = "Met";
    return;
  }
  if (!complaint.dueDate) {
    complaint.slaStatus = "On Track";
    return;
  }
  const cfg = await getSLAConfig(complaint.priority);
  const configured = Number(cfg?.atRiskPercent);
  const atRiskPercent = Number.isFinite(configured) && configured > 0
    ? Math.min(100, configured)
    : 80;
  const now = Date.now();
  const due = new Date(complaint.dueDate).getTime();
  const created = complaint.createdAt ? new Date(complaint.createdAt).getTime() : now;
  const total = due - created;
  const elapsedPercent = total > 0 ? ((now - created) / total) * 100 : 0;
  if (now > due) complaint.slaStatus = "Breached";
  else if (total > 0 && elapsedPercent >= atRiskPercent) complaint.slaStatus = "At Risk";
  else complaint.slaStatus = "On Track";
}

export async function ensureDefaultSLA() {
  for (const [p, d] of Object.entries(DEFAULTS)) {
    const exists = await SLAConfig.findOne({ priority: p });
    if (!exists) {
      await SLAConfig.create({ priority: p, responseMinutes: d.responseMinutes, resolutionMinutes: d.resolutionMinutes, escalationEnabled: true, description: "Default demo SLA (calendar minutes)." });
    }
  }
}
