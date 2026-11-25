import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import api from "../services/api";
import { formatMonthLabel } from "../utils/formatMonth";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = ["#4F46E5", "#2E90FA", "#0E9F6E", "#F79009", "#F04438", "#8B5CF6", "#64748B", "#0EA5E9"];
const CHART_HEIGHT = 280;
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

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    Promise.all([
      api.get(`/admin/analytics?${params.toString()}`).then((r) => r.data.data),
      api.get("/complaints?limit=300").then((r) => r.data.data || []),
      api.get("/admin/escalations").then((r) => r.data.data || []),
    ]).then(([analytics, all, esc]) => {
      setData(analytics);
      setComplaints(all);
      setEscalations(esc);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [from, to]);

  const byStatus = data?.byStatus || [];
  const byCategory = data?.byCategory || [];
  const byPriority = data?.byPriority || [];
  const monthly = data?.monthly || [];
  const departmentWorkload = data?.departmentWorkload || [];
  const agentWorkload = data?.agentWorkload || [];

  const resolutionSplit = useMemo(() => {
    const resolved = complaints.filter(
      (c) => c.resolvedAt && ["Resolved", "Closed"].includes(c.status)
    );
    const onTime = [];
    const late = [];
    for (const c of resolved) {
      const due = c.dueDate ? new Date(c.dueDate).getTime() : null;
      if (due && new Date(c.resolvedAt).getTime() > due) late.push(c);
      else onTime.push(c);
    }
    return {
      onTime: onTime.length,
      late: late.length,
      avgHours:
        resolved.length === 0
          ? null
          : Math.round(
              resolved.reduce((s, c) => s + (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime()), 0) /
                resolved.length /
                3600000,
              0
            ),
    };
  }, [complaints]);

  const escalationFrequency = useMemo(() => {
    const counts = new Map();
    for (const c of escalations) {
      const level = c.escalationHistory?.length || 0;
      counts.set(c.complaintId, (counts.get(c.complaintId) || 0) + level);
    }
    return [...counts.entries()].map(([id, count]) => ({ id, count }));
  }, [escalations]);

  if (loading || !data) return <Spinner label="Loading analytics…" />;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administration"
        title="Analytics & reports"
        description="Complaint trends, category and status distribution, resolution performance, and escalations."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              className="input w-auto"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
            />
            <input
              type="date"
              className="input w-auto"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
            />
            <button className="btn btn-secondary" onClick={() => { setFrom(""); setTo(""); }}>
              Reset
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="label">Total complaints</div>
          <div className="metric-value mt-3">{data.total}</div>
          <div className="text-xs text-ink-500 mt-2">In selected period</div>
        </div>
        <div className="card p-5">
          <div className="label">Resolved</div>
          <div className="metric-value mt-3">{data.resolved}</div>
          <div className="text-xs text-ink-500 mt-2">Resolved or closed</div>
        </div>
        <div className="card p-5">
          <div className="label">Overdue</div>
          <div className="metric-value mt-3 text-danger-600">{data.overdue}</div>
          <div className="text-xs text-ink-500 mt-2">SLA breached</div>
        </div>
        <div className="card p-5">
          <div className="label">Avg. resolution time</div>
          <div className="metric-value mt-3">
            {data.avgResolutionHours === null ? "—" : `${data.avgResolutionHours}h`}
          </div>
          <div className="text-xs text-ink-500 mt-2">Per resolved complaint</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <ChartCard title="Complaint trends (last 6 months)" chart hasData={monthly.length > 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E8EC" />
              <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fontSize: 11, fill: "#5B6B84" }} />
              <YAxis tick={{ fontSize: 11, fill: "#5B6B84" }} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP} labelFormatter={formatMonthLabel} />
              <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Complaint category distribution" chart hasData={byCategory.length > 0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byCategory} dataKey="count" nameKey="category" innerRadius={52} outerRadius={84} paddingAngle={2}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <ChartCard title="Status distribution" chart hasData={byStatus.length > 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStatus.map((s) => ({ ...s, name: s.status }))} margin={{ top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E8EC" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5B6B84" }} />
              <YAxis tick={{ fontSize: 11, fill: "#5B6B84" }} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="count" fill="#2E90FA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Priority distribution" chart hasData={byPriority.length > 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byPriority} margin={{ top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E8EC" />
              <XAxis dataKey="priority" tick={{ fontSize: 10, fill: "#5B6B84" }} />
              <YAxis tick={{ fontSize: 11, fill: "#5B6B84" }} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {byPriority.map((p, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <ChartCard title="Department workload" chart hasData={departmentWorkload.length > 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentWorkload.map((w) => ({ ...w, department: w.department }))} layout="vertical" margin={{ top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E6E8EC" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#5B6B84" }} allowDecimals={false} />
              <YAxis type="category" dataKey="department" width={140} tick={{ fontSize: 11, fill: "#5B6B84" }} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {departmentWorkload.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Agent workload" chart hasData={agentWorkload.length > 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agentWorkload.map((w) => ({ ...w, agent: w.agent }))} layout="vertical" margin={{ top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E6E8EC" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#5B6B84" }} allowDecimals={false} />
              <YAxis type="category" dataKey="agent" width={140} tick={{ fontSize: 11, fill: "#5B6B84" }} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {agentWorkload.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <ChartCard title="Resolution performance">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <div className="label">Resolved on time</div>
                <div className="metric-value text-success-600">{resolutionSplit.onTime}</div>
              </div>
              <div>
                <div className="label">Resolved late</div>
                <div className="metric-value text-danger-600">{resolutionSplit.late}</div>
              </div>
              <div>
                <div className="label">Average resolution time</div>
                <div className="metric-value">{resolutionSplit.avgHours === null ? "—" : `${resolutionSplit.avgHours}h`}</div>
              </div>
            </div>
            <p className="text-xs text-ink-500">
              “Late” means the resolution happened after the complaint’s SLA deadline.
            </p>
          </div>
        </ChartCard>

        <ChartCard title="Escalation frequency" chart>
          {escalationFrequency.length === 0 ? (
            <EmptyState title="No escalations" description="Escalation events will appear here." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={escalationFrequency} margin={{ top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E8EC" />
                <XAxis dataKey="id" tick={{ fontSize: 10, fill: "#5B6B84" }} />
                <YAxis tick={{ fontSize: 11, fill: "#5B6B84" }} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="count" fill="#F04438" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <p className="text-xs text-ink-500 mt-4 flex items-center gap-2">
        <TrendingUp size={13} /> All figures are computed from live complaint records.
      </p>
    </div>
  );
}

function ChartCard({ title, children, chart = false, hasData = true }) {
  return (
    <div className="card card--padded">
      <h2 className="section-title mb-4">{title}</h2>
      {chart ? (
        <div style={{ height: CHART_HEIGHT }}>
          {hasData ? (
            children
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-ink-500">No data yet</div>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
