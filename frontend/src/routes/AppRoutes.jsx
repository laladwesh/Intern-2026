import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import CoordinatorPage from "../pages/CoordinatorPage";
import CoordinatorStudentDetailsPage from "../pages/CoordinatorStudentDetailsPage";
import StudentPage from "../pages/StudentPage";
import ShareForCarePage from "../pages/ShareForCarePage";
import PgRegistrationPage from "../pages/PgRegistrationPage";
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

      {/* PG Registration — handles auth internally (shows login if not logged in) */}
      <Route path="/pg/registration" element={<PgRegistrationPage />} />

      <Route path="/intern-2026/coordinator" element={<Navigate to="/coordinator" replace />} />
      <Route path="/intern-2026/student/landing" element={<Navigate to="/student/landing" replace />} />
      <Route path="/intern-2026/share-for-care" element={<Navigate to="/share-for-care" replace />} />
      <Route path="/intern-2026/pg/registration" element={<Navigate to="/pg/registration" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
