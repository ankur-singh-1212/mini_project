import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Gauge,
  Layers,
  Users,
} from "lucide-react";
import api from "../services/api";
import { formatMonthLabel } from "../utils/formatMonth";
import PageHeader from "../components/PageHeader";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import { BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Chart tokens tuned for the midnight-navy theme: light grid + axis text for readability.
const CHART_AXIS = "#5B6B84";
const CHART_GRID = "#E6E8EC";
const CHART_TOOLTIP = {
  contentStyle: {
    background: "#FFFFFF",
    border: "1px solid #E6E8EC",
    borderRadius: 10,
    color: "#141B2D",
    fontSize: 12,
  },
  labelStyle: { color: "#141B2D", fontWeight: 600 },
  itemStyle: { color: "#33415C" },
};
const COLORS = ["#4F46E5", "#2E90FA", "#0E9F6E", "#F79009", "#F04438", "#8B5CF6", "#64748B"];

function ChartFrame({ height, hasData, label, children }) {
  return (
    <div style={{ height }}>
      {hasData ? (
        children
      ) : (
        <div className="flex items-center justify-center h-full text-sm text-ink-500">
          No data yet{label ? ` — ${label}` : ""}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get("/admin/analytics")
      .then((r) => setData(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const d = data;
  // Safe defaults: a late, partial or failed response must never crash a chart.
  const monthlyData = d?.monthly || [];
  const statusData = d?.byStatus || [];
  const open = d ? d.total - d.resolved : 0;
  const overdue = d?.overdue || 0;
  const pendingWork = d?.departmentWorkload?.reduce((sum, w) => sum + w.count, 0) || 0;

  if (loading) return <Spinner label="Loading overview…" />;
  if (error || !d) return <EmptyState title="No data yet" description="Analytics data could not be loaded." />;

  const maxDeptLoad = Math.max(1, ...(d.departmentWorkload || []).map((w) => w.count));

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administration"
        title="Operations overview"
        description="Live metrics across complaints, SLA health, and department workload."
        actions={
          <Link to="/admin/complaints" className="btn btn-secondary">
            Manage complaints <ArrowRight size={15} />
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total complaints" value={d.total} icon={Layers} hint="Since platform start" />
        <MetricCard label="Resolved" value={d.resolved} icon={CheckCircle2} tone="success" hint="Closed or resolved" />
        <MetricCard label="Overdue" value={overdue} icon={AlertTriangle} tone="danger" hint="SLA breached" />
        <MetricCard label="Avg. resolution" value={d.avgResolutionHours} icon={Clock} hint="Hours per complaint" />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-6">
        <div className="space-y-6">
          <div className="card card--padded">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Complaint volume</h2>
              <Link to="/admin/analytics" className="text-sm font-medium">Full report <ArrowRight size={13} className="inline" /></Link>
            </div>
            <ChartFrame height={300} hasData={monthlyData.length > 0} label="complaint volume">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                  <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                  <Tooltip {...CHART_TOOLTIP} labelFormatter={formatMonthLabel} cursor={{ fill: "#EEF2FF" }} />
                  <Bar dataKey="count" name="Complaints" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>

          <div className="card card--padded">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Department workload</h2>
              <Link to="/admin/departments" className="text-sm font-medium">Departments <ArrowRight size={13} className="inline" /></Link>
            </div>
            {d.departmentWorkload?.length ? (
              <div className="space-y-3">
                {d.departmentWorkload.map((w) => (
                  <div key={w.department} className="flex items-center gap-3">
                    <span className="w-40 truncate text-sm text-ink-700">{w.department}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-canvas overflow-hidden">
                      <div
                        className="h-2.5 rounded-full bg-brand"
                        style={{ width: `${Math.max(4, (w.count / maxDeptLoad) * 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-medium text-ink-900">{w.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No department workload" />
            )}
          </div>

          <div className="card card--padded">
            <h2 className="section-title mb-4">Complaint status</h2>
            <ChartFrame height={260} hasData={statusData.length > 0} label="complaint status">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={84}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP} />
                </PieChart>
              </ResponsiveContainer>
            </ChartFrame>
            <div className="flex flex-wrap gap-2 mt-3">
              {statusData.map((s, i) => (
                <span key={s.status} className="text-xs text-ink-500 flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  {s.status} · {s.count}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card card--padded space-y-4">
            <h2 className="section-title">Workload</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-500"><Users size={14} /> Open complaints</span>
                <span className="font-medium">{open}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-500"><Gauge size={14} /> Pending workload</span>
                <span className="font-medium">{pendingWork}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-500"><Building2 size={14} /> Departments</span>
                <span className="font-medium">{d.departmentWorkload?.length || 0}</span>
              </div>
            </div>
          </div>

          <div className="card card--padded space-y-4">
            <h2 className="section-title">Quick actions</h2>
            <div className="grid gap-2">
              <Link to="/admin/complaints/unassigned" className="btn btn-secondary justify-start">
                <AlertTriangle size={15} /> Review unassigned complaints
              </Link>
              <Link to="/admin/escalations" className="btn btn-secondary justify-start">
                <Clock size={15} /> SLA & escalation monitoring
              </Link>
              <Link to="/admin/analytics" className="btn btn-secondary justify-start">
                <BarChart3 size={15} /> Open analytics & reports
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
