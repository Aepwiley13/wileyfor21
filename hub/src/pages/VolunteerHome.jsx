import { useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";

const EMAIL_TEMPLATES = [
  {
    id: "calling-all-delegates",
    title: "Calling All Delegates",
    audience: "All credentialed District 21 delegates",
    subject: "Aaron Wiley for HD 21 — Calling All Delegates",
    description:
      "Broadcast email introducing Aaron, explaining how convention voting works, and driving delegates to fill out the survey.",
    href: "/emails/calling-all-delegates.html",
  },
];

function EmailTemplateCard({ template }) {
  const [copied, setCopied] = useState(false);

  function copySubject() {
    navigator.clipboard.writeText(template.subject).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="font-bold text-navy text-lg leading-tight">
            {template.title}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">
            {template.audience}
          </p>
        </div>
        <a
          href={template.href}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-sm font-semibold text-white px-4 py-2 rounded-lg"
          style={{ backgroundColor: "#034A76" }}
        >
          Preview ↗
        </a>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        {template.description}
      </p>

      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
        <span className="text-xs text-gray-400 shrink-0">Subject:</span>
        <span className="text-sm text-gray-700 flex-1 truncate font-medium">
          {template.subject}
        </span>
        <button
          onClick={copySubject}
          className="shrink-0 text-xs font-semibold px-3 py-1 rounded-md transition-colors"
          style={{
            backgroundColor: copied ? "#034A76" : "#F36F6B",
            color: "#fff",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

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

        {/* EMAIL TEMPLATES */}
        <div className="mb-6">
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#F36F6B" }}
          >
            Email Templates
          </h2>
          <div className="flex flex-col gap-4">
            {EMAIL_TEMPLATES.map((t) => (
              <EmailTemplateCard key={t.id} template={t} />
            ))}
          </div>
        </div>

        {/* COMING SOON / ADMIN LINK */}
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
