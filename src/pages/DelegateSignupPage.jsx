import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, updateDoc, collection, query, where, getDocs, limit, serverTimestamp } from "firebase/firestore";
import { auth, db, useMock } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

/**
 * Looks up an existing volunteer-managed delegate doc by email or phone.
 * Returns the Firestore doc ID if a match is found, otherwise null.
 */
async function findExistingDelegate(email, phone) {
  // Check email first (most reliable)
  if (email) {
    const emailQ = query(
      collection(db, "delegates"),
      where("email", "==", email.trim()),
      limit(1)
    );
    const emailSnap = await getDocs(emailQ);
    if (!emailSnap.empty) return emailSnap.docs[0].id;
  }

  // Fall back to phone
  if (phone) {
    const normalized = phone.replace(/\D/g, "");
    const phoneQ = query(
      collection(db, "delegates"),
      where("phone", "==", phone.trim()),
      limit(1)
    );
    const phoneSnap = await getDocs(phoneQ);
    if (!phoneSnap.empty) return phoneSnap.docs[0].id;

    // Also try digits-only in case the Hub stores it without formatting
    if (normalized !== phone.trim()) {
      const phoneQ2 = query(
        collection(db, "delegates"),
        where("phone", "==", normalized),
        limit(1)
      );
      const phoneSnap2 = await getDocs(phoneQ2);
      if (!phoneSnap2.empty) return phoneSnap2.docs[0].id;
    }
  }

  return null;
}

export default function DelegateSignupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/delegate/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    neighborhood: "",
    precinct: "",
    preferredMethod: "text",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (useMock) {
        navigate("/delegate/dashboard");
        return;
      }

      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(user, { displayName: fullName });

      const accountFields = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        name: fullName,
        email: form.email.trim(),
        phone: form.phone.trim(),
        neighborhood: form.neighborhood.trim(),
        precinct: form.precinct.trim(),
        role: "delegate",
        preferredMethod: form.preferredMethod,
        uid: user.uid,
        linkedAt: serverTimestamp(),
      };

      // Match to an existing volunteer-managed delegate record by email or phone.
      // If found: enrich that record with the auth uid so the Hub stays in sync.
      // If not found: create a new record at delegates/{uid}.
      const existingDocId = await findExistingDelegate(
        form.email.trim(),
        form.phone.trim()
      );

      if (existingDocId) {
        // Merge account fields into the existing volunteer-managed doc
        await updateDoc(doc(db, "delegates", existingDocId), accountFields);
      } else {
        // No existing record — create a fresh one
        await setDoc(doc(db, "delegates", user.uid), {
          ...accountFields,
          // Volunteer tracking defaults
          stage: "identified",
          currentLeaning: null,
          lastContactedAt: null,
          totalContacts: 0,
          leaningHistory: [],
          topIssues: [],
          assignedTo: [],
          joinedAt: serverTimestamp(),
        });
      }

      navigate("/delegate/dashboard");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Try logging in.");
      } else {
        setError(err.message || "Failed to create account.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-condensed font-black text-navy text-4xl">WILEY FOR 21</h1>
          <p className="text-gray-500 text-sm mt-1">Delegate Hub — Create Your Account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-5"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First name <span className="text-coral">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={form.firstName}
                onChange={handleChange}
                placeholder="First"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last name <span className="text-coral">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={form.lastName}
                onChange={handleChange}
                placeholder="Last"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-coral">*</span>
            </label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-coral">*</span>
              <span className="text-gray-400 font-normal ml-1">(min 8 chars)</span>
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              placeholder="Create a password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm password <span className="text-coral">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone number <span className="text-coral">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              required
              value={form.phone}
              onChange={handleChange}
              placeholder="801-555-0100"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>

          {/* Neighborhood */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Neighborhood{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              name="neighborhood"
              value={form.neighborhood}
              onChange={handleChange}
              placeholder="e.g. Rose Park, Fairpark, Poplar Grove, Glendale..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>

          {/* Precinct */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precinct{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              name="precinct"
              value={form.precinct}
              onChange={handleChange}
              placeholder="e.g. SLC031"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>

          {/* Preferred contact method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred contact method <span className="text-coral">*</span>
            </label>
            <div className="flex gap-6">
              {["call", "text", "email"].map((method) => (
                <label key={method} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="preferredMethod"
                    value={method}
                    checked={form.preferredMethod === method}
                    onChange={handleChange}
                    className="accent-navy"
                  />
                  <span className="text-sm capitalize text-gray-700">{method}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-condensed font-bold text-white bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors text-lg"
          >
            {loading ? "Creating account…" : "Create My Delegate Account"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <a href="/delegate/login" className="text-navy underline">
              Log in
            </a>
          </p>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Convention: April 11, 2026 &middot; wileyfor21.com
        </p>
      </div>
    </div>
  );
}
