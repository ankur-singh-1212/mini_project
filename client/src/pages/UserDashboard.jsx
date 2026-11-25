import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Clock,
  ListTodo,
  MessageSquare,
  PlusCircle,
  Search,
  Zap,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import { ComplaintRow } from "../components/ComplaintRow";
import { NotificationItem } from "../components/NotificationItem";

const TABS = [
  { value: "", label: "All", match: () => true },
  { value: "open", label: "Open", match: (c) => !["Resolved", "Closed"].includes(c.status) },
  { value: "awaiting", label: "Awaiting response", match: (c) => c.status === "Awaiting User" },
  { value: "resolved", label: "Resolved", match: (c) => ["Resolved", "Closed"].includes(c.status) },
];

export default function UserDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const { push } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("");
  const [q, setQ] = useState("");
  const [limit] = useState(50);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (q.trim()) params.set("q", q.trim());
      const r = await api.get(`/complaints?${params.toString()}`);
      setComplaints(r.data.data || []);
      const n = await api.get("/notifications?limit=20").catch(() => null);
      setNotifications(n?.data?.data || []);
    } catch (err) {
      push({ type: "error", title: "Failed to load", message: err.response?.data?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, q]);

  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => load();
    socket.on("notification:new", refresh);
    return () => socket.off("notification:new", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const stats = useMemo(() => computeStats(complaints), [complaints]);
  const visible = useMemo(() => {
    const t = TABS.find((x) => x.value === tab) || TABS[0];
    return complaints.filter(t.match);
  }, [complaints, tab]);

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="page">
      <PageHeader
        eyebrow="Student workspace"
        title={`Welcome back, ${firstName}`}
        description="Track every complaint you have raised and see what the support team is doing."
        actions={
          <Link to="/complaints/new" className="btn btn-primary">
            <PlusCircle size={16} /> Submit complaint
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total complaints"
          value={stats.total}
          icon={ListTodo}
          hint="Submitted by you"
        />
        <MetricCard
          label="Open"
          value={stats.open}
          icon={MessageSquare}
          tone="warning"
          hint="Awaiting assignment or progress"
        />
        <MetricCard
          label="Awaiting response"
          value={stats.awaiting}
          icon={Clock}
          tone="info"
          hint={stats.awaiting === 1 ? "Needs your response" : "Needs a response"}
        />
        <MetricCard
          label="Resolved"
          value={stats.resolved}
          icon={CheckCircle2}
          tone="success"
          hint="Completed by the team"
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 mt-6">
        <div className="space-y-6">
          <div className="card card--flush">
            <div className="p-5 border-b border-edge">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="section-title">Your complaints</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                    <input
                      className="input pl-9 pr-3 py-1.5 text-sm w-56"
                      placeholder="Search your complaints"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-b border-edge flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={`btn btn-sm ${tab === t.value ? "btn-primary" : "btn-secondary"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {loading ? (
                <Spinner label="Loading your complaints…" />
              ) : visible.length === 0 ? (
                <EmptyState
                  title="No complaints here"
                  description="Create a complaint to start tracking it here."
                  action={
                    <Link to="/complaints/new" className="btn btn-primary">
                      <PlusCircle size={16} /> Submit complaint
                    </Link>
                  }
                />
              ) : (
                <div className="divide-y divide-edge">
                  {visible.slice(0, 10).map((c) => (
                    <ComplaintRow key={c._id} complaint={c} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2">
                <Bell size={16} className="text-brand" /> Notifications
              </h2>
              <Link to="/notifications" className="text-xs font-medium">View all</Link>
            </div>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-sm text-ink-500 flex items-start gap-2">
                  <Zap size={15} className="mt-0.5 text-ink-300 shrink-0" />
                  You're all caught up. Updates about your complaints will appear here.
                </div>
              ) : (
                notifications.slice(0, 5).map((n) => <NotificationItem key={n._id} notification={n} />)
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="section-title mb-4">SLA snapshot</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">On track</span>
                <span className="font-medium">{stats.onTrack}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">At risk</span>
                <span className={`font-medium ${stats.atRisk > 0 ? "text-warning-600" : ""}`}>{stats.atRisk}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Breached</span>
                <span className={`font-medium ${stats.breached > 0 ? "text-danger-600" : ""}`}>{stats.breached}</span>
              </div>
            </div>
            <Link to="/complaints" className="btn btn-secondary w-full mt-4">
              Track all my complaints
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function computeStats(items) {
  const total = items.length;
  const open = items.filter((c) => !["Resolved", "Closed"].includes(c.status)).length;
  const awaiting = items.filter((c) => c.status === "Awaiting User").length;
  const resolved = items.filter((c) => ["Resolved", "Closed"].includes(c.status)).length;
  const onTrack = items.filter((c) => c.slaStatus === "On Track" && !["Resolved", "Closed"].includes(c.status)).length;
  const atRisk = items.filter((c) => c.slaStatus === "At Risk" && !["Resolved", "Closed"].includes(c.status)).length;
  const breached = items.filter((c) => c.slaStatus === "Breached").length;
  return { total, open, awaiting, resolved, onTrack, atRisk, breached };
}
