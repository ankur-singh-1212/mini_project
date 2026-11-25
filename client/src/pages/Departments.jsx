import { useEffect, useState } from "react";
import { Building2, PlusCircle, Trash2 } from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import { useSubmit } from "../hooks/useSubmit";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";

export default function Departments() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/departments");
      setData(r.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const { submitting: creating, slowHint, submit: create } = useSubmit(async () => {
    if (!name.trim()) return;
    try {
      await api.post("/admin/departments", { name: name.trim(), description: description.trim() });
      push({ type: "success", title: "Department created" });
      setName("");
      setDescription("");
      load();
    } catch (err) {
      push({ type: "error", title: "Failed", message: err.response?.data?.message });
    }
  });

  const { submitting: removing, submit: remove } = useSubmit(async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/admin/departments/${toDelete}`);
      push({ type: "success", title: "Department removed" });
      setToDelete(null);
      load();
    } catch (err) {
      push({ type: "error", title: "Failed", message: err.response?.data?.message });
    }
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administration"
        title="Departments"
        description="Departments available for complaint routing and assignment."
      />

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="card card--padded h-fit">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <PlusCircle size={16} className="text-brand" /> New department
          </h2>
          <form onSubmit={create} className="space-y-3">
            <div>
              <label className="label mb-2 block" htmlFor="name">Name</label>
              <input
                id="name"
                className="input"
                placeholder="e.g. Computer Science"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label mb-2 block" htmlFor="description">Description</label>
              <input
                id="description"
                className="input"
                placeholder="Optional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <button className="btn btn-primary w-full" type="submit" disabled={creating}>
              {creating ? "Please wait…" : "Create department"}
            </button>
          </form>
          {slowHint && <p className="text-xs text-warning-600">Server start ho raha hai, thoda ruko…</p>}
        </div>

        <div className="card card--padded">
          {loading ? (
            <Spinner label="Loading departments…" />
          ) : data.length === 0 ? (
            <EmptyState title="No departments" description="Create the first department." />
          ) : (
            <div className="divide-y divide-edge">
              {data.map((d) => (
                <div key={d._id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 size={15} className="text-brand shrink-0" />
                      <span className="text-sm font-medium text-ink-900">{d.name}</span>
                    </div>
                    <div className="text-sm text-ink-500 mt-0.5">{d.description || "No description."}</div>
                  </div>
                  <button
                    className="btn btn-danger-soft btn-sm self-start"
                    onClick={() => setToDelete(d)}
                    disabled={removing}
                  >
                    <Trash2 size={14} /> {removing ? "Please wait…" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Remove department"
        description="Removed departments keep existing complaints but stop receiving new assignments."
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setToDelete(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={remove}>Remove department</button>
          </>
        }
      >
        <p className="text-sm text-ink-700">
          Are you sure you want to remove this department?
        </p>
      </Modal>
    </div>
  );
}
