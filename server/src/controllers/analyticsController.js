import Complaint from "../models/Complaint.js";
import User from "../models/User.js";
import Department from "../models/Department.js";

export const analytics = async (req, res) => {
  const { from, to } = req.query;
  const match = {};
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }
  const total = await Complaint.countDocuments(match);
  const byStatus = await Complaint.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
  const byCategory = await Complaint.aggregate([{ $match: match }, { $group: { _id: "$category", count: { $sum: 1 } } }]);
  const byPriority = await Complaint.aggregate([{ $match: match }, { $group: { _id: "$priority", count: { $sum: 1 } } }]);
  const overdue = await Complaint.countDocuments({ ...match, dueDate: { $lt: new Date() }, status: { $nin: ["Resolved", "Closed"] } });

  // Resolution timing. Ignore invalid (missing/negative) durations so a bad
  // record can never drag the average below zero.
  const resolvedDocs = await Complaint.find({ ...match, status: { $in: ["Resolved", "Closed"] } }).select("createdAt resolvedAt dueDate");
  const resolved = resolvedDocs.length;
  const durations = [];
  let resolvedOnTime = 0;
  for (const c of resolvedDocs) {
    if (c.resolvedAt && c.createdAt) {
      const ms = new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime();
      if (Number.isFinite(ms) && ms > 0) durations.push(ms);
    }
    if (c.resolvedAt && c.dueDate && new Date(c.resolvedAt).getTime() <= new Date(c.dueDate).getTime()) {
      resolvedOnTime += 1;
    }
  }
  const avgMs = durations.length
    ? durations.reduce((s, ms) => s + ms, 0) / durations.length
    : 0;
  const avgResolutionHours = Math.round((avgMs / 3600000) * 10) / 10;

  // monthly volume last 6
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthly = await Complaint.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    { $group: { _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { "_id.y": 1, "_id.m": 1 } },
  ]);

  // agent workload
  const workload = await Complaint.aggregate([
    { $match: { assignedAgent: { $ne: null }, status: { $nin: ["Resolved", "Closed"] } } },
    { $group: { _id: "$assignedAgent", count: { $sum: 1 } } },
  ]);
  const agentIds = workload.map((w) => w._id);
  const agents = await User.find({ _id: { $in: agentIds } }).select("name");
  const agentMap = Object.fromEntries(agents.map((a) => [a._id.toString(), a.name]));
  const agentWorkload = workload.map((w) => ({ agent: agentMap[w._id.toString()] || "Unknown", count: w.count }));

  // department workload
  const deptWorkload = await Complaint.aggregate([
    { $match: { department: { $ne: null } } },
    { $group: { _id: "$department", count: { $sum: 1 } } },
  ]);
  const deptIds = deptWorkload.map((d) => d._id);
  const depts = await Department.find({ _id: { $in: deptIds } }).select("name");
  const deptMap = Object.fromEntries(depts.map((d) => [d._id.toString(), d.name]));
  const departmentWorkload = deptWorkload.map((d) => ({ department: deptMap[d._id.toString()] || "Unknown", count: d.count }));

  const slaCompliance = total > 0 ? Math.round((resolved / Math.max(total, 1)) * 100) : 100;

  res.json({
    success: true,
    data: {
      total,
      resolved,
      overdue,
      avgResolutionHours,
      slaCompliance,
      byStatus: byStatus.map((b) => ({ status: b._id, count: b.count })),
      byCategory: byCategory.map((b) => ({ category: b._id, count: b.count })),
      byPriority: byPriority.map((b) => ({ priority: b._id, count: b.count })),
      monthly: monthly.map((m) => ({ month: `${m._id.y}-${String(m._id.m).padStart(2, "0")}`, count: m.count })),
      agentWorkload,
      departmentWorkload,
    },
  });
};
