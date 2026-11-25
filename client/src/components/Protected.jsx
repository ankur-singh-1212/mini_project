import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
export default function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-ink-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
