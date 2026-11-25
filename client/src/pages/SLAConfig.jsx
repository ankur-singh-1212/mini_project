import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";

export default function SLAConfig() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/sla");
      setRows(r.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (row) => {
    try {
      await api.patch(`/admin/sla/${row.priority}`, {
        responseMinutes: row.responseMinutes,
        resolutionMinutes: row.resolutionMinutes,
        escalationEnabled: row.escalationEnabled,
      });
      push({ type: "success", title: "SLA saved", message: row.priority });
    } catch (err) {
      push({
        type: "error",
        title: "Failed",
        message: err.response?.data?.message || "Please try again.",
      });
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administration"
        title="SLA settings"
        description="Response and resolution targets per priority. Targets use calendar minutes."
      />

      {loading ? (
        <div className="card"><Spinner label="Loading SLA configuration…" /></div>
      ) : (
        <div className="card card--padded mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Priority</th>
                <th className="w-40">Response (minutes)</th>
                <th className="w-40">Resolution (minutes)</th>
                <th className="w-40">Escalation</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.priority}>
                  <td className="font-medium text-ink-900 py-3">{r.priority}</td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={r.responseMinutes}
                      onChange={(e) =>
                        setRows((rs) =>
                          rs.map((x) =>
                            x.priority === r.priority
                              ? { ...x, responseMinutes: Number(e.target.value) }
                              : x
                          )
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={r.resolutionMinutes}
                      onChange={(e) =>
                        setRows((rs) =>
                          rs.map((x) =>
                            x.priority === r.priority
                              ? { ...x, resolutionMinutes: Number(e.target.value) }
                              : x
                          )
                        )
                      }
                    />
                  </td>
                  <td>
                    <label className="flex items-center gap-2 text-sm text-ink-600">
                      <input
                        type="checkbox"
                        checked={r.escalationEnabled}
                        onChange={(e) =>
                          setRows((rs) =>
                            rs.map((x) =>
                              x.priority === r.priority
                                ? { ...x, escalationEnabled: e.target.checked }
                                : x
                            )
                          )
                        }
                        className="accent-brand"
                      />
                      Enable
                    </label>
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => save(r)}>
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-ink-500 mt-4 flex items-center gap-2">
            <Settings2 size={13} /> Changes apply to newly created complaints immediately.
          </p>
        </div>
      )}
    </div>
  );
}
