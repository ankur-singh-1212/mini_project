import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ToastProvider } from "./context/ToastContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AppLayout from "./layouts/AppLayout";
import Protected from "./components/Protected";
import ErrorBoundary from "./components/ErrorBoundary";
import UserDashboard from "./pages/UserDashboard";
import CreateComplaint from "./pages/CreateComplaint";
import MyComplaints from "./pages/MyComplaints";
import ComplaintDetail from "./pages/ComplaintDetail";
import AgentDashboard from "./pages/AgentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ComplaintManagement from "./pages/ComplaintManagement";
import UnassignedComplaints from "./pages/UnassignedComplaints";
import Escalations from "./pages/Escalations";
import AdminAnalytics from "./pages/AdminAnalytics";
import UsersManagement from "./pages/UsersManagement";
import Departments from "./pages/Departments";
import SLAConfig from "./pages/SLAConfig";
import AdminAudit from "./pages/AuditLog";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<Protected><AppLayout /></Protected>}>
                {/* Students & faculty */}
                <Route path="/dashboard" element={<UserDashboard />} />
                <Route path="/complaints/new" element={<CreateComplaint />} />
                <Route path="/complaints" element={<MyComplaints />} />
                <Route path="/complaints/:id" element={<ComplaintDetail />} />
                {/* Department workspace */}
                <Route path="/agent" element={<AgentDashboard />} />
                {/* Administration */}
                <Route element={<ErrorBoundary><Outlet /></ErrorBoundary>}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/complaints" element={<ComplaintManagement />} />
                  <Route path="/admin/complaints/unassigned" element={<UnassignedComplaints />} />
                  <Route path="/admin/escalations" element={<Escalations />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/admin/users" element={<UsersManagement />} />
                  <Route path="/admin/departments" element={<Departments />} />
                  <Route path="/admin/settings" element={<SLAConfig />} />
                  <Route path="/admin/sla" element={<SLAConfig />} />
                  <Route path="/admin/audit" element={<AdminAudit />} />
                </Route>
                {/* Shared */}
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
