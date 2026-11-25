import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListTodo, PlusCircle, RotateCcw, Search } from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import { ComplaintRow } from "../components/ComplaintRow";

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

export default function MyComplaints() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    category: "",
    priority: "",
    sort: "-createdAt",
    page: 1,
  });
  const { push } = useToast();

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
  }, [filters.page, filters.status, filters.category, filters.priority, filters.sort]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  const resetFilters = () =>
    setFilters({ q: "", status: "", category: "", priority: "", sort: "-createdAt", page: 1 });

  return (
    <div className="page">
      <PageHeader
        eyebrow="Tracking"
        title="My complaints"
        description="Every complaint you have submitted, with live status and SLA information."
        actions={
          <Link to="/complaints/new" className="btn btn-primary">
            <PlusCircle size={16} /> New complaint
          </Link>
        }
      />

      <div className="card card--padded">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="label mb-2 block" htmlFor="q">Search</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                id="q"
                className="input pl-9"
                placeholder="Search by title or reference"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })}
              />
            </div>
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="status">Status</label>
            <select
              id="status"
              className="select"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="category">Category</label>
            <select
              id="category"
              className="select"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="priority">Priority</label>
            <select
              id="priority"
              className="select"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: 1 })}
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="sort">Sort</label>
            <select
              id="sort"
              className="select"
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value, page: 1 })}
            >
              <option value="-createdAt">Newest first</option>
              <option value="createdAt">Oldest first</option>
              <option value="-updatedAt">Recently updated</option>
            </select>
          </div>
          <button type="button" className="btn btn-secondary mb-10" onClick={resetFilters}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card mt-6"><Spinner label="Loading complaints…" /></div>
      ) : data.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            icon={ListTodo}
            title="No complaints found"
            description="Adjust your filters, or submit a new complaint."
            action={
              <Link to="/complaints/new" className="btn btn-primary">
                <PlusCircle size={16} /> Submit complaint
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card card--padded mt-6 divide-y divide-edge">
          {data.map((c) => (
            <ComplaintRow key={c._id} complaint={c} />
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
