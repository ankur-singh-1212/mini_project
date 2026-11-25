import Complaint from "../models/Complaint.js";

// Only administrators may inspect complainant identity.
function maySeeReporter(user) {
  return user.role === "admin" || user.role === "user";
}

export const listEscalations = async (req, res) => {
  let query = Complaint.find({ isEscalated: true }).populate("assignedAgent", "name");
  if (maySeeReporter(req.user)) query = query.populate("reporter", "name email");
  query = query.populate("department", "name");
  const items = await query.sort({ escalatedAt: -1 }).limit(100).lean();
  res.json({ success: true, data: items });
};
