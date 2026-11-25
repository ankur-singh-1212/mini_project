import mongoose from "mongoose";

const statuses = ["Submitted", "Under Review", "Assigned", "In Progress", "Awaiting User", "Resolved", "Closed", "Reopened"];
const priorities = ["Low", "Medium", "High", "Critical"];
const categories = [
  "Technical Issue",
  "Infrastructure and Maintenance",
  "Electricity and Safety",
  "Water and Sanitation",
  "Academic or Administrative",
  "Network and Internet",
  "Hostel or Accommodation",
  "Other",
];
const slaStatuses = ["On Track", "At Risk", "Breached", "Met"];

const attachmentSchema = new mongoose.Schema(
  {
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    status: String,
    note: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const escalationSchema = new mongoose.Schema(
  {
    level: Number,
    reason: String,
    escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    scheduledJob: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: categories, default: "Other" },
    subcategory: { type: String, trim: true },
    location: { type: String, trim: true, maxlength: 200 },
    priority: { type: String, enum: priorities, default: "Medium" },
    status: { type: String, enum: statuses, default: "Submitted" },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    attachments: [attachmentSchema],
    dueDate: { type: Date, index: true },
    firstResponseDueAt: { type: Date },
    firstRespondedAt: { type: Date },
    slaStatus: { type: String, enum: slaStatuses, default: "On Track" },
    resolutionSummary: { type: String },
    resolvedAt: { type: Date },
    reopenedCount: { type: Number, default: 0 },
    history: [historySchema],
    escalationHistory: [escalationSchema],
    isEscalated: { type: Boolean, default: false },
    escalatedAt: { type: Date },
    prediction: {
      category: String,
      priority: String,
      confidence: Number,
      source: String,
      reason: String,
      suggestedAt: Date,
    },
    autoClassified: { type: Boolean, default: false },
    autoConfidence: { type: Number, default: null },
    needsReview: { type: Boolean, default: false, index: true },
    agentPriority: { type: String, enum: priorities },
  },
  { timestamps: true }
);

complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ department: 1, status: 1 });

export const COMPLAINT_STATUSES = statuses;
export const COMPLAINT_PRIORITIES = priorities;
export const COMPLAINT_CATEGORIES = categories;
export default mongoose.model("Complaint", complaintSchema);
