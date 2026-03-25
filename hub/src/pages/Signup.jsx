import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    zipCode: "",
    preferredMethod: "text",
    whyVolunteering: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      await setDoc(doc(db, "volunteers", user.uid), {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        zipCode: form.zipCode.trim(),
        role: "volunteer",
        preferredMethod: form.preferredMethod,
        whyVolunteering: form.whyVolunteering.trim(),
        assignedDelegates: [],
        totalContacts: 0,
        stageUpgradesAllTime: 0,
        joinedAt: serverTimestamp(),
      });

      navigate("/volunteer");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Try logging in.");
      } else {
        setError(err.message);
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
          <div
            className="inline-block text-white text-sm font-bold px-3 py-1 rounded mb-4"
            style={{ backgroundColor: "#034A76" }}
          >
            WILEY FOR HD21
          </div>
          <h1 className="text-3xl font-bold text-navy mb-2">
            Join Team Wiley
          </h1>
          <p className="text-gray-600">
            Create your volunteer account to access the outreach tool.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Full name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full name <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>

          {/* Zip code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zip code <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              name="zipCode"
              required
              value={form.zipCode}
              onChange={handleChange}
              placeholder="84116"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
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

          {/* Why volunteering */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why do you want to get involved?{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              name="whyVolunteering"
              value={form.whyVolunteering}
              onChange={handleChange}
              rows={3}
              placeholder="Tell us what brought you here…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-opacity"
            style={{ backgroundColor: "#034A76", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Creating account…" : "Create My Account"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-navy underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
