import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ui/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import VolunteerDashboard from "@/pages/VolunteerDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import DelegateSurveyPage from "@/pages/DelegateSurveyPage";
import VolunteerSurveyPage from "@/pages/VolunteerSurveyPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/volunteer"
          element={
            <ProtectedRoute>
              <VolunteerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/survey/delegate" element={<DelegateSurveyPage />} />
        <Route path="/survey/volunteer" element={<VolunteerSurveyPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
