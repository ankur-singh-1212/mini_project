import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useSubmit } from "../hooks/useSubmit";
import { AuthScreen } from "./Login";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const { submitting, slowHint, submit } = useSubmit(async () => {
    setError("");
    if (name.trim().length < 2) {
      setError("Enter your full name (at least 2 characters).");
      return;
    }
    if (password.length < 6) {
      setError("Use a password of at least 6 characters.");
      return;
    }
    try {
      await register(name.trim(), email.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      const data = err.response?.data;
      const detail = formatRegisterError(data);
      setError(detail);
      push({ type: "error", title: "Registration failed", message: detail });
    }
  });

  return (
    <AuthScreen>
      <div className="card p-6 md:p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center">
            <GraduationCap size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink-900 leading-tight">Create account</h1>
            <p className="text-sm text-ink-500">Join your college workspace.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="label mb-2 block" htmlFor="name">Full name</label>
            <input
              id="name"
              className="input"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
            />
            <p className="text-xs text-ink-500 mt-1">At least 2 characters.</p>
          </div>
          <div>
            <label className="label mb-2 block" htmlFor="email">College email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label" htmlFor="password">Password</label>
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="text-xs text-brand font-medium hover:underline"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="password"
              className="input"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <p className="text-xs text-ink-500 mt-1">Use at least 6 characters.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-sm text-danger-600" role="alert">
              {error}
            </div>
          )}

          <button className="btn btn-primary w-full" type="submit" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {submitting ? "Please wait…" : "Create account"}
          </button>
          {slowHint && <p className="text-xs text-warning-600 -mt-1">Server start ho raha hai, thoda ruko…</p>}
        </form>

        <p className="text-sm text-ink-500 mt-5">
          Already registered? <Link to="/login" className="text-brand font-medium">Sign in</Link>
        </p>
      </div>
    </AuthScreen>
  );
}

// Turn backend validation errors (including zod field errors) into a readable message.
function formatRegisterError(data) {
  const fallback = data?.message || "Registration failed. Please check the entered details.";
  const errors = data?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return fallback;
  const parts = errors.map((e) => {
    const field = e.path?.join(".");
    const issue = e.message || e.code || "invalid";
    return field ? `${field}: ${issue}` : issue;
  });
  return parts.length ? parts.join(" ") : fallback;
}
