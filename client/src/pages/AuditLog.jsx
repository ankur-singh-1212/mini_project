import { useEffect, useState } from "react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";

export default function AuditLog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: "20" });
      const r = await api.get(`/admin/audit?${params.toString()}`);
      setItems(r.data.data || []);
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
  }, [pagination.page]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administration"
        title="Audit log"
        description="Administrative actions recorded across the platform."
      />

      {loading ? (
        <div className="card"><Spinner label="Loading audit log…" /></div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState title="No audit entries" description="Administrative actions will appear here." />
        </div>
      ) : (
        <div className="card card--padded mt-6 divide-y divide-edge">
          {items.map((entry) => (
            <div key={entry._id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="badge badge-primary">{entry.action}</span>
                <span className="text-sm text-ink-700">{entry.entityType}</span>
                <span className="text-xs text-ink-500 sm:ml-auto">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-ink-500 mt-1">
                Actor: {entry.actor?.name || "system"} · IP {entry.ip || "—"}
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
