import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import CoordinatorPage from "../pages/CoordinatorPage";
import CoordinatorStudentDetailsPage from "../pages/CoordinatorStudentDetailsPage";
import StudentPage from "../pages/StudentPage";
import ShareForCarePage from "../pages/ShareForCarePage";
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
        path="/coordinator/students/:id"
        element={
          <ProtectedRoute role="admin">
            <CoordinatorStudentDetailsPage />
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

      <Route path="/share-for-care" element={<ShareForCarePage />} />

      <Route path="/intern-2026/coordinator" element={<Navigate to="/coordinator" replace />} />
      <Route path="/intern-2026/student/landing" element={<Navigate to="/student/landing" replace />} />
      <Route path="/intern-2026/share-for-care" element={<Navigate to="/share-for-care" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
