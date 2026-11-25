import Complaint from "../models/Complaint.js";
import Department from "../models/Department.js";
import User from "../models/User.js";
import { departmentNameForCategory } from "../config/categoryDepartment.js";

const OPEN_STATUSES = { $nin: ["Resolved", "Closed"] };

// Resolve the department configured for a category. Returns null when the
// department does not exist yet, so the complaint stays in the unassigned queue.
export async function resolveDepartment(category) {
  const name = departmentNameForCategory(category);
  if (!name) return null;
  return Department.findOne({ name }).lean();
}

// Pick an active agent in the department with the fewest open complaints.
// Ties break by name then id so the result is deterministic.
export async function pickLeastLoadedAgent(departmentId) {
  if (!departmentId) return null;
  const agents = await User.find({
    role: "agent",
    isActive: { $ne: false },
    department: departmentId,
  })
    .select("name")
    .sort({ name: 1, _id: 1 })
    .lean();
  if (agents.length === 0) return null;

  const counts = await Promise.all(
    agents.map((a) =>
      Complaint.countDocuments({ assignedAgent: a._id, status: OPEN_STATUSES })
    )
  );

  let bestIndex = 0;
  for (let i = 1; i < agents.length; i += 1) {
    if (counts[i] < counts[bestIndex]) bestIndex = i;
  }
  return { ...agents[bestIndex], openCount: counts[bestIndex] };
}
