import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import VolunteerHome from "./pages/VolunteerHome";
import { AdminOnly } from "./components/ProtectedRoute";
import { AuthRequired } from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        {/* Volunteer dashboard — any authenticated user */}
        <Route
          path="/volunteer"
          element={
            <AuthRequired>
              <VolunteerHome />
            </AuthRequired>
          }
        />

        {/* Admin dashboard — admin role only */}
        <Route
          path="/admin"
          element={
            <AdminOnly>
              <AdminDashboard />
            </AdminOnly>
          }
        />

        {/* Default: redirect to signup */}
        <Route path="/" element={<Navigate to="/signup" replace />} />
        <Route path="*" element={<Navigate to="/signup" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
