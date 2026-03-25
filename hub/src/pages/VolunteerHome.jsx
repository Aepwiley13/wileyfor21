import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";

/**
 * Placeholder volunteer dashboard — Team B will replace this with the full
 * volunteer UI. This page confirms auth works and provides a logout + admin link.
 */
export default function VolunteerHome() {
  const { volunteer, isAdmin } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span
              className="inline-block text-white text-xs font-bold px-2 py-1 rounded mb-2"
              style={{ backgroundColor: "#034A76" }}
            >
              WILEY FOR HD21
            </span>
            <h1 className="text-2xl font-bold text-navy">
              Welcome, {volunteer?.name || "Volunteer"}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 underline hover:text-gray-800"
          >
            Log out
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-gray-600 mb-6">
            The volunteer outreach tool is coming soon. Team B is building it on
            top of this foundation.
          </p>

          {isAdmin && (
            <Link
              to="/admin"
              className="inline-block px-6 py-3 rounded-lg font-semibold text-white"
              style={{ backgroundColor: "#034A76" }}
            >
              Go to Admin Dashboard →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
