import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, Loader2, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { homePathFor } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const DEMO_ACCOUNTS = [
  { email: "admin@nexaresolve.dev", password: "Password123!", role: "Administrator" },
  { email: "agent1@nexaresolve.dev", password: "Password123!", role: "Agent" },
  { email: "user1@nexaresolve.dev", password: "Password123!", role: "Student" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your college email and password.");
      return;
    }
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      push({ type: "success", title: "Welcome back" });
      navigate(homePathFor(user), { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || "Sign in failed. Please try again.";
      setError(msg);
      push({ type: "error", title: "Sign in failed", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <div className="card p-6 md:p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center">
            <GraduationCap size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink-900 leading-tight">Sign in</h1>
            <p className="text-sm text-ink-500">Access your college workspace.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
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
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-sm text-danger-600" role="alert">
              {error}
            </div>
          )}

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-ink-500 mt-5">
          New to NexaResolve?{" "}
          <Link to="/register" className="text-brand font-medium">Create an account</Link>
        </p>
      </div>

      <div className="card p-5 mt-6">
        <div className="label mb-3">Demo accounts</div>
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map((d) => (
            <button
              key={d.email}
              type="button"
              className="w-full text-left rounded-lg border border-edge px-3 py-2 hover:bg-canvas transition-colors"
              onClick={() => {
                setEmail(d.email);
                setPassword(d.password);
                setError("");
              }}
            >
              <div className="text-sm font-medium text-ink-900">{d.role}</div>
              <div className="text-xs text-ink-500">{d.email}</div>
            </button>
          ))}
        </div>
      </div>
    </AuthScreen>
  );
}

export function AuthScreen({ children }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center">
            <GraduationCap size={18} />
          </div>
          <span className="font-semibold text-ink-900">NexaResolve</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
