import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-email") {
        setError("No account found with that email address.");
      } else {
        setError(err.message || "Failed to send reset email. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-condensed font-black text-navy text-4xl">WILEY FOR 21</h1>
          <p className="text-gray-500 text-sm mt-1">Volunteer Hub</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-green-600 text-4xl">&#10003;</div>
              <h2 className="font-semibold text-gray-800">Check your email</h2>
              <p className="text-sm text-gray-500">
                A password reset link has been sent to <strong>{email}</strong>. Check your inbox and follow the link to set a new password.
              </p>
              <Link to="/login" className="block text-sm text-navy underline mt-2">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="font-semibold text-gray-800 mb-1">Reset your password</h2>
                <p className="text-sm text-gray-500">Enter your email and we'll send you a reset link.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl font-condensed font-bold text-white bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors text-lg"
              >
                {submitting ? "Sending..." : "Send Reset Link"}
              </button>
              <p className="text-center text-sm">
                <Link to="/login" className="text-navy underline text-xs">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Convention: April 11, 2026 &middot; wileyfor21.com
        </p>
      </div>
    </div>
  );
}
