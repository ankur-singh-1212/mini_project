import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  FileText,
  History,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import Spinner from "../components/Spinner";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { cn } from "../utils/cn";

const CATEGORIES = [
  "Technical Issue",
  "Infrastructure and Maintenance",
  "Electricity and Safety",
  "Water and Sanitation",
  "Academic or Administrative",
  "Network and Internet",
  "Hostel or Accommodation",
  "Other",
];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const AutoLabel = ({ children }) => (
  <span className="inline-flex items-center gap-2 flex-wrap">
    {children}
    <span className="badge badge-primary font-normal tracking-normal normal-case">Auto-classified</span>
  </span>
);

const ALLOWED_TRANSITIONS = {
  Submitted: ["Under Review", "Assigned"],
  "Under Review": ["Assigned", "In Progress", "Awaiting User"],
  Assigned: ["In Progress", "Awaiting User"],
  "In Progress": ["Awaiting User", "Resolved"],
  "Awaiting User": ["In Progress", "Resolved"],
  Resolved: ["Closed", "Reopened"],
  Closed: ["Reopened"],
  Reopened: ["Under Review", "In Progress"],
};

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const { push } = useToast();
  const [complaint, setComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [showEscalationInfo, setShowEscalationInfo] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState("");
  const [overridePriority, setOverridePriority] = useState("");
  const [overrideDepartment, setOverrideDepartment] = useState("");
  const [overrideAgent, setOverrideAgent] = useState("");
  const [adminAgents, setAdminAgents] = useState([]);
  const [adminDepartments, setAdminDepartments] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/complaints/${id}`);
      setComplaint(r.data.complaint);
      setOverrideCategory(r.data.complaint.category || "");
      setOverridePriority(r.data.complaint.priority || "");
      setOverrideDepartment(r.data.complaint.department?._id || "");
      setOverrideAgent(r.data.complaint.assignedAgent?._id || "");
      setComments(r.data.comments || []);
    } catch (err) {
      push({ type: "error", title: "Failed to load", message: err.response?.data?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    api.get("/departments").then((r) => setAdminDepartments(r.data.data || [])).catch(() => {});
    api.get("/admin/users?role=agent&limit=100").then((r) => setAdminAgents(r.data.data || [])).catch(() => {});
  }, [user?.role]);

  useEffect(() => {
    if (!socket) return undefined;
    socket.emit("complaint:join", id, () => {});
    const refresh = () => load();
    socket.on("complaint:comment", refresh);
    socket.on("complaint:status", refresh);
    socket.on("complaint:assigned", refresh);
    socket.on("complaint:escalated", refresh);
    return () => {
      socket.emit("complaint:leave", id);
      socket.off("complaint:comment", refresh);
      socket.off("complaint:status", refresh);
      socket.off("complaint:assigned", refresh);
      socket.off("complaint:escalated", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, id]);

  const canSeeIdentity = user?.role === "admin";
  const isAssignedToMe = user?.role === "agent" && complaint?.assignedAgent?._id === user._id;

  const allowedTransitions = useMemo(() => {
    if (!complaint) return [];
    if (user?.role === "user") {
      return complaint.status === "Resolved" || complaint.status === "Closed"
        ? ["Reopened"]
        : [];
    }
    if (user?.role === "agent") {
      return isAssignedToMe ? ALLOWED_TRANSITIONS[complaint.status] || [] : [];
    }
    return ALLOWED_TRANSITIONS[complaint.status] || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaint, user?.role, isAssignedToMe]);

  const sendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.post(`/complaints/${id}/comments`, { body: newComment.trim(), isInternal: internal });
      setNewComment("");
      load();
    } catch (err) {
      push({ type: "error", title: "Failed", message: err.response?.data?.message });
    }
  };

  const applyStatus = async () => {
    if (!newStatus) return;
    try {
      await api.patch(`/complaints/${id}/status`, {
        status: newStatus,
        note: statusNote.trim() || undefined,
        resolutionSummary: newStatus === "Resolved" ? resolutionSummary : undefined,
      });
      setNewStatus("");
      setStatusNote("");
      setResolutionSummary("");
      load();
    } catch (err) {
      push({ type: "error", title: "Update failed", message: err.response?.data?.message });
    }
  };

  const saveClassification = async () => {
    try {
      await api.patch(`/complaints/${id}`, {
        category: overrideCategory,
        priority: overridePriority,
        department: overrideDepartment || undefined,
      });
      push({ type: "success", title: "Classification updated", message: "Override saved to the audit log." });
      load();
    } catch (err) {
      push({ type: "error", title: "Update failed", message: err.response?.data?.message });
    }
  };

  const saveAssignment = async () => {
    if (!overrideAgent) return;
    try {
      await api.post(`/complaints/${id}/assign`, { agentId: overrideAgent });
      push({ type: "success", title: "Reassigned", message: "Override saved to the audit log." });
      load();
    } catch (err) {
      push({ type: "error", title: "Reassignment failed", message: err.response?.data?.message });
    }
  };

  if (loading && !complaint) return <Spinner label="Loading complaint…" />;
  if (!complaint) return null;
  const c = complaint;

  const slaInfo = computeSlaInfo(c);
  const timeline = buildTimeline(c);

  return (
    <div className="page">
      <Link to={user?.role === "agent" ? "/agent" : "/complaints"} className="text-sm text-ink-500 hover:text-ink-900 inline-flex items-center gap-1 mb-3">
        <ArrowLeft size={14} /> Back
      </Link>

      <PageHeader
        title={c.title}
        description={`${c.complaintId} · ${c.category}${c.location ? ` · ${c.location}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            <PriorityBadge priority={c.priority} />
            {c.isEscalated && <span className="badge badge-danger">Escalated</span>}
          </div>
        }
      />

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          <div className="card card--padded">
            <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{c.description}</p>

            {c.attachments?.length > 0 && (
              <div className="mt-5">
                <div className="label mb-2">Attachments</div>
                <div className="flex flex-wrap gap-2">
                  {c.attachments.map((a, i) => (
                    <a
                      key={i}
                      href={a.path}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary text-xs"
                    >
                      <FileText size={13} /> {a.filename}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {c.resolutionSummary && (
              <div className="mt-5 rounded-xl border border-success-100 bg-success-50 p-4">
                <div className="text-sm font-medium text-success-600 mb-1">Resolution</div>
                <p className="text-sm text-ink-700">{c.resolutionSummary}</p>
                {c.resolvedAt && (
                  <div className="text-xs text-ink-500 mt-2">
                    Resolved {new Date(c.resolvedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {allowedTransitions.length > 0 && (
            <div className="card card--padded space-y-3">
              <h2 className="section-title">Update status</h2>
              <div className="flex flex-wrap gap-2">
                {allowedTransitions.map((s) => (
                  <button
                    key={s}
                    className={cn(
                      "btn",
                      newStatus === s ? "btn-primary" : "btn-secondary"
                    )}
                    onClick={() => setNewStatus(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <textarea
                className="textarea"
                rows={2}
                placeholder="Note for the timeline (optional)"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
              {newStatus === "Resolved" && (
                <input
                  className="input"
                  placeholder="Resolution summary"
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                />
              )}
              <div>
                <button className="btn btn-primary" disabled={!newStatus} onClick={applyStatus}>
                  Apply update
                </button>
              </div>
            </div>
          )}

          <div className="card card--padded">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-brand" /> Conversation
            </h2>
            <div className="space-y-3">
              {comments.length === 0 && (
                <div className="text-sm text-ink-500">No messages yet.</div>
              )}
              {comments.map((cm) => (
                <div
                  key={cm._id}
                  className={cn(
                    "rounded-xl border p-3",
                    cm.isInternal
                      ? "border-warning-100 bg-warning-50"
                      : "border-edge bg-canvas/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-ink-900">
                      {cm.author?.name || "Unknown"}
                      {cm.isInternal && (
                        <span className="ml-2 text-xs text-warning-600">(internal)</span>
                      )}
                    </span>
                    <span className="text-xs text-ink-500">
                      {new Date(cm.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-ink-700 whitespace-pre-wrap">{cm.body}</p>
                </div>
              ))}
            </div>
            {user?.role !== "user" && (
              <form onSubmit={sendComment} className="mt-4 space-y-3">
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="Write a reply…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <label className="flex items-center gap-2 text-sm text-ink-500">
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                    className="accent-brand"
                  />
                  Internal note (visible to administrators only)
                </label>
                <div>
                  <button type="submit" className="btn btn-primary" disabled={!newComment.trim()}>
                    <Send size={14} /> Send
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="card card--padded">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <History size={16} className="text-brand" /> Timeline
            </h2>
            {timeline.length === 0 ? (
              <div className="text-sm text-ink-500">No timeline entries yet.</div>
            ) : (
              <div className="relative">
                <div className="timeline-line" />
                <div className="space-y-5">
                  {timeline.map((entry) => (
                    <div key={entry.key} className="flex gap-3">
                      <div className="timeline-dot bg-brand" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink-900">
                          {entry.title}
                          {entry.internal && (
                            <span className="ml-2 text-xs text-warning-600">(internal)</span>
                          )}
                        </div>
                        {entry.note && <div className="text-sm text-ink-500 mt-0.5">{entry.note}</div>}
                        <div className="text-xs text-ink-300 mt-1">
                          {new Date(entry.at).toLocaleString()} · by {entry.changedBy || "system"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card card--padded space-y-4">
            <h2 className="section-title">Case details</h2>
            {canSeeIdentity ? (
              <DetailRow icon={UserRound} label="Reporter" value={`${c.reporter?.name || "Unknown"}${c.reporter?.email ? ` · ${c.reporter.email}` : ""}`} />
            ) : (
              <div className="rounded-xl border border-edge bg-canvas/50 px-3 py-2.5">
                <div className="text-xs text-ink-500">Complainant identity is restricted</div>
                <div className="text-sm text-ink-700 mt-0.5">Visible to administrators only.</div>
              </div>
            )}
            {c.needsReview && (
              <div className="rounded-xl border border-warning-100 bg-warning-50 px-3 py-2 text-xs text-warning-600">
                Needs admin review — classification confidence was low. No agent was auto-assigned.
              </div>
            )}
            <DetailRow icon={ClipboardList} label="Assigned to" value={c.assignedAgent?.name || "Unassigned"} />
            <DetailRow icon={ShieldCheck} label={<AutoLabel>Department</AutoLabel>} value={c.department?.name || "—"} />
            <DetailRow label={<AutoLabel>Category</AutoLabel>} value={c.category} />
            {c.subcategory && <DetailRow label="Sub-category" value={c.subcategory} />}
            {c.location && <DetailRow icon={MapPin} label="Location" value={c.location} />}
            <DetailRow label={<AutoLabel>Priority</AutoLabel>} value={<PriorityBadge priority={c.priority} />} />
            <DetailRow label="Created" value={new Date(c.createdAt).toLocaleString()} />
            <DetailRow label="Last update" value={new Date(c.updatedAt).toLocaleString()} />
          </div>

          {user?.role === "admin" && (
            <div className="card card--padded space-y-4">
              <h2 className="section-title flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand" /> Admin override
              </h2>
              {c.autoClassified && (
                <p className="text-xs text-ink-500">
                  Originally auto-selected by AI{c.autoConfidence ? ` (${Math.round(c.autoConfidence * 100)}% confidence)` : ""}.
                </p>
              )}
              <div>
                <label className="label mb-2 block" htmlFor="override-category">Category</label>
                <select id="override-category" className="select" value={overrideCategory} onChange={(e) => setOverrideCategory(e.target.value)}>
                  {CATEGORIES.map((x) => (<option key={x} value={x}>{x}</option>))}
                </select>
              </div>
              <div>
                <label className="label mb-2 block" htmlFor="override-priority">Priority</label>
                <select id="override-priority" className="select" value={overridePriority} onChange={(e) => setOverridePriority(e.target.value)}>
                  {PRIORITIES.map((x) => (<option key={x} value={x}>{x}</option>))}
                </select>
              </div>
              <div>
                <label className="label mb-2 block" htmlFor="override-department">Department</label>
                <select id="override-department" className="select" value={overrideDepartment} onChange={(e) => setOverrideDepartment(e.target.value)}>
                  <option value="">Unassigned queue</option>
                  {adminDepartments.map((d) => (<option key={d._id} value={d._id}>{d.name}</option>))}
                </select>
              </div>
              <button type="button" className="btn btn-secondary w-full" onClick={saveClassification}>
                Save classification
              </button>
              <div className="border-t border-edge pt-4">
                <label className="label mb-2 block" htmlFor="override-agent">Reassign agent</label>
                <select id="override-agent" className="select" value={overrideAgent} onChange={(e) => setOverrideAgent(e.target.value)}>
                  <option value="">Choose an agent</option>
                  {adminAgents.map((a) => (<option key={a._id} value={a._id}>{a.name}</option>))}
                </select>
                <button type="button" className="btn btn-primary w-full mt-3" disabled={!overrideAgent} onClick={saveAssignment}>
                  Reassign
                </button>
              </div>
            </div>
          )}

          <div className="card card--padded space-y-4">
            <h2 className="section-title">Service level</h2>
            <div className="flex items-start gap-3">
              <CalendarClock size={16} className="text-brand mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm text-ink-700">
                  {c.dueDate ? (
                    <>Resolution due <strong>{new Date(c.dueDate).toLocaleDateString()}</strong></>
                  ) : (
                    "No due date"
                  )}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">
                  SLA status: <span className={slaInfo.tone}>{slaInfo.label}</span>
                </div>
              </div>
            </div>
            {c.firstRespondedAt && (
              <div className="text-xs text-ink-500 pt-1">
                First response: {new Date(c.firstRespondedAt).toLocaleString()}
              </div>
            )}
            {slaInfo.countdown && (
              <div className="rounded-lg border border-edge bg-canvas/50 px-3 py-2 text-xs text-ink-600">
                {slaInfo.countdown}
              </div>
            )}
            {c.isEscalated && (
              <div className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-600">
                Escalated {c.escalatedAt ? new Date(c.escalatedAt).toLocaleString() : ""} · level {c.escalationHistory?.[c.escalationHistory.length - 1]?.level || 1}
              </div>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm w-full"
              onClick={() => setShowEscalationInfo(true)}
            >
              Escalation history
            </button>
          </div>
        </aside>
      </div>

      <Modal
        open={showEscalationInfo}
        onClose={() => setShowEscalationInfo(false)}
        title="Escalation history"
        description="Automatic escalation events recorded for this complaint."
      >
        {slaInfo.escalations.length === 0 ? (
          <EmptyState title="No escalations" description="This complaint has not been escalated yet." />
        ) : (
          <div className="space-y-3">
            {slaInfo.escalations.map((e) => (
              <div key={e._id || e.level} className="rounded-lg border border-edge px-3 py-2">
                <div className="text-sm font-medium text-ink-900">
                  Level {e.level} — {e.reason}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">
                  {new Date(e.at).toLocaleString()} · by {e.escalatedBy || "system"}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon size={16} className="text-ink-300 mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="label">{label}</div>
        <div className="text-sm text-ink-900 mt-0.5 break-words">{value}</div>
      </div>
    </div>
  );
}

function computeSlaInfo(c) {
  const now = Date.now();
  const due = c.dueDate ? new Date(c.dueDate).getTime() : null;
  const isTerminal = ["Resolved", "Closed"].includes(c.status);
  const slaStatus = c.slaStatus || "On Track";
  let tone = "text-brand";
  if (slaStatus === "Breached") tone = "text-danger-600";
  else if (slaStatus === "At Risk") tone = "text-warning-600";
  else if (slaStatus === "Met" || isTerminal) tone = "text-success-600";
  const msLeft = due ? due - now : null;
  const countdown =
    !isTerminal && msLeft !== null
      ? `Time left: ${formatDuration(msLeft)}`
      : null;
  return {
    label: slaStatus,
    tone,
    countdown,
    escalations: c.escalationHistory || [],
  };
}

function buildTimeline(c) {
  const entries = [];
  for (const h of c.history || []) {
    entries.push({
      key: `h-${h.at}-${h.status}`,
      title: `${h.status}`,
      note: h.note,
      at: h.at,
      changedBy: h.changedBy,
      internal: false,
    });
  }
  for (const e of c.escalationHistory || []) {
    entries.push({
      key: `e-${e.at}-${e.level}`,
      title: `Escalated (level ${e.level})`,
      note: e.reason,
      at: e.at,
      changedBy: e.escalatedBy,
      internal: false,
    });
  }
  return entries.sort((a, b) => new Date(a.at) - new Date(b.at));
}

function formatDuration(ms) {
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin < 1) return "less than a minute";
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}
