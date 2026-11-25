import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";

const highlights = [
  {
    icon: Zap,
    title: "AI-assisted triage",
    text: "Category and priority are suggested from your description so the right team picks it up faster.",
  },
  {
    icon: Clock,
    title: "Real SLA deadlines",
    text: "Response and resolution targets are calculated per priority, with at-risk and overdue detection.",
  },
  {
    icon: Bell,
    title: "Live updates",
    text: "Assignments, progress notes, escalations, and resolutions reach you the moment they happen.",
  },
  {
    icon: Building2,
    title: "Department workspaces",
    text: "Agents work only inside their own department, with a queue built around their workload.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by default",
    text: "Complainant identity is visible to administrators only — never to other students or agents.",
  },
  {
    icon: BarChart3,
    title: "Operational analytics",
    text: "Trends, workload, resolution performance, and escalation history are available on demand.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center">
            <ShieldCheck size={17} />
          </div>
          <span className="font-semibold text-ink-900">NexaResolve</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn btn-ghost">Sign in</Link>
          <Link to="/register" className="btn btn-primary">Get started</Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-12">
        <div className="max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-brand mb-3">
            Smart college complaint resolution
          </div>
          <h1 className="text-[34px] md:text-[46px] font-semibold text-ink-900 tracking-tight leading-[1.1]">
            Every issue deserves a faster resolution.
          </h1>
          <p className="mt-5 text-base md:text-lg text-ink-500 leading-relaxed max-w-xl">
            NexaResolve is the college complaint platform where students and faculty report
            issues, administrators route them to departments, and agents resolve them —
            with clear ownership, SLAs, and full visibility.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn btn-primary px-5 py-2.5">
              Create an account <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-secondary px-5 py-2.5">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-6 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {highlights.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-5">
              <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-4">
                <Icon size={18} />
              </div>
              <div className="font-semibold text-ink-900">{title}</div>
              <div className="text-sm text-ink-500 mt-1.5 leading-relaxed">{text}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-4 md:px-6 pb-10 border-t border-edge flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm text-ink-500">
        <span>NexaResolve · Report Smart. Resolve Faster.</span>
        <span className="text-xs">Built for college communities.</span>
      </footer>
    </div>
  );
}
