import User from "../models/User.js";
import Department from "../models/Department.js";
import Complaint from "../models/Complaint.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import SLAConfig from "../models/SLAConfig.js";
import { ensureDefaultSLA, dueDateFor } from "./slaService.js";
import bcrypt from "bcryptjs";

const PASSWORD = "Password123!";

export async function seedAll({ force = false } = {}) {
  await ensureDefaultSLA();
  const userCount = await User.countDocuments();
  if (!force && userCount > 0) return { skipped: true };

  if (force) {
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Complaint.deleteMany({}),
      Comment.deleteMany({}),
      Notification.deleteMany({}),
    ]);
  }

  const depts = await Department.insertMany([
    { name: "IT Support", description: "Technical and software issues" },
    { name: "Facilities", description: "Buildings and infrastructure" },
    { name: "Electrical", description: "Electrical systems and safety" },
    { name: "Administration", description: "Academic and administrative" },
  ]);
  const deptMap = Object.fromEntries(depts.map((d) => [d.name, d]));

  const hash = await bcrypt.hash(PASSWORD, 10);
  const admin = await User.create({ name: "Demo Admin", email: "admin@nexaresolve.dev", password: hash, role: "admin" });
  const agent1 = await User.create({ name: "Asha Agent", email: "agent1@nexaresolve.dev", password: hash, role: "agent", department: deptMap["IT Support"]._id });
  const agent2 = await User.create({ name: "Ravi Agent", email: "agent2@nexaresolve.dev", password: hash, role: "agent", department: deptMap["Facilities"]._id });
  const users = await User.insertMany([
    { name: "Priya User", email: "user1@nexaresolve.dev", password: hash, role: "user" },
    { name: "Arjun User", email: "user2@nexaresolve.dev", password: hash, role: "user" },
    { name: "Meera User", email: "user3@nexaresolve.dev", password: hash, role: "user" },
  ]);

  const Counter = (await import("../models/Counter.js")).default;
  await Counter.deleteMany({});

  const makeComplaint = async ({ title, description, category, priority, reporter, status, assignedAgent, department, dueOffsetMinutes, resolved, resolvedDaysAgo = 1, resolutionHours = 6 }) => {
    const year = new Date().getFullYear();
    const c = await Counter.findOneAndUpdate({ name: `complaint-${year}` }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    const complaintId = `NX-${year}-${String(c.seq).padStart(4, "0")}`;
    const dueDate = dueOffsetMinutes !== undefined ? new Date(Date.now() + dueOffsetMinutes * 60 * 1000) : await dueDateFor(priority);
    // Resolved complaints must have been created in the past and resolved AFTER
    // creation, otherwise avg resolution time becomes negative.
    const createdAt = resolved ? new Date(Date.now() - resolvedDaysAgo * 24 * 3600 * 1000) : undefined;
    const resolvedAt = resolved ? new Date(createdAt.getTime() + resolutionHours * 3600 * 1000) : undefined;
    const submittedAt = resolved ? createdAt : new Date(Date.now() - 5 * 3600 * 1000);
    const statusChangedAt = resolved ? resolvedAt : new Date(Date.now() - 4 * 3600 * 1000);
    const doc = await Complaint.create({
      complaintId,
      title,
      description,
      category,
      priority,
      status,
      reporter: reporter._id,
      assignedAgent: assignedAgent?._id,
      department: department?._id,
      dueDate,
      createdAt,
      slaStatus: "On Track",
      resolvedAt,
      history: [{ status: "Submitted", note: "Complaint created", changedBy: reporter._id, at: submittedAt }],
    });
    if (status !== "Submitted") {
      doc.history.push({ status, note: "Initial seed status", changedBy: admin._id, at: statusChangedAt });
      await doc.save();
    }
    return doc;
  };

  const c1 = await makeComplaint({ title: "Campus Wi-Fi not working in Library", description: "Internet has been down in the library for 2 days affecting study.", category: "Network and Internet", priority: "High", reporter: users[0], status: "In Progress", assignedAgent: agent1, department: deptMap["IT Support"], dueOffsetMinutes: -30 });
  const c2 = await makeComplaint({ title: "Water leakage in Hostel Room 204", description: "Bathroom tap leaking causing water accumulation.", category: "Water and Sanitation", priority: "Medium", reporter: users[1], status: "Assigned", assignedAgent: agent2, department: deptMap["Facilities"] });
  const c3 = await makeComplaint({ title: "Sparking electrical socket in Lab", description: "Electrical socket sparking near equipment, safety risk.", category: "Electricity and Safety", priority: "Critical", reporter: users[2], status: "Submitted", dueOffsetMinutes: -10 });
  const c4 = await makeComplaint({ title: "Mess food quality complaint", description: "Food quality has dropped over past week.", category: "Hostel or Accommodation", priority: "Low", reporter: users[0], status: "Resolved", assignedAgent: agent2, department: deptMap["Facilities"], resolved: true, resolvedDaysAgo: 1, resolutionHours: 6 });
  const c5 = await makeComplaint({ title: "Portal login error during registration", description: "Unable to log in to student portal during course registration.", category: "Technical Issue", priority: "High", reporter: users[1], status: "Awaiting User", assignedAgent: agent1, department: deptMap["IT Support"] });
  const c6 = await makeComplaint({ title: "Broken window in classroom B-201", description: "Window glass broken, needs repair.", category: "Infrastructure and Maintenance", priority: "Low", reporter: users[2], status: "Closed", assignedAgent: agent2, department: deptMap["Facilities"], resolved: true, resolvedDaysAgo: 2, resolutionHours: 12 });

  // comments
  await Comment.create({ complaint: c1._id, author: agent1._id, body: "We are checking the router. Please restart device.", isInternal: false });
  await Comment.create({ complaint: c1._id, author: agent1._id, body: "Internal: escalated to network team", isInternal: true });

  // notifications
  await Notification.insertMany([
    { user: users[0]._id, type: "complaint_submitted", title: "Complaint submitted", message: `${c1.complaintId} received`, link: `/complaints/${c1._id}`, complaint: c1._id, read: false },
    { user: agent1._id, type: "assigned", title: "Complaint assigned", message: `${c1.complaintId} assigned to you`, link: `/complaints/${c1._id}`, complaint: c1._id, read: false },
  ]);

  return { seeded: true, credentials: { email: "admin@nexaresolve.dev", password: PASSWORD } };
}
