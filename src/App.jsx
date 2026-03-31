import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ui/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import VolunteerDashboard from "@/pages/VolunteerDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import DelegateSurveyPage from "@/pages/DelegateSurveyPage";
import VolunteerSurveyPage from "@/pages/VolunteerSurveyPage";
import DelegateLoginPage from "@/pages/DelegateLoginPage";
import DelegateSignupPage from "@/pages/DelegateSignupPage";
import DelegateDashboard from "@/pages/DelegateDashboard";
import DelegateSurveyDirectPage from "@/pages/DelegateSurveyDirectPage";
import EndorsementPage from "@/pages/EndorsementPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Volunteer routes */}
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

        {/* Delegate Hub routes */}
        <Route path="/delegate/login" element={<DelegateLoginPage />} />
        <Route path="/delegate/signup" element={<DelegateSignupPage />} />
        {/* Unauthenticated unique-link survey — /delegate/survey?delegate=abc123 */}
        <Route path="/delegate/survey" element={<DelegateSurveyDirectPage />} />
        <Route
          path="/delegate/dashboard"
          element={
            <ProtectedRoute>
              <DelegateDashboard />
            </ProtectedRoute>
          }
        />

        {/* Public endorsement hub */}
        <Route path="/endorse" element={<EndorsementPage />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
