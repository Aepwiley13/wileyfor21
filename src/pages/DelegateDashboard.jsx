import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDelegateSurvey, EMPTY_SURVEY } from "@/hooks/useDelegateSurvey";
import HD21Survey from "@/components/survey/HD21Survey";
import { db, useMock } from "@/lib/firebase";

function SurveyStatusBadge({ survey }) {
  if (survey.completed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
        <span>✓</span> Completed
      </span>
    );
  }
  if (survey.currentStep > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
        In progress — Section {survey.currentStep} of 10
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
      Not started
    </span>
  );
}

function InsightsPanel() {
  const [topIssues, setTopIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    if (useMock) {
      // Demo data
      setTopIssues([
        { label: "Cost of living & affordability", count: 14 },
        { label: "Housing affordability & displacement", count: 12 },
        { label: "Access to healthcare (including mental health)", count: 10 },
        { label: "Public education funding", count: 8 },
        { label: "Westside economic development & investment", count: 7 },
      ]);
      setTotal(20);
      setInsightsLoading(false);
      return;
    }
    (async () => {
      try {
        const { collection, getDocs, query, where } = await import("firebase/firestore");
        const q = query(
          collection(db, "delegates"),
          where("survey.completed", "==", true)
        );
        const snap = await getDocs(q);
        const counts = {};
        snap.forEach((doc) => {
          const priorities = doc.data()?.survey?.topPriorities || [];
          priorities.forEach((p) => {
            counts[p] = (counts[p] || 0) + 1;
          });
        });
        const sorted = Object.entries(counts)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopIssues(sorted);
        setTotal(snap.size);
      } catch {
        // Firestore rules may not allow this yet — show empty state
      } finally {
        setInsightsLoading(false);
      }
    })();
  }, []);

  if (insightsLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <p className="text-gray-400 text-sm">Loading community insights…</p>
      </div>
    );
  }

  if (topIssues.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-condensed font-bold text-navy text-lg mb-2">Community Priorities</h3>
        <p className="text-gray-500 text-sm">
          Insights will appear here once more delegates complete the survey.
        </p>
      </div>
    );
  }

  const max = topIssues[0]?.count || 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-condensed font-bold text-navy text-lg">
          What Delegates Care About
        </h3>
        <span className="text-xs text-gray-400">{total} responses</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">Top issues from completed delegate surveys</p>
      <div className="space-y-3">
        {topIssues.map(({ label, count }) => (
          <div key={label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 leading-snug pr-4">{label}</span>
              <span className="text-gray-500 font-medium flex-shrink-0">{count}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-coral rounded-full transition-all duration-500"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DelegateDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { survey, save, complete, loading } = useDelegateSurvey(user?.uid);
  const [showSurvey, setShowSurvey] = useState(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      navigate("/delegate/login", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream">
        <p className="text-navy font-condensed text-xl">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.name || user.displayName || "Delegate";

  // ── Survey Mode ──
  if (showSurvey && !survey.completed) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="bg-navy-darker px-4 py-2.5 flex items-center justify-between border-b border-navy-dark/60">
          <h1 className="font-condensed font-black text-white text-xl tracking-wide">
            WILEY FOR 21 — Delegate Survey
          </h1>
          <button
            onClick={() => setShowSurvey(false)}
            className="text-white/60 text-sm hover:text-white transition-colors"
          >
            Save & exit
          </button>
        </div>
        <div className="max-w-2xl mx-auto p-4 py-8">
          <HD21Survey
            initialState={survey}
            onSave={save}
            onComplete={async (finalState) => {
              await complete(finalState);
              setShowSurvey(false);
            }}
          />
        </div>
      </div>
    );
  }

  // ── Dashboard Mode ──
  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <div className="bg-navy-darker px-4 py-2.5 flex items-center justify-between border-b border-navy-dark/60">
        <h1 className="font-condensed font-black text-white text-xl tracking-wide">
          WILEY FOR 21
        </h1>
        <div className="flex items-center gap-4">
          <a
            href="https://wileyfor21.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-coral text-sm font-semibold hover:text-white transition-colors hidden sm:inline"
          >
            Main Site
          </a>
          <Link
            to="/volunteer"
            className="text-coral text-sm font-semibold hover:text-white transition-colors hidden sm:inline"
          >
            Volunteer Hub
          </Link>
          <span className="text-white/70 text-sm hidden sm:inline">{displayName}</span>
          <button
            onClick={signOut}
            className="text-white/60 text-sm hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 py-8 space-y-5">
        {/* Welcome */}
        <div>
          <h2 className="font-condensed font-black text-navy text-3xl">
            Welcome, {displayName.split(" ")[0]}.
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            HD21 Delegate Hub &middot; Convention: April 11, 2026
          </p>
        </div>

        {/* Survey Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-condensed font-bold text-navy text-xl">
                  HD21 Delegate Survey
                </h3>
                <SurveyStatusBadge survey={survey} />
              </div>
              {survey.completed ? (
                <p className="text-gray-600 text-sm leading-relaxed">
                  Your responses have been recorded. Thank you for shaping this campaign's
                  priorities.
                </p>
              ) : (
                <p className="text-gray-600 text-sm leading-relaxed">
                  Share your priorities for House District 21. 10 sections covering housing,
                  healthcare, Westside challenges, and more. Progress saves automatically.
                </p>
              )}
            </div>
          </div>

          {!survey.completed && (
            <button
              onClick={() => setShowSurvey(true)}
              className="mt-4 px-6 py-2.5 rounded-xl bg-coral text-white font-condensed font-bold text-base hover:bg-coral/90 transition-colors"
            >
              {survey.currentStep > 0 ? "Continue Survey →" : "Begin Survey →"}
            </button>
          )}

          {survey.completed && survey.topPriorities?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Your top priorities
              </p>
              <div className="flex flex-wrap gap-2">
                {survey.topPriorities.map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 bg-navy/5 text-navy rounded-full text-xs font-medium"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Community Insights */}
        <InsightsPanel />

        {/* Convention info */}
        <div className="bg-navy/5 rounded-2xl border border-navy/10 p-5">
          <h3 className="font-condensed font-bold text-navy text-base mb-1">
            Utah Democratic Convention
          </h3>
          <p className="text-sm text-gray-600">
            <strong>April 11, 2026</strong> &middot; Your vote as a delegate shapes who represents
            House District 21. Aaron Wiley is counting on your support.
          </p>
          <a
            href="https://wileyfor21.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-sm text-coral font-semibold hover:underline"
          >
            Learn more at wileyfor21.com →
          </a>
        </div>
      </div>
    </div>
  );
}
