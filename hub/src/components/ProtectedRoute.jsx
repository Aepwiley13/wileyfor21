import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * Wraps any route that requires a logged-in user.
 * Redirects unauthenticated visitors to /login.
 */
export function AuthRequired({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/**
 * Wraps routes that require role === "admin".
 * Redirects non-admins to /volunteer.
 *
 * To grant admin: Firestore console → volunteers/{uid} → set role: "admin"
 */
export function AdminOnly({ children }) {
  const { isAdmin, user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/volunteer" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-navy text-xl font-semibold">Loading…</div>
    </div>
  );
}
