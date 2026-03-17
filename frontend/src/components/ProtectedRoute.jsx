import { Navigate } from "react-router-dom";
import { getToken, getRole } from "../utils/auth";

/**
 * ProtectedRoute — renders children only when localStorage has a valid token
 * with the required role. Redirects to "/" otherwise.
 *
 * Usage:
 *   <ProtectedRoute role="admin"><CoordinatorPage /></ProtectedRoute>
 *   <ProtectedRoute role="student"><StudentPage /></ProtectedRoute>
 */
export default function ProtectedRoute({ role, children }) {
  const token = getToken();
  const savedRole = getRole();

  if (!token || !savedRole) {
    return <Navigate to="/" replace />;
  }

  if (role && savedRole !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
