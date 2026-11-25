import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import { NotificationItem } from "../components/NotificationItem";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/notifications?page=${page}&limit=20`);
      setItems(r.data.data || []);
      setUnreadCount(r.data.unreadCount || 0);
      setPages(r.data.pagination?.pages || 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    load();
  };

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    push({ type: "success", title: "Notifications cleared" });
    load();
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Account"
        title="Notifications"
        description={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
        actions={
          unreadCount > 0 ? (
            <button className="btn btn-secondary" onClick={markAllRead}>
              <CheckCheck size={15} /> Mark all read
            </button>
          ) : null
        }
      />

      {loading ? (
        <div className="card"><Spinner label="Loading notifications…" /></div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={BellOff}
            title="No notifications"
            description="Assignments, status changes, and SLA alerts for you will appear here."
          />
        </div>
      ) : (
        <div className="card card--padded mt-6 divide-y divide-edge">
          {items.map((n) => (
            <div key={n._id} className={`py-3 first:pt-0 last:pb-0 ${n.read ? "opacity-70" : ""}`}>
              <NotificationItem notification={n} />
              {!n.read && (
                <button
                  className="btn btn-ghost btn-sm mt-2"
                  onClick={() => markRead(n._id)}
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} pages={pages} onChange={setPage} />
    </div>
  );
}
