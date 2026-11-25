import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";

export default function UnassignedComplaints() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/complaints?limit=100&sort=-createdAt")
      .then((r) => {
        const rows = (r.data.data || []).filter(
          (c) => !c.assignedAgent && !["Resolved", "Closed"].includes(c.status)
        );
        setItems(rows);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administration"
        title="Unassigned complaints"
        description="Complaints waiting for an agent, including low-confidence classifications flagged for admin review."
      />

      {loading ? (
        <div className="card"><Spinner label="Loading…" /></div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            title="All caught up"
            description="There are no complaints waiting for assignment."
          />
        </div>
      ) : (
        <div className="card card--padded mt-6 divide-y divide-edge">
          {items.map((c) => (
            <Link
              key={c._id}
              to={`/complaints/${c._id}`}
              className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 -mx-2 px-2 rounded-lg hover:bg-canvas/70 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-brand">{c.complaintId}</span>
                  {c.needsReview && <span className="badge badge-warning">Needs review</span>}
                </div>
                <div className="font-medium text-ink-900 truncate mt-1">{c.title}</div>
                <div className="text-xs text-ink-500 mt-1">{c.category}</div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={c.priority} />
                  <StatusBadge status={c.status} />
                </div>
                <span className="text-xs text-ink-500">
                  <UserPlus size={12} className="inline mr-1" />
                  Needs an agent
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
