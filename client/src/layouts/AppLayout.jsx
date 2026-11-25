import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  PlusCircle,
  Bell,
  Users,
  Building2,
  Gauge,
  ScrollText,
  BarChart3,
  Settings,
  UserRound,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import api from "../services/api";

const groupsByRole = {
  user: [
    {
      label: "Workspace",
      items: [
        { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
        { to: "/complaints", label: "My Complaints", icon: ListTodo },
        { to: "/complaints/new", label: "Submit Complaint", icon: PlusCircle },
      ],
    },
    {
      label: "Account",
      items: [
        { to: "/notifications", label: "Notifications", icon: Bell },
        { to: "/profile", label: "Profile", icon: UserRound },
      ],
    },
  ],
  agent: [
    {
      label: "Workspace",
      items: [
        { to: "/agent", label: "Department Workspace", icon: LayoutDashboard },
        { to: "/complaints", label: "My Assignments", icon: ListTodo },
      ],
    },
    {
      label: "Account",
      items: [
        { to: "/notifications", label: "Notifications", icon: Bell },
        { to: "/profile", label: "Profile", icon: UserRound },
      ],
    },
  ],
  admin: [
    {
      label: "Operations",
      items: [
        { to: "/admin", label: "Overview", icon: LayoutDashboard },
        { to: "/admin/complaints", label: "All Complaints", icon: ListTodo },
        { to: "/admin/complaints/unassigned", label: "Unassigned", icon: Gauge },
        { to: "/admin/escalations", label: "SLA & Escalations", icon: Gauge },
      ],
    },
    {
      label: "Management",
      items: [
        { to: "/admin/users", label: "Users", icon: Users },
        { to: "/admin/departments", label: "Departments", icon: Building2 },
        { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
        { to: "/admin/settings", label: "Settings", icon: Settings },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/admin/analytics", label: "Analytics & Reports", icon: BarChart3 },
      ],
    },
    {
      label: "Account",
      items: [
        { to: "/notifications", label: "Notifications", icon: Bell },
        { to: "/profile", label: "Profile", icon: UserRound },
      ],
    },
  ],
};

function deriveTitle(pathname) {
  const map = {
    "/dashboard": "Overview",
    "/agent": "Department Workspace",
    "/admin": "Administration",
    "/admin/complaints": "All Complaints",
    "/admin/complaints/unassigned": "Unassigned Complaints",
    "/admin/escalations": "SLA & Escalations",
    "/admin/users": "Users",
    "/admin/departments": "Departments",
    "/admin/audit": "Audit Log",
    "/admin/settings": "Settings",
    "/admin/analytics": "Analytics & Reports",
    "/complaints": "My Complaints",
    "/complaints/new": "Submit Complaint",
    "/notifications": "Notifications",
    "/profile": "Profile",
  };
  if (pathname.startsWith("/complaints/")) return "Complaint Details";
  return map[pathname] || "NexaResolve";
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const groups = useMemo(
    () => groupsByRole[user?.role] || groupsByRole.user,
    [user?.role]
  );

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const loadUnread = () => {
    api
      .get("/notifications?limit=1")
      .then((r) => setUnread(r.data?.unreadCount || 0))
      .catch(() => {});
  };

  useEffect(() => {
    loadUnread();
    const t = setInterval(loadUnread, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => loadUnread();
    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const doLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const isActive = (item) => {
    if (item.to === "/admin") return location.pathname.startsWith("/admin");
    if (item.to === "/dashboard" || item.to === "/agent" || item.to === "/complaints")
      return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    return location.pathname.startsWith(item.to);
  };

  const renderNav = (mobile) =>
    groups.map((g) => (
      <div key={g.label}>
        <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-navy-400">
          {g.label}
        </div>
        <div className="space-y-1">
          {g.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive: active }) =>
                `sidebar-link ${active ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`
              }
              title={collapsed ? item.label : undefined}
              aria-current={isActive(item) ? "page" : undefined}
            >
              <item.icon size={18} />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </div>
      </div>
    ));

  const sidebar = (
    <aside
      className={`hidden md:flex fixed inset-y-0 left-0 z-30 flex-col border-r border-navy-800 bg-navy-900 transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="h-16 px-4 flex items-center justify-between border-b border-navy-800">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center font-semibold text-sm">
            N
          </div>
          {!collapsed && (
            <span className="font-semibold text-white truncate">NexaResolve</span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-navy-400 hover:text-white rounded-lg p-1.5"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {renderNav(false)}
      </nav>

      <div className="p-2 border-t border-navy-800">
        <NavLink
          to="/profile"
          className={`sidebar-link ${isActive({ to: "/profile" }) ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
          title={collapsed ? "Profile" : undefined}
        >
          <UserRound size={18} />
          {!collapsed && "Profile"}
        </NavLink>
        <button
          onClick={doLogout}
          className={`sidebar-link w-full text-left ${collapsed ? "justify-center px-2" : ""}`}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut size={18} />
          {!collapsed && "Logout"}
        </button>
      </div>
    </aside>
  );

  const mobileDrawer = mobileOpen && (
    <div className="md:hidden fixed inset-0 z-40">
      <div className="absolute inset-0 bg-navy-900/40" onClick={() => setMobileOpen(false)} />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-surface border-r border-edge flex flex-col">
        <div className="h-16 px-4 flex items-center justify-between border-b border-edge">
          <span className="font-semibold text-ink-900">NexaResolve</span>
          <button onClick={() => setMobileOpen(false)} className="text-ink-500" aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">{renderNav(true)}</nav>
        <div className="p-3 border-t border-edge">
          <button
            onClick={doLogout}
            className="btn btn-secondary w-full justify-start"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink-900">
      {sidebar}
      {mobileDrawer}

      <div className={`flex flex-col min-h-screen transition-all duration-200 ${collapsed ? "md:pl-16" : "md:pl-64"}`}>
        <header className="h-16 bg-surface border-b border-edge flex items-center px-4 md:px-6 gap-3 sticky top-0 z-20">
          <button
            className="md:hidden text-ink-500"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center text-xs font-semibold">N</div>
            <span className="font-semibold text-ink-900 text-sm">NexaResolve</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-ink-500 truncate">{deriveTitle(location.pathname)}</span>
            <span className="text-sm font-semibold text-ink-900 leading-tight">
              {location.pathname.startsWith("/admin") ? "Administration" : "Workspace"}
            </span>
          </div>
          <div className="flex-1" />
          <NavLink
            to="/notifications"
            className="relative p-2 rounded-lg text-ink-500 hover:bg-canvas hover:text-ink-900"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-semibold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/profile"
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-canvas"
            aria-label="Profile"
          >
            <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-semibold">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-ink-900 leading-tight">{user?.name}</div>
              <div className="text-xs text-ink-500 leading-tight capitalize">{user?.role}</div>
            </div>
          </NavLink>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
