import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const SETUP_CODE = import.meta.env.VITE_ADMIN_SETUP_CODE || "wiley2026";

export default function AdminBootstrapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [error, setError] = useState("");

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">You must be signed in to use this page.</p>
      </div>
    );
  }

  async function handleClaim(e) {
    e.preventDefault();
    if (code !== SETUP_CODE) {
      setError("Incorrect setup code.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      await setDoc(doc(db, "volunteers", user.uid), { role: "admin" }, { merge: true });
      setStatus("success");
    } catch (err) {
      setError("Failed to set admin role: " + err.message);
      setStatus(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Setup</h1>
        <p className="text-sm text-gray-500 mb-6">
          Logged in as <span className="font-medium text-gray-700">{user.email}</span>
        </p>

        {status === "success" ? (
          <div className="text-center">
            <p className="text-green-600 font-semibold mb-4">Admin role granted! Sign out and back in to activate it.</p>
            <button
              onClick={() => navigate("/volunteer")}
              className="w-full py-2 px-4 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 transition-colors"
            >
              Go to Volunteer Hub
            </button>
          </div>
        ) : (
          <form onSubmit={handleClaim} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Setup Code</label>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter setup code"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-2 px-4 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {status === "loading" ? "Claiming…" : "Claim Admin Role"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
