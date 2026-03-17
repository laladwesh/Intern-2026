import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import CoordinatorPage from "../pages/CoordinatorPage";
import StudentPage from "../pages/StudentPage";
import ProtectedRoute from "../components/ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route
        path="/coordinator"
        element={
          <ProtectedRoute role="admin">
            <CoordinatorPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/landing"
        element={
          <ProtectedRoute role="student">
            <StudentPage />
          </ProtectedRoute>
        }
      />

      <Route path="/intern-2026/coordinator" element={<Navigate to="/coordinator" replace />} />
      <Route path="/intern-2026/student/landing" element={<Navigate to="/student/landing" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
