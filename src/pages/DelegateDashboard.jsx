import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDelegateSurvey } from "@/hooks/useDelegateSurvey";
import HD21Survey from "@/components/survey/HD21Survey";
import { db, useMock } from "@/lib/firebase";

// ─── Status Badge ──────────────────────────────────────────────────────────

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

// ─── Survey Preview (before starting) ────────────────────────────────────

const SURVEY_SECTIONS = [
  "Introduction & neighborhood",
  "Your top priorities",
  "Westside challenges",
  "Issue ranking",
  "Housing, seniors & safety",
  "Crime, environment & disability",
  "Education, healthcare & labor",
  "Policy agreement statements",
  "Tradeoffs & open questions",
  "Lived experience",
  "How to stay involved",
];

function SurveyPreviewCard() {
  return (
    <div className="bg-navy/5 rounded-2xl border border-navy/10 p-5">
      <h3 className="font-condensed font-bold text-navy text-base mb-2">
        What&rsquo;s in the survey?
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        10 sections covering the issues that matter most in House District 21. Takes about
        10&ndash;15 minutes. Your progress saves automatically.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
        {SURVEY_SECTIONS.map((section, i) => (
          <div key={section} className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-5 h-5 rounded-full bg-navy/10 text-navy font-bold text-[10px] flex items-center justify-center flex-shrink-0">
              {i + 1}
            </span>
            {section}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Personal Summary (after completing) ─────────────────────────────────

function PersonalSummaryCard({ survey }) {
  if (!survey.completed) return null;

  const hasLivedExp =
    survey.livedExperience?.length > 0 &&
    !(survey.livedExperience.length === 1 && survey.livedExperience[0] === "Prefer not to say");

  const filteredLivedExp = (survey.livedExperience || []).filter(
    (e) => e !== "Prefer not to say"
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <h3 className="font-condensed font-bold text-navy text-lg">Your Survey Responses</h3>

      {survey.topPriorities?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Your Top Priorities
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

      {survey.westsideChallenges?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Westside Challenges You Highlighted
          </p>
          <div className="flex flex-wrap gap-2">
            {survey.westsideChallenges.map((c) => (
              <span
                key={c}
                className="px-2.5 py-1 bg-coral/10 text-coral rounded-full text-xs font-medium"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {survey.engagementInterest?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            How You Want to Stay Involved
          </p>
          <div className="flex flex-wrap gap-2">
            {survey.engagementInterest.map((e) => (
              <span
                key={e}
                className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasLivedExp && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Issues That Have Affected You Personally
          </p>
          <div className="flex flex-wrap gap-2">
            {filteredLivedExp.map((e) => (
              <span
                key={e}
                className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {survey.closingThoughts && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Your Closing Thoughts
          </p>
          <p className="text-sm text-gray-600 italic leading-relaxed">
            &ldquo;{survey.closingThoughts}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Community Survey Summary ─────────────────────────────────────────────

const MOCK_COMMUNITY = {
  completedCount: 7,
  topPriorities: [
    { label: "Cost of living & affordability", count: 6 },
    { label: "Housing affordability & displacement", count: 5 },
    { label: "Access to healthcare (including mental health)", count: 4 },
    { label: "Public education funding", count: 3 },
    { label: "Westside economic development & investment", count: 3 },
  ],
  topChallenges: [
    { label: "Rising housing costs and longtime residents being displaced", count: 5 },
    { label: "Worse air quality and health risks compared to the rest of the city", count: 4 },
    { label: "Lack of economic investment compared to the Eastside", count: 4 },
    { label: "Access to healthcare clinics and mental health services", count: 3 },
  ],
  topEngagement: [
    { label: "Attend community discussion events", count: 5 },
    { label: "Help shape policy ideas and give ongoing feedback", count: 4 },
    { label: "Volunteer on the campaign", count: 3 },
    { label: "Just keep me informed", count: 3 },
  ],
};

function BarChart({ items, maxVal }) {
  return (
    <div className="space-y-2.5">
      {items.map(({ label, count }) => (
        <div key={label}>
          <div className="flex justify-between mb-0.5">
            <span className="text-xs text-gray-700 leading-snug pr-4">{label}</span>
            <span className="text-xs text-gray-500 font-medium flex-shrink-0">{count}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-coral rounded-full transition-all duration-500"
              style={{ width: `${(count / maxVal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CommunitySurveyPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (useMock) {
      setData(MOCK_COMMUNITY);
      setLoading(false);
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
        const priorityCounts = {};
        const challengeCounts = {};
        const engagementCounts = {};

        snap.forEach((doc) => {
          const s = doc.data()?.survey || {};
          (s.topPriorities || []).forEach((p) => {
            priorityCounts[p] = (priorityCounts[p] || 0) + 1;
          });
          (s.westsideChallenges || []).forEach((c) => {
            challengeCounts[c] = (challengeCounts[c] || 0) + 1;
          });
          (s.engagementInterest || []).forEach((e) => {
            engagementCounts[e] = (engagementCounts[e] || 0) + 1;
          });
        });

        const sorted = (obj) =>
          Object.entries(obj)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);

        setData({
          completedCount: snap.size,
          topPriorities: sorted(priorityCounts).slice(0, 5),
          topChallenges: sorted(challengeCounts).slice(0, 4),
          topEngagement: sorted(engagementCounts).slice(0, 5),
        });
      } catch {
        // Firestore rules may restrict access — silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <p className="text-gray-400 text-sm">Loading community survey data…</p>
      </div>
    );
  }

  if (!data || data.completedCount === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-condensed font-bold text-navy text-lg mb-2">
          Delegate Survey Summary
        </h3>
        <p className="text-gray-500 text-sm">
          Community insights will appear here once delegates complete the survey.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-condensed font-bold text-navy text-lg">Delegate Survey Summary</h3>
        <span className="text-xs text-gray-400 font-medium">
          {data.completedCount} {data.completedCount === 1 ? "response" : "responses"}
        </span>
      </div>

      {data.topPriorities.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Top Priorities
          </p>
          <BarChart items={data.topPriorities} maxVal={data.topPriorities[0]?.count || 1} />
        </div>
      )}

      {data.topChallenges.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Top Westside Challenges
          </p>
          <BarChart items={data.topChallenges} maxVal={data.topChallenges[0]?.count || 1} />
        </div>
      )}

      {data.topEngagement.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            How Delegates Want to Stay Involved
          </p>
          <BarChart items={data.topEngagement} maxVal={data.topEngagement[0]?.count || 1} />
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────

export default function DelegateDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { survey, save, complete, loading } = useDelegateSurvey(user?.uid);
  const [showSurvey, setShowSurvey] = useState(false);

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
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-condensed font-bold text-navy text-xl">HD21 Delegate Survey</h3>
            <SurveyStatusBadge survey={survey} />
          </div>
          {survey.completed ? (
            <p className="text-gray-600 text-sm leading-relaxed">
              Your responses have been recorded. Thank you for shaping this campaign&rsquo;s
              priorities.
            </p>
          ) : (
            <p className="text-gray-600 text-sm leading-relaxed">
              Share your priorities for House District 21. 10 sections covering housing,
              healthcare, Westside challenges, and more. Progress saves automatically.
            </p>
          )}
          {!survey.completed && (
            <button
              onClick={() => setShowSurvey(true)}
              className="mt-4 px-6 py-2.5 rounded-xl bg-coral text-white font-condensed font-bold text-base hover:bg-coral/90 transition-colors"
            >
              {survey.currentStep > 0 ? "Continue Survey →" : "Begin Survey →"}
            </button>
          )}
        </div>

        {/* Survey preview — shown only before starting */}
        {!survey.completed && survey.currentStep === 0 && <SurveyPreviewCard />}

        {/* Community survey summary — shown at beginning AND end */}
        <CommunitySurveyPanel />

        {/* Personal responses — shown after completing */}
        {survey.completed && <PersonalSummaryCard survey={survey} />}

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
            Learn more at wileyfor21.com &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
