import Complaint, { COMPLAINT_STATUSES } from "../models/Complaint.js";
import Comment from "../models/Comment.js";
import Department from "../models/Department.js";
import User from "../models/User.js";
import { nextComplaintId } from "../services/complaintIdService.js";
import { predictCategory, predictPriority } from "../services/predictionService.js";
import { dueDateFor, responseDueFor, updateSLAStatus } from "../services/slaService.js";
import { createNotification } from "../services/notificationService.js";
import { recordAudit } from "../services/auditService.js";
import { resolveDepartment, pickLeastLoadedAgent } from "../services/autoAssignService.js";
import { departmentNameForCategory } from "../config/categoryDepartment.js";
import { needsReview, MIN_AUTO_ASSIGN_CONFIDENCE } from "../config/autoClassify.js";

const transitions = {
  Submitted: ["Under Review", "Assigned"],
  "Under Review": ["Assigned", "In Progress", "Awaiting User"],
  Assigned: ["In Progress", "Awaiting User"],
  "In Progress": ["Awaiting User", "Resolved"],
  "Awaiting User": ["In Progress", "Resolved"],
  Resolved: ["Closed", "Reopened"],
  Closed: ["Reopened"],
  Reopened: ["Under Review", "In Progress"],
};

function idOf(x) { return x?._id ? x._id.toString() : (x ? x.toString() : null); }
function canView(user, c) {
  if (user.role === "admin") return true;
  if (idOf(c.reporter) === user._id.toString()) return true;
  if (idOf(c.assignedAgent) === user._id.toString()) return true;
  return false;
}
// Only administrators may receive the complainant's identity.
function maySeeReporter(user) {
  return user.role === "admin" || user.role === "user";
}

export const createComplaint = async (req, res) => {
  // Only these fields are accepted from the client. Category, priority,
  // department and assignee are always decided on the server.
  const { title, description } = req.body;
  const text = [title, description].filter(Boolean).join(" ");

  const catPred = await predictCategory(text);
  const finalCategory = catPred.category;
  const prioPred = predictPriority(text, finalCategory);
  const finalPriority = prioPred.priority;
  const review = needsReview(catPred.confidence);

  const dept = await resolveDepartment(finalCategory);
  // Low-confidence predictions are never auto-assigned: they go to the
  // administrator review queue instead.
  const agent = !review && dept ? await pickLeastLoadedAgent(dept._id) : null;

  const dueDate = await dueDateFor(finalPriority);
  const firstResponseDueAt = await responseDueFor(finalPriority);
  const complaintId = await nextComplaintId();

  const history = [
    { status: "Submitted", note: "Complaint created", changedBy: req.user._id, at: new Date() },
    { status: "Submitted", note: "Category/priority auto-classified", changedBy: req.user._id, at: new Date() },
  ];
  if (review) {
    history.push({ status: "Submitted", note: "Needs admin review (low confidence)", changedBy: req.user._id, at: new Date() });
  }
  if (agent) {
    history.push({ status: "Assigned", note: `Auto-assigned to ${agent.name}`, changedBy: req.user._id, at: new Date() });
  }

  const comp = await Complaint.create({
    complaintId,
    title,
    description,
    category: finalCategory,
    priority: finalPriority,
    reporter: req.user._id,
    department: dept?._id || undefined,
    assignedAgent: agent?._id || undefined,
    status: agent ? "Assigned" : "Submitted",
    dueDate,
    firstResponseDueAt,
    slaStatus: "On Track",
    history,
    prediction: {
      category: catPred.category,
      priority: prioPred.priority,
      confidence: catPred.confidence,
      source: catPred.source,
      reason: prioPred.reason,
      suggestedAt: new Date(),
    },
    autoClassified: true,
    autoConfidence: catPred.confidence,
    needsReview: review,
  });

  if (req.files && req.files.length) {
    for (const f of req.files) {
      comp.attachments.push({
        filename: f.originalname,
        path: `/uploads/${f.filename}`,
        mimetype: f.mimetype,
        size: f.size,
        uploadedBy: req.user._id,
      });
    }
    await comp.save();
  }

  await createNotification({
    userId: req.user._id,
    type: "complaint_submitted",
    title: "Complaint submitted",
    message: `${comp.complaintId} has been received.`,
    link: `/complaints/${comp._id}`,
    complaintId: comp._id,
    io: req.app.get("io"),
  });

  if (agent) {
    await createNotification({
      userId: agent._id,
      type: "assigned",
      title: "Complaint assigned",
      message: `${comp.complaintId} was auto-assigned to you.`,
      link: `/complaints/${comp._id}`,
      complaintId: comp._id,
      io: req.app.get("io"),
    });
  }

  await recordAudit({
    actor: req.user._id,
    action: "complaint_created",
    entityType: "Complaint",
    entityId: comp._id,
    details: {
      complaintId: comp.complaintId,
      autoClassified: true,
      confidence: catPred.confidence,
      category: finalCategory,
      priority: finalPriority,
      department: dept?.name || null,
      assignedTo: agent?.name || null,
      needsReview: review,
    },
    ip: req.ip,
  });
  if (review) {
    await recordAudit({
      actor: req.user._id,
      action: "complaint_needs_review",
      entityType: "Complaint",
      entityId: comp._id,
      details: {
        confidence: catPred.confidence,
        category: finalCategory,
        priority: finalPriority,
        reason: `Confidence below ${MIN_AUTO_ASSIGN_CONFIDENCE}`,
      },
      ip: req.ip,
    });
  }
  if (agent) {
    await recordAudit({
      actor: req.user._id,
      action: "complaint_auto_assigned",
      entityType: "Complaint",
      entityId: comp._id,
      details: {
        agent: agent.name,
        agentId: agent._id.toString(),
        department: dept?.name || null,
        openCount: agent.openCount,
        note: `Auto-assigned to ${agent.name}`,
      },
      ip: req.ip,
    });
  }
  const io = req.app.get("io");
  if (io) io.to("admins").emit("complaint:new", { id: comp._id.toString(), complaintId: comp.complaintId });

  const populated = await populateComplaintView(req.user, comp._id);
  res.status(201).json({ success: true, complaint: populated });
};

// Lightweight prediction used by the complaint form while the user types.
export const predictComplaint = async (req, res) => {
  const { title, description } = req.body;
  const text = [title, description].filter(Boolean).join(" ").trim();
  if (!text) {
    return res.status(400).json({ success: false, message: "title or description required" });
  }
  const cat = await predictCategory(text);
  const prio = predictPriority(text, cat.category);
  const dept = await resolveDepartment(cat.category);
  res.json({
    success: true,
    data: {
      category: cat.category,
      priority: prio.priority,
      confidence: cat.confidence,
      source: cat.source,
      department: dept?._id?.toString() || null,
      departmentName: dept?.name || departmentNameForCategory(cat.category),
    },
  });
};

// Build a complaint query with the fields each viewer is allowed to see.
// Complainant identity is only populated for administrators and the reporter.
async function populateComplaintView(user, complaintId) {
  let query = Complaint.findById(complaintId).populate("assignedAgent", "name");
  if (maySeeReporter(user)) query = query.populate("reporter", "name email");
  query = query.populate("department", "name");
  return query;
}

export const listComplaints = async (req, res) => {
  const { status, category, priority, department, agent, q, page = 1, limit = 10, sort = "-createdAt", from, to } = req.query;
  const filter = {};
  if (req.user.role === "user") filter.reporter = req.user._id;
  else if (req.user.role === "agent") filter.assignedAgent = req.user._id;
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (department) filter.department = department;
  if (agent) filter.assignedAgent = agent;
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { complaintId: { $regex: q, $options: "i" } },
    ];
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const total = await Complaint.countDocuments(filter);
  let query = Complaint.find(filter).populate("assignedAgent", "name email").populate("department", "name");
  if (maySeeReporter(req.user)) query = query.populate("reporter", "name email");
  const items = await query.sort(sort).skip((p - 1) * l).limit(l).lean();

  // refresh sla status
  for (const it of items) await updateSLAStatus(it);

  res.json({ success: true, data: items, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
};

export const getComplaint = async (req, res) => {
  let query = Complaint.findById(req.params.id).populate("assignedAgent", "name").populate("department", "name");
  if (maySeeReporter(req.user)) query = query.populate("reporter", "name email");
  const c = await query;
  if (!c) return res.status(404).json({ success: false, message: "Complaint not found" });
  if (!canView(req.user, c)) return res.status(403).json({ success: false, message: "Forbidden" });
  await updateSLAStatus(c);
  await c.save().catch(() => {});
  const commentsFilter = { complaint: c._id };
  if (req.user.role === "user") commentsFilter.isInternal = false;
  const comments = await Comment.find(commentsFilter)
    .populate("author", "name email role")
    .sort({ createdAt: 1 });
  res.json({ success: true, complaint: c, comments });
};

export const updateComplaint = async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: "Complaint not found" });
  if (!canView(req.user, c)) return res.status(403).json({ success: false, message: "Forbidden" });
  // Classification and assignment are administrator-only. Attempts by users
  // or agents are rejected outright instead of being silently ignored.
  const restricted = ["category", "priority", "department", "assignedAgent", "assignee"];
  if (req.user.role !== "admin" && restricted.some((k) => req.body[k] !== undefined)) {
    return res.status(403).json({ success: false, message: "Only administrators can change classification or assignment" });
  }
  if (req.user.role === "user" && c.reporter.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  // Users may edit only few fields before assignment
  const allowed = req.user.role === "admin"
    ? ["title", "description", "category", "subcategory", "priority", "department", "assignedAgent"]
    : req.user.role === "agent"
    ? ["subcategory"]
    : ["title", "description"];
  const changes = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined && String(req.body[k]) !== String(c[k] || "")) {
      changes[k] = { from: c[k] ? c[k].toString() : null, to: req.body[k] };
      c[k] = req.body[k];
    }
  }
  if (req.body.priority && req.user.role === "admin") {
    c.dueDate = await dueDateFor(c.priority);
  }
  const isOverride = req.user.role === "admin" && ["category", "priority", "department", "assignedAgent"].some((k) => k in changes);
  if (isOverride && c.needsReview) {
    c.needsReview = false;
  }
  await updateSLAStatus(c);
  await c.save();
  await recordAudit({
    actor: req.user._id,
    action: isOverride ? "complaint_override" : "complaint_updated",
    entityType: "Complaint",
    entityId: c._id,
    details: Object.keys(changes).length
      ? { changes, ...(isOverride ? { override: true, needsReviewCleared: true } : {}) }
      : undefined,
    ip: req.ip,
  });
  res.json({ success: true, complaint: c });
};

export const changeStatus = async (req, res) => {
  const { status, note } = req.body;
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: "Complaint not found" });
  if (!canView(req.user, c)) return res.status(403).json({ success: false, message: "Forbidden" });
  // permissions
  if (req.user.role === "user") {
    // users can only reopen resolved/closed? and maybe awaiting? Keep reopen only
    if (!(c.status === "Resolved" || c.status === "Closed") || status !== "Reopened") {
      return res.status(403).json({ success: false, message: "Forbidden status change" });
    }
  }
  if (req.user.role === "agent" && c.assignedAgent?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  if (!transitions[c.status]?.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid transition from ${c.status} to ${status}` });
  }
  const prev = c.status;
  c.status = status;
  if (status === "Resolved") {
    c.resolvedAt = new Date();
    if (req.body.resolutionSummary) c.resolutionSummary = req.body.resolutionSummary;
  }
  if (status === "Reopened") c.reopenedCount += 1;
  c.history.push({ status, note: note || `Status changed from ${prev}`, changedBy: req.user._id, at: new Date() });
  await updateSLAStatus(c);
  await c.save();

  // notifications: to reporter on status change
  await createNotification({
    userId: c.reporter,
    type: "status_update",
    title: "Complaint updated",
    message: `${c.complaintId} moved to ${status}.`,
    link: `/complaints/${c._id}`,
    complaintId: c._id,
    io: req.app.get("io"),
  });
  if (c.assignedAgent) {
    await createNotification({
      userId: c.assignedAgent,
      type: "status_update",
      title: "Complaint updated",
      message: `${c.complaintId} moved to ${status}.`,
      link: `/complaints/${c._id}`,
      complaintId: c._id,
      io: req.app.get("io"),
    });
  }
  await recordAudit({ actor: req.user._id, action: "status_change", entityType: "Complaint", entityId: c._id, details: { from: prev, to: status }, ip: req.ip });
  const io = req.app.get("io");
  if (io) io.to(`complaint:${c._id}`).emit("complaint:status", { id: c._id.toString(), status });

  res.json({ success: true, complaint: c });
};

export const addComment = async (req, res) => {
  const { body, isInternal } = req.body;
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: "Complaint not found" });
  if (!canView(req.user, c)) return res.status(403).json({ success: false, message: "Forbidden" });
  const internal = !!isInternal && ["agent", "admin"].includes(req.user.role);
  // agents can internal only on assigned
  if (internal && req.user.role === "agent" && c.assignedAgent?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  const comment = await Comment.create({ complaint: c._id, author: req.user._id, body, isInternal: internal });
  const populated = await comment.populate("author", "name email role");
  // track first response
  if (!c.firstRespondedAt && ["agent", "admin"].includes(req.user.role)) {
    c.firstRespondedAt = new Date();
    await c.save();
  }
  if (!internal) {
    // notify reporter if commenter not reporter
    if (req.user._id.toString() !== c.reporter.toString()) {
      await createNotification({
        userId: c.reporter,
        type: "new_comment",
        title: "New reply",
        message: `New reply on ${c.complaintId}.`,
        link: `/complaints/${c._id}`,
        complaintId: c._id,
        io: req.app.get("io"),
      });
    }
    if (c.assignedAgent && req.user._id.toString() !== c.assignedAgent.toString()) {
      await createNotification({
        userId: c.assignedAgent,
        type: "new_comment",
        title: "New reply",
        message: `New reply on ${c.complaintId}.`,
        link: `/complaints/${c._id}`,
        complaintId: c._id,
        io: req.app.get("io"),
      });
    }
  }
  const io = req.app.get("io");
  if (io) io.to(`complaint:${c._id}`).emit("complaint:comment", { complaintId: c._id.toString(), comment: populated });
  res.status(201).json({ success: true, comment: populated });
};

export const assignComplaint = async (req, res) => {
  const { agentId, departmentId, priority } = req.body;
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: "Complaint not found" });
  const agent = await User.findById(agentId);
  if (!agent || agent.role !== "agent") return res.status(400).json({ success: false, message: "Invalid agent" });
  const previousAgent = c.assignedAgent ? c.assignedAgent.toString() : null;
  const clearedReview = Boolean(c.needsReview);
  c.assignedAgent = agent._id;
  if (clearedReview) c.needsReview = false;
  if (departmentId) c.department = departmentId;
  else if (agent.department) c.department = agent.department;
  if (priority) {
    c.priority = priority;
    c.dueDate = await dueDateFor(priority);
  } else if (!c.dueDate) {
    c.dueDate = await dueDateFor(c.priority);
  }
  if (c.status === "Submitted" || c.status === "Under Review") c.status = "Assigned";
  c.history.push({ status: c.status, note: `Assigned to ${agent.name}`, changedBy: req.user._id, at: new Date() });
  await updateSLAStatus(c);
  await c.save();

  await createNotification({
    userId: agent._id,
    type: "assigned",
    title: "Complaint assigned",
    message: `${c.complaintId} assigned to you.`,
    link: `/complaints/${c._id}`,
    complaintId: c._id,
    io: req.app.get("io"),
  });
  await createNotification({
    userId: c.reporter,
    type: "assigned",
    title: "Complaint assigned",
    message: `${c.complaintId} assigned to support.`,
    link: `/complaints/${c._id}`,
    complaintId: c._id,
    io: req.app.get("io"),
  });
  await recordAudit({
    actor: req.user._id,
    action: "complaint_assigned",
    entityType: "Complaint",
    entityId: c._id,
    details: {
      agent: agent.name,
      agentId: agentId,
      from: previousAgent,
      to: agent._id.toString(),
      override: Boolean(previousAgent && previousAgent !== agent._id.toString()),
      needsReviewCleared: clearedReview,
    },
    ip: req.ip,
  });
  const io = req.app.get("io");
  if (io) io.to(`complaint:${c._id}`).emit("complaint:assigned", { id: c._id.toString(), agent: agent.name });
  res.json({ success: true, complaint: c });
};

export const getHistory = async (req, res) => {
  const c = await Complaint.findById(req.params.id).select("history escalationHistory status status");
  if (!c) return res.status(404).json({ success: false, message: "Complaint not found" });
  if (!canView(req.user, c)) return res.status(403).json({ success: false, message: "Forbidden" });
  res.json({ success: true, history: c.history, escalations: c.escalationHistory });
};

// allow ai categorize endpoint separate
export const aiCategorize = async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, message: "text required" });
  const cat = await predictCategory(text);
  const prio = predictPriority(text, cat.category);
  res.json({ success: true, prediction: { ...cat, priority: prio.priority, reason: prio.reason, prioritySource: prio.source } });
};
