import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import { useToast } from "../context/ToastContext";
import { useSubmit } from "../hooks/useSubmit";

export default function Profile() {
  const { user, refresh } = useAuth();
  const { push } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [error, setError] = useState("");

  const { submitting, slowHint, submit: save } = useSubmit(async () => {
    setError("");
    try {
      await api.patch("/auth/me", { name, phone });
      await refresh();
      push({ type: "success", title: "Profile updated" });
    } catch (err) {
      const msg = err.response?.data?.message || "Could not save changes.";
      setError(msg);
      push({ type: "error", title: "Profile not updated", message: msg });
    }
  });

  return (
    <div className="page">
      <PageHeader title="Profile" description="Update your personal information." />
      <form onSubmit={save} className="card p-6 space-y-4 max-w-lg">
        <div>
          <label className="label mb-2 block">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label mb-2 block" htmlFor="phone">Phone</label>
          <input
            id="phone"
            className="input"
            autoComplete="tel"
            placeholder="+1 555 010 2030"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="text-sm text-ink-500">
          Signed in as {user?.email} · {user?.role}
        </div>
        {error && (
          <div className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-sm text-danger-600" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Please wait…" : "Save changes"}
        </button>
        {slowHint && <p className="text-xs text-warning-600">Server start ho raha hai, thoda ruko…</p>}
      </form>
    </div>
  );
}
