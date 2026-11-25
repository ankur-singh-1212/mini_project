import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  Gauge,
  History,
  Timer,
} from "lucide-react";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import MetricCard from "../components/MetricCard";

const TERMINAL = ["Resolved", "Closed"];

export default function Escalations() {
  const [complaints, setComplaints] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [slaConfigs, setSlaConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [department, setDepartment] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(true);
  const [overdueDays, setOverdueDays] = useState("7");

  useEffect(() => {
    Promise.all([
      api.get("/complaints?limit=200").then((r) => r.data.data || []),
      api.get("/admin/escalations").then((r) => r.data.data || []),
      api.get("/admin/sla").then((r) => r.data.data || []),
    ]).then((res) => {
      setComplaints(res[0]);
      setEscalations(res[1]);
      setSlaConfigs(res[2]);
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  const departments = useMemo(() => {
    const map = new Map();
    for (const c of complaints) {
      const id = c.department?._id || "none";
      if (!map.has(id)) {
        map.set(id, c.department?.name || "Unassigned");
      }
    }
    return [...map.entries()];
  }, [complaints]);

  const rows = useMemo(() => {
    const active = complaints.filter((c) => !TERMINAL.includes(c.status));
    return active
      .filter((c) => {
        if (department && (c.department?._id || "none") !== department) return false;
        if (statusFilter && c.status !== statusFilter) return false;
        if (overdueOnly && !isOverdue(c)) return false;
        return true;
      })
      .map((c) => ({ complaint: c, overdueDays: overdueDaysOf(c) }))
      .sort((a, b) => b.overdueDays - a.overdueDays);
  }, [complaints, department, statusFilter, overdueOnly]);

  const metrics = useMemo(() => {
    const active = complaints.filter((c) => !TERMINAL.includes(c.status));
    const breached = active.filter((c) => c.slaStatus === "Breached").length;
    const atRisk = active.filter((c) => c.slaStatus === "At Risk").length;
    const escalated = complaints.filter((c) => c.isEscalated).length;
    const avgResolution = null; // reserved for future SLA performance charts
    return { active: active.length, breached, atRisk, escalated };
  }, [complaints]);

  if (loading) return <Spinner label="Loading SLA data…" />;

  if (error) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Operations"
          title="SLA & escalations"
          description="Live SLA monitoring, deadline countdowns, and automatic escalation history."
        />
        <div className="card">
          <EmptyState title="No data yet" description="SLA and escalation data could not be loaded." />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Operations"
        title="SLA & escalations"
        description="Live SLA monitoring, deadline countdowns, and automatic escalation history."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Gauge} label="Active complaints" value={metrics.active} hint="Not yet resolved or closed" />
        <MetricCard icon={AlertTriangle} label="Breached" value={metrics.breached} tone="danger" hint="Past their SLA deadline" />
        <MetricCard icon={Timer} label="At risk" value={metrics.atRisk} tone="warning" hint="Likely to breach" />
        <MetricCard icon={History} label="Escalated" value={metrics.escalated} tone="violet" hint="Already escalated" />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-6">
        <div className="space-y-6">
          <div className="card card--padded">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="section-title">Overdue queue</h2>
              <span className="text-sm text-ink-500">{rows.length} shown</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="label mb-2 block" htmlFor="department">Department</label>
                <select id="department" className="select" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">All departments</option>
                  {departments.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label mb-2 block" htmlFor="status">Status</label>
                <select id="status" className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  {["Submitted", "Under Review", "Assigned", "In Progress", "Awaiting User", "Resolved", "Closed", "Reopened"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label mb-2 block" htmlFor="overdueOnly">
                  <AlertTriangle size={11} className="inline mr-1" /> Filters
                </label>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-sm text-ink-600">
                    <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="accent-brand" />
                    Overdue only
                  </label>
                  <select
                    id="overdueDays"
                    className="select py-1 text-xs w-24"
                    value={overdueDays}
                    onChange={(e) => setOverdueDays(e.target.value)}
                    aria-label="Overdue duration"
                  >
                    {[1, 3, 7, 14, 30].map((d) => (
                      <option key={d} value={d}>{d} days</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {rows.length === 0 ? (
              <EmptyState title="No matching complaints" description="Adjust the filters to see the SLA queue." />
            ) : (
              <div className="divide-y divide-edge">
                {rows.map(({ complaint: c }) => (
                  <Link
                    key={c._id}
                    to={`/complaints/${c._id}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-canvas/70 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-brand">{c.complaintId}</span>
                        {c.isEscalated && <span className="badge badge-danger">Escalated</span>}
                        {c.slaStatus === "Breached" && <span className="badge badge-danger">Breached</span>}
                        {c.slaStatus === "At Risk" && <span className="badge badge-warning">At risk</span>}
                        {!c.isEscalated && c.slaStatus === "On Track" && <span className="badge badge-success">On track</span>}
                      </div>
                      <div className="font-medium text-ink-900 truncate mt-1">{c.title}</div>
                      <div className="text-xs text-ink-500 mt-1 flex flex-wrap gap-x-3">
                        <span>{c.category}</span>
                        <span>Due {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={c.priority} />
                        <StatusBadge status={c.status} />
                      </div>
                      <span className="text-xs text-ink-500 flex items-center gap-1">
                        <CalendarClock size={12} />
                        {c.isEscalated
                          ? `Escalated ${c.escalatedAt ? new Date(c.escalatedAt).toLocaleDateString() : "—"}`
                          : c.dueDate
                            ? `Due ${new Date(c.dueDate).toLocaleDateString()}`
                            : "No due date"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card card--padded">
            <h2 className="section-title mb-4">Escalation history</h2>
            {escalations.length === 0 ? (
              <EmptyState title="No escalations yet" description="Automatic escalations will be listed here." />
            ) : (
              <div className="divide-y divide-edge">
                {escalations.slice(0, 30).map((c) => (
                  <Link
                    key={c._id}
                    to={`/complaints/${c._id}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-canvas/70 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-brand">{c.complaintId}</span>
                        <span className="badge badge-danger">
                          Level {c.escalationHistory?.[c.escalationHistory.length - 1]?.level || 1}
                        </span>
                      </div>
                      <div className="font-medium text-ink-900 truncate mt-1">{c.title}</div>
                      <div className="text-xs text-ink-500 mt-1">
                        Escalated {c.escalatedAt ? new Date(c.escalatedAt).toLocaleString() : ""}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card card--padded space-y-4">
            <h2 className="section-title">SLA configuration</h2>
            <div className="space-y-2 text-sm">
              {slaConfigs.length === 0 ? (
                <div className="text-ink-500">No data yet</div>
              ) : (
                slaConfigs.map((cfg) => (
                  <div key={cfg.priority} className="flex items-center justify-between border-b border-edge pb-2">
                    <span className="font-medium text-ink-900">{cfg.priority}</span>
                    <span className="text-ink-500">
                      {cfg.escalationEnabled ? "Escalation on" : "Off"}
                    </span>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-ink-500">
              Response and resolution targets per priority are configured under Settings.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function isOverdue(c) {
  if (TERMINAL.includes(c.status)) return false;
  return Boolean(c.dueDate && new Date(c.dueDate).getTime() < Date.now());
}

function overdueDaysOf(c) {
  if (!c.dueDate) return 0;
  const ms = new Date(c.dueDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(-ms / 86400000));
}
