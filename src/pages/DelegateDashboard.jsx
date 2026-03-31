import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDelegateSurvey } from "@/hooks/useDelegateSurvey";
import HD21Survey from "@/components/survey/HD21Survey";
import { db, useMock } from "@/lib/firebase";

// ── Survey status badge ─────────────────────────────────────────────────────
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

// ── Survey preview (before starting) ───────────────────────────────────────
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

// ── Personal summary (after completing) ────────────────────────────────────
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
              <span key={p} className="px-2.5 py-1 bg-navy/5 text-navy rounded-full text-xs font-medium">
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
              <span key={c} className="px-2.5 py-1 bg-coral/10 text-coral rounded-full text-xs font-medium">
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
              <span key={e} className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
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
              <span key={e} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
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

// ── Community survey summary ────────────────────────────────────────────────
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

  if (!data || data.completedCount === 0) return null;

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

// ── Main dashboard ──────────────────────────────────────────────────────────
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
  const firstName = displayName.split(" ")[0];

  const mailtoHref =
    `mailto:utahforwiley@gmail.com` +
    `?subject=${encodeURIComponent("District 21 Delegate — Keep me updated")}` +
    `&body=${encodeURIComponent(
      `Hey Aaron,\n\nI'm a credentialed delegate for District 21 and I want to stay connected through April 11.\n\nName: ${displayName}\n\nKeep me in the loop on convention updates, where you stand on the issues, and anything I need to know before I walk into that room.\n\nI'm with you.\n`
    )}`;

  // ── Survey mode ─────────────────────────────────────────────────────────────
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
            Save &amp; exit
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

  // ── Dashboard mode ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream">

      {/* Nav */}
      <div className="bg-navy-darker px-4 py-3 flex items-center justify-between border-b border-navy-dark/60">
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
          <span className="text-white/60 text-sm hidden sm:inline">{displayName}</span>
          <button
            onClick={signOut}
            className="text-white/60 text-sm hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* ── 1. Welcome strip ──────────────────────────────────────────────── */}
        <div className="bg-navy rounded-2xl px-6 py-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-full opacity-5 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          <p className="text-coral font-condensed font-bold text-sm uppercase tracking-widest mb-2">
            Delegate Hub · April 11, 2026
          </p>
          <h2 className="font-condensed font-black text-white text-3xl sm:text-4xl leading-tight mb-3">
            {firstName}, your vote matters<br className="hidden sm:block" /> more than most people know.
          </h2>
          <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-xl">
            You earned your seat at that table. This is your hub — I built it so you have
            everything you need before you walk into that room on April 11. I'll keep
            updating it as we get closer. Check back.
          </p>
          <p className="mt-4 text-white/50 text-xs font-condensed tracking-wide">— Aaron Wiley</p>
        </div>

        {/* ── 2. Convention quick-reference card ────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-navy-darker px-6 py-4 flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">📋</span>
            <div>
              <h2 className="font-condensed font-black text-white text-xl tracking-wide">
                Convention Quick-Reference
              </h2>
              <p className="text-white/60 text-xs mt-0.5">Everything you need day-of — no fluff</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-lg bg-coral/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-coral text-sm" aria-hidden="true">📍</span>
              </div>
              <div>
                <p className="font-condensed font-bold text-navy text-base">Where &amp; When</p>
                <p className="text-gray-700 text-sm mt-0.5">
                  <strong>Saturday, April 11, 2026</strong> · Highland High School<br />
                  2166 S 1700 E, Salt Lake City, UT 84106
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Check-in opens 8:00 AM · District 21 breakout room at 1:40 PM · Voting at 2:00 PM
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Can't make it in person? Virtual ballots open 8:00 AM, deadline 11:30 AM.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-lg bg-coral/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-coral text-sm" aria-hidden="true">🪪</span>
              </div>
              <div>
                <p className="font-condensed font-bold text-navy text-base">Getting Credentialed</p>
                <p className="text-gray-700 text-sm mt-0.5">
                  Show up, find your name on the list, get your badge. If you're not on
                  the official delegate roster, you cannot vote — so arrive early and
                  confirm you're checked in before anything else happens.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-lg bg-coral/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-coral text-sm" aria-hidden="true">🗳️</span>
              </div>
              <div>
                <p className="font-condensed font-bold text-navy text-base">The 60% Rule — Plain English</p>
                <p className="text-gray-700 text-sm mt-0.5">
                  If any candidate wins 60% or more of delegate votes, they go straight to
                  the general election — no primary needed. Under 60%? The top two
                  candidates advance to a June primary.
                </p>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                    60%+ → Straight to general
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
                    Under 60% → Primary election
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-lg bg-coral/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-coral text-sm" aria-hidden="true">🔄</span>
              </div>
              <div>
                <p className="font-condensed font-bold text-navy text-base">If It Goes Multiple Rounds</p>
                <p className="text-gray-700 text-sm mt-0.5">
                  If nobody hits 60% on the first ballot, the lowest-ranked candidates
                  drop off and voting continues. You are not locked in — you can change
                  your vote between rounds. No one can pressure you. Campaigns can
                  persuade. That's it. Your vote is yours.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Where Aaron stands ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-condensed font-black text-navy text-xl">
                Where I Stand on the Issues
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
                Coming soon
              </span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed max-w-xl">
              I'm building this out now. Check back soon — you deserve to know exactly
              where I stand before you walk into that room. Here's what I'll be covering:
            </p>
          </div>
          <div className="px-6 pb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { icon: "🏠", label: "Housing & Cost of Living" },
                { icon: "🌊", label: "Clean Air & Environment" },
                { icon: "🎓", label: "Education & Youth" },
                { icon: "🏥", label: "Healthcare Access" },
                { icon: "🛡️", label: "Public Safety" },
                { icon: "🗳️", label: "Fair Representation" },
                { icon: "💧", label: "Water & Great Salt Lake" },
                { icon: "🏗️", label: "Westside Development" },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-sm font-medium"
                >
                  <span aria-hidden="true">{icon}</span>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── 4. Survey card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h2 className="font-condensed font-black text-navy text-xl">
                  Tell Me Where You Stand
                </h2>
                <SurveyStatusBadge survey={survey} />
              </div>
              {survey.completed ? (
                <p className="text-gray-600 text-sm leading-relaxed">
                  You're on record. Your responses shape how I campaign and how I govern.
                  Thank you for taking the time.
                </p>
              ) : (
                <p className="text-gray-600 text-sm leading-relaxed">
                  Your feedback shapes how I campaign and how I govern — not just what
                  I say on the stump, but what I actually fight for in the Legislature.
                  10 sections on housing, healthcare, Westside challenges, and more.
                  Progress saves automatically.
                </p>
              )}
            </div>
          </div>

          {!survey.completed && (
            <button
              onClick={() => setShowSurvey(true)}
              className="mt-1 px-6 py-2.5 rounded-xl bg-coral text-white font-condensed font-bold text-base hover:bg-coral/90 active:scale-95 transition-all"
            >
              {survey.currentStep > 0 ? "Continue Survey →" : "Start the Survey →"}
            </button>
          )}
        </div>

        {/* Survey section list — shown before starting */}
        {!survey.completed && survey.currentStep === 0 && <SurveyPreviewCard />}

        {/* Community data — shown once responses exist */}
        <CommunitySurveyPanel />

        {/* Personal responses — shown after completing */}
        {survey.completed && <PersonalSummaryCard survey={survey} />}

        {/* ── 5. Stay connected ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-condensed font-black text-navy text-xl mb-1">
            Stay Connected
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed max-w-xl mb-4">
            I send updates direct from my email as convention gets closer — where I stand
            on issues, what to expect that day, and anything you need to know. Drop me a
            line and I'll make sure you're in the loop.
          </p>
          <a
            href={mailtoHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy text-white font-condensed font-bold text-base hover:bg-navy-dark active:scale-95 transition-all"
          >
            <span aria-hidden="true">✉️</span>
            Email Aaron Directly
          </a>
          <p className="text-gray-400 text-xs mt-3">
            Opens a pre-filled draft in your email app · utahforwiley@gmail.com
          </p>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 pb-6">
          <p className="text-gray-400 text-xs">
            Wiley for District 21 · Salt Lake County Democratic Convention · April 11, 2026
          </p>
          <a
            href="https://wileyfor21.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-coral text-xs font-semibold hover:underline mt-1 inline-block"
          >
            wileyfor21.com →
          </a>
        </div>

      </div>
    </div>
  );
}
