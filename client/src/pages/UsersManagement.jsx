import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, UserPlus } from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";

const ROLES = ["user", "agent", "admin"];

export default function UsersManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: "20" });
      if (q.trim()) params.set("q", q.trim());
      if (roleFilter) params.set("role", roleFilter);
      const r = await api.get(`/admin/users?${params.toString()}`);
      setData(r.data.data || []);
      setPagination(r.data.pagination || { page: 1, pages: r.data.pagination?.pages || 1 });
    } catch (err) {
      push({ type: "error", title: "Failed to load", message: err.response?.data?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, roleFilter]);

  const changeRole = async (userId, role) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      push({ type: "success", title: "Role updated" });
      load();
    } catch (err) {
      push({ type: "error", title: "Role update failed", message: err.response?.data?.message });
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administration"
        title="User management"
        description="Review accounts and assign roles. Emails are visible to administrators only."
      />

      <div className="card card--padded">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="label mb-2 block" htmlFor="q">Search</label>
            <input
              id="q"
              className="input"
              placeholder="Name or email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="role">Role</label>
            <select
              id="role"
              className="select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-secondary mb-10"
            onClick={() => setQ("")}
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card mt-6"><Spinner label="Loading users…" /></div>
      ) : data.length === 0 ? (
        <div className="card mt-6">
          <EmptyState title="No users found" />
        </div>
      ) : (
        <div className="card card--padded mt-6 divide-y divide-edge">
          {data.map((u) => (
            <div key={u._id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-semibold shrink-0">
                    {u.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink-900 truncate">{u.name}</div>
                    <div className="text-xs text-ink-500 truncate">{u.email}</div>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <span className="badge badge-neutral capitalize">{u.role}</span>
                  {u.isActive === false && <span className="badge badge-danger">Disabled</span>}
                  <select
                    className="select py-1 text-xs w-32"
                    value={u.role}
                    onChange={(e) => changeRole(u._id, e.target.value)}
                    aria-label={`Change role for ${u.name}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={pagination.page}
        pages={pagination.pages}
        onChange={(p) => setPagination({ ...pagination, page: p })}
      />
    </div>
  );
}
