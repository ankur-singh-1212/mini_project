import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ImagePlus, Loader2, Send } from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import { useSubmit } from "../hooks/useSubmit";
import PageHeader from "../components/PageHeader";

export default function CreateComplaint() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const { push } = useToast();
  const navigate = useNavigate();

  const { submitting, slowHint, submit } = useSubmit(async () => {
    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("description", description.trim());
    files.forEach((f) => fd.append("attachments", f));
    const r = await api.post("/complaints", fd, { headers: { "Content-Type": "multipart/form-data" } });
    push({
      type: "success",
      title: "Complaint submitted",
      message: `${r.data.complaint.complaintId} has been received.`,
    });
    navigate(`/complaints/${r.data.complaint._id}`);
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="New complaint"
        title="Submit a complaint"
        description="Describe the issue clearly. Category, priority, department and the assigned agent are selected automatically."
      />

      <form onSubmit={submit} className="max-w-3xl">
        <div className="card card--padded space-y-5">
          <div>
            <label className="label mb-2 block" htmlFor="title">Title</label>
            <input
              id="title"
              className="input"
              placeholder="Short, descriptive summary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={5}
              maxLength={150}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-ink-500">At least 5 characters.</span>
              <span className="text-xs text-ink-500">{title.length}/150</span>
            </div>
          </div>

          <div>
            <label className="label mb-2 block" htmlFor="description">Description</label>
            <textarea
              id="description"
              className="textarea"
              rows={6}
              placeholder="Describe the problem, its impact, and anything a team should know."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
              maxLength={5000}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-ink-500">At least 10 characters.</span>
              <span className="text-xs text-ink-500">{description.length}/5000</span>
            </div>
          </div>

          <div>
            <label className="label mb-2 block" htmlFor="attachments">Evidence (optional)</label>
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-edge rounded-xl p-6 cursor-pointer hover:bg-canvas/60 transition-colors">
              <ImagePlus size={22} className="text-ink-300" />
              <span className="text-sm text-ink-500">Select up to 5 images (max 5MB each)</span>
              <input
                id="attachments"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const picked = Array.from(e.target.files || []);
                  setFiles(picked.slice(0, 5));
                }}
              />
            </label>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-edge px-3 py-2 text-sm">
                    <span className="truncate text-ink-700">{f.name}</span>
                    <button
                      type="button"
                      className="text-xs text-danger-600 hover:underline"
                      onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-edge bg-canvas/50 p-4 text-sm text-ink-500">
            The right department and an available agent are assigned automatically after you submit. An administrator can review or change them if needed.
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-edge">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              {submitting ? "Please wait…" : "Submit complaint"}
            </button>
            <Link to="/dashboard" className="btn btn-secondary">Cancel</Link>
          </div>
          {slowHint && <p className="text-xs text-warning-600">Server start ho raha hai, thoda ruko…</p>}
        </div>
      </form>
    </div>
  );
}
