import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Search } from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";

const STATUSES = [
  "Submitted",
  "Under Review",
  "Assigned",
  "In Progress",
  "Awaiting User",
  "Resolved",
  "Closed",
  "Reopened",
];
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

export default function ComplaintManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [departments, setDepartments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    category: "",
    priority: "",
    department: "",
    from: "",
    to: "",
    sort: "-createdAt",
    page: 1,
  });
  const { push } = useToast();

  useEffect(() => {
    api.get("/departments").then((r) => setDepartments(r.data.data || [])).catch(() => {});
    api
      .get("/admin/users?role=agent&limit=100")
      .then((r) => setAgents(r.data.data || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      const r = await api.get(`/complaints?${params.toString()}`);
      setData(r.data.data || []);
      setPagination(r.data.pagination || { page: 1, pages: 1 });
    } catch (err) {
      push({ type: "error", title: "Failed to load", message: err.response?.data?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.status, filters.category, filters.priority, filters.department, filters.sort]);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const resetFilters = () =>
    setFilters({ q: "", status: "", category: "", priority: "", department: "", from: "", to: "", sort: "-createdAt", page: 1 });

  const assign = async (c, agentId) => {
    try {
      await api.post(`/complaints/${c._id}/assign`, { agentId: agentId || null });
      push({ type: "success", title: "Assignment updated" });
      load();
    } catch (err) {
      push({ type: "error", title: "Assignment failed", message: err.response?.data?.message });
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administration"
        title="All complaints"
        description="Search, filter, assign, and monitor every complaint in the system."
      />

      <div className="card card--padded">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[2fr_repeat(6,1fr)_auto] gap-3 items-end">
          <div className="md:col-span-2">
            <label className="label mb-2 block" htmlFor="q">Search</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                id="q"
                className="input pl-9"
                placeholder="Title, description, or reference"
                value={filters.q}
                onChange={(e) => setFilter("q", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="status">Status</label>
            <select id="status" className="select" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="category">Category</label>
            <select id="category" className="select" value={filters.category} onChange={(e) => setFilter("category", e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="priority">Priority</label>
            <select id="priority" className="select" value={filters.priority} onChange={(e) => setFilter("priority", e.target.value)}>
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="department">Department</label>
            <select id="department" className="select" value={filters.department} onChange={(e) => setFilter("department", e.target.value)}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="from">Created from</label>
            <input id="from" type="date" className="input" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="to">Created to</label>
            <input id="to" type="date" className="input" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="sort">Sort by</label>
            <select id="sort" className="select" value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
              <option value="-createdAt">Newest</option>
              <option value="createdAt">Oldest</option>
              <option value="-updatedAt">Recently updated</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" onClick={resetFilters}>
              <RotateCcw size={14} /> Reset
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => load()}
              aria-label="Apply filters"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card mt-6"><Spinner label="Loading complaints…" /></div>
      ) : data.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            title="No complaints match"
            description="Adjust the filters or create a new complaint."
          />
        </div>
      ) : (
        <div className="card card--padded mt-6 divide-y divide-edge">
          {data.map((c) => (
            <div key={c._id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/complaints/${c._id}`} className="text-sm font-medium text-brand">
                      {c.complaintId}
                    </Link>
                    {c.isEscalated && <span className="badge badge-danger">Escalated</span>}
                    {c.slaStatus === "Breached" && !c.isEscalated && (
                      <span className="badge badge-danger">Breached</span>
                    )}
                    {c.slaStatus === "At Risk" && <span className="badge badge-warning">At risk</span>}
                  </div>
                  <div className="font-medium text-ink-900 truncate mt-1">{c.title}</div>
                  <div className="text-xs text-ink-500 mt-1 flex flex-wrap gap-x-3">
                    <span>{c.category}</span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    <span>Updated {new Date(c.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 xl:items-end">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    <PriorityBadge priority={c.priority} />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-ink-500">Agent:</span>
                    <select
                      className="select py-1 text-xs"
                      value={c.assignedAgent?._id || ""}
                      onChange={(e) => assign(c, e.target.value)}
                      aria-label={`Assign ${c.complaintId}`}
                    >
                      <option value="">Unassigned</option>
                      {agents.map((a) => (
                        <option key={a._id} value={a._id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={pagination.page}
        pages={pagination.pages}
        onChange={(p) => setFilters({ ...filters, page: p })}
      />
    </div>
  );
}
