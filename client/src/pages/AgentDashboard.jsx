import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Hourglass,
  Timer,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";

const TERMINAL = ["Resolved", "Closed"];

export default function AgentDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/complaints?limit=100")
      .then((r) => setComplaints(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mine = useMemo(
    () => complaints.filter((c) => String(c.assignedAgent?._id || "") === String(user?._id)),
    [complaints, user?._id]
  );

  const stats = useMemo(() => computeStats(mine), [mine]);
  const overdue = mine.filter((c) => isOverdue(c));
  const approaching = mine.filter((c) => isApproaching(c) && !isOverdue(c));

  const queue = useMemo(() => {
    const sortFn = (a, b) =>
      new Date(a.updatedAt) < new Date(b.updatedAt) ? 1 : -1;
    const active = mine.filter((c) => !TERMINAL.includes(c.status));
    const byUrgency = (a, b) => {
      const ua = urgencyRank(a);
      const ub = urgencyRank(b);
      return ua - ub || sortFn(a, b);
    };
    return {
      newAssignments: active
        .filter((c) => c.status === "Assigned" || c.status === "Under Review")
        .sort(byUrgency),
      inProgress: active
        .filter((c) => c.status === "In Progress")
        .sort(byUrgency),
      awaiting: active
        .filter((c) => c.status === "Awaiting User")
        .sort(byUrgency),
      overdue: overdue.sort(byUrgency),
      approaching,
    };
  }, [mine, overdue, approaching]);

  if (loading) return <Spinner label="Loading your department queue…" />;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Department workspace"
        title="Welcome to your department"
        description="Only complaints assigned to your department are listed here. Complainant details are never shown."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Assigned to you" value={mine.length} icon={ClipboardList} hint="Across all priorities" />
        <MetricCard label="In progress" value={stats.inProgress} icon={Timer} tone="info" />
        <MetricCard label="Awaiting response" value={stats.awaiting} icon={Hourglass} tone="warning" />
        <MetricCard
          label="Overdue"
          value={overdue.length}
          icon={AlertTriangle}
          tone="danger"
          hint={overdue.length ? "Require attention" : "All on track"}
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-6">
        <div className="space-y-6">
          <QueueCard
            title="New assignments"
            items={queue.newAssignments}
            empty="No new assignments. New assignments will appear here."
            actionLabel={(c) => `${c.complaintId}`}
          />
          <QueueCard
            title="In progress"
            items={queue.inProgress}
            empty="Nothing in progress right now."
            actionLabel={(c) => `${c.complaintId}`}
          />
          <QueueCard
            title="Awaiting your response"
            items={queue.awaiting}
            empty="No cases are waiting on you."
            actionLabel={(c) => `${c.complaintId}`}
          />
          <QueueCard
            title="Overdue & approaching"
            items={[...queue.overdue, ...queue.approaching].sort((a, b) => urgencyRank(b) - urgencyRank(a))}
            empty="No overdue or approaching complaints."
            urgent
          />
        </div>

        <aside className="space-y-6">
          <div className="card card--padded">
            <h2 className="section-title mb-4">SLA health</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">On track</span>
                <span className="font-medium">{stats.onTrack}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">At risk</span>
                <span className={stats.atRisk > 0 ? "text-warning-600 font-medium" : "font-medium"}>
                  {stats.atRisk}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Breached</span>
                <span className={stats.breached > 0 ? "text-danger-600 font-medium" : "font-medium"}>
                  {stats.breached}
                </span>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-edge bg-canvas/50 px-3 py-3 text-xs text-ink-600">
              Deadlines are calculated per priority and monitored by the SLA job. Escalations
              notify the assigned agent automatically.
            </div>
          </div>

          <div className="card card--padded">
            <h2 className="section-title mb-3">Identity protection</h2>
            <p className="text-sm text-ink-500 leading-relaxed">
              You are viewing complaints assigned to your department. The identity of the
              complainant is never exposed to department staff.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function QueueCard({ title, items, empty, urgent, actionLabel }) {
  return (
    <div className="card card--padded">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">{title}</h2>
        <span className="badge badge-neutral">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <EmptyState title="Nothing here" description={empty} />
      ) : (
        <div className="divide-y divide-edge">
          {items.slice(0, 12).map((c) => (
            <div key={c._id} className="py-3 first:pt-0 last:pb-0">
              <Link
                to={`/complaints/${c._id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-3 -mx-2 px-2 py-1 rounded-lg hover:bg-canvas/70 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-brand">{c.complaintId}</span>
                    {urgent && isOverdue(c) && <span className="badge badge-danger">Overdue</span>}
                    {urgent && isApproaching(c) && !isOverdue(c) && (
                      <span className="badge badge-warning">Approaching</span>
                    )}
                  </div>
                  <div className="font-medium text-ink-900 truncate mt-0.5">{c.title}</div>
                  <div className="text-xs text-ink-500 mt-1">
                    Updated {new Date(c.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                  </div>
                  <span className="text-xs text-ink-500 flex items-center gap-1">
                    <CalendarClock size={12} />
                    {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : "No due date"}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
      {items.length > 12 && <div className="text-xs text-ink-500 mt-3">Showing first 12 of {items.length}.</div>}
    </div>
  );
}

function isOverdue(c) {
  return Boolean(
    c.dueDate && new Date(c.dueDate).getTime() < Date.now() && !TERMINAL.includes(c.status)
  );
}

function isApproaching(c) {
  if (!c.dueDate) return false;
  const now = Date.now();
  const due = new Date(c.dueDate).getTime();
  if (isOverdue(c) || TERMINAL.includes(c.status)) return false;
  const total = due - new Date(c.createdAt).getTime();
  if (total <= 0) return false;
  return (due - now) / total <= 0.2 && (due - now) > 0;
}

function urgencyRank(c) {
  const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return rank[c.priority] ?? 4;
}

function computeStats(items) {
  const active = items.filter((c) => !TERMINAL.includes(c.status));
  const inProgress = active.filter((c) => c.status === "In Progress").length;
  const awaiting = active.filter((c) => c.status === "Awaiting User").length;
  const atRisk = active.filter((c) => c.slaStatus === "At Risk").length;
  const breached = items.filter((c) => c.slaStatus === "Breached").length;
  const onTrack = active.filter((c) => c.slaStatus === "On Track").length;
  return { inProgress, awaiting, atRisk, breached, onTrack };
}
