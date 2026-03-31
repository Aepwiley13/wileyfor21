import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useMilestones } from "@/hooks/useMilestones";
import { useStageSummary } from "@/hooks/useStageSummary";
import { useDelegateInsights } from "@/hooks/useDelegateInsights";
import TopBar from "@/components/layout/TopBar";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DelegateCard from "@/components/cards/DelegateCard";
import MilestoneBanner from "@/components/cards/MilestoneBanner";
import ActivityFeed from "@/components/feed/ActivityFeed";
import Leaderboard from "@/components/feed/Leaderboard";
import ScoreboardPanel from "@/components/ui/ScoreboardPanel";
import ContactLogModal from "@/components/modals/ContactLogModal";
import BriefingDrawer from "@/components/modals/BriefingDrawer";
import { useMock, db } from "@/lib/firebase";

export default function VolunteerDashboard() {
  const { user, signOut } = useAuth();
  const { contacts, updateContact } = useContacts();
  const feed = useActivityFeed();
  const leaderboard = useLeaderboard(user?.uid);
  const milestone = useMilestones();
  const summary = useStageSummary();
  const { insights } = useDelegateInsights();

  const [showRight, setShowRight] = useState(false);
  const [logModal, setLogModal] = useState(null);
  const [briefingDelegate, setBriefingDelegate] = useState(null);
  const [surveyFilter, setSurveyFilter] = useState(false); // "incomplete surveys only"

  function handleOpenLog(method, delegate) {
    setLogModal({ delegate, method });
  }

  function handleCallScriptSave(delegateId) {
    updateContact(delegateId, { lastContactedAt: new Date().toISOString(), lastContactedBy: user?.name });
  }

  function handleLogSubmitted(logEntry, newStage) {
    const patch = {
      lastContactedAt: new Date().toISOString(),
      lastContactedBy: user.name,
    };
    if (newStage !== logEntry.stageBeforeContact) patch.stage = newStage;
    updateContact(logEntry.delegateId, patch);
  }

  // Survey filter: delegates who started but haven't completed
  const incompleteSurveyCount = contacts.filter(
    (d) => d.survey?.startedAt && !d.survey?.completed
  ).length;

  const visibleContacts = surveyFilter
    ? contacts.filter((d) => d.survey?.startedAt && !d.survey?.completed)
    : contacts;

  const leftPanel = (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="font-condensed font-bold text-navy text-sm tracking-widest uppercase">
          Your Contacts Today &mdash; Sorted by Priority
        </h2>
        {incompleteSurveyCount > 0 && (
          <button
            onClick={() => setSurveyFilter((v) => !v)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
              surveyFilter
                ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                : "text-gray-500 border-gray-200 hover:border-gray-400"
            }`}
          >
            {surveyFilter
              ? `Showing ${incompleteSurveyCount} incomplete — clear filter`
              : `${incompleteSurveyCount} incomplete survey${incompleteSurveyCount > 1 ? "s" : ""} — follow up`}
          </button>
        )}
      </div>
      {visibleContacts.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {surveyFilter ? "No delegates with incomplete surveys." : "No delegates assigned yet."}
        </p>
      ) : (
        visibleContacts.map((d) => (
          <DelegateCard
            key={d.id}
            delegate={d}
            onOpenLog={handleOpenLog}
            onOpenBriefing={setBriefingDelegate}
            onCallScriptSave={handleCallScriptSave}
            volunteerName={user?.name || user?.displayName}
          />
        ))
      )}
    </div>
  );

  const delegateSurveyPanel = insights.completedCount > 0 && (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-condensed font-bold text-navy text-sm tracking-widest uppercase">
          Delegate Survey
        </h3>
        <span className="text-xs text-gray-400">{insights.completedCount} completed</span>
      </div>
      <div className="space-y-2">
        {insights.topIssues.map(({ label, count }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 flex-1 leading-snug">{label}</span>
            <span className="text-xs font-semibold text-coral flex-shrink-0">{count}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">Top issues delegates care about</p>
    </div>
  );

  const rightPanel = (
    <div className="space-y-4">
      <ScoreboardPanel summary={summary} />
      {delegateSurveyPanel}
      <Leaderboard data={leaderboard} currentUserId={user?.uid} />
      <ActivityFeed items={feed} />
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Sticky nav */}
      <div className="bg-navy-darker px-4 py-2.5 flex items-center justify-between border-b border-navy-dark/60">
        <h1 className="font-condensed font-black text-white text-xl tracking-wide">WILEY FOR 21</h1>
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
            to="/delegate/dashboard"
            className="text-coral text-sm font-semibold hover:text-white transition-colors hidden sm:inline"
          >
            Delegate Hub
          </Link>
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="text-xs font-bold px-3 py-1 rounded-lg bg-coral text-white hover:bg-coral/90 transition-colors hidden sm:inline-block"
            >
              Admin Dashboard
            </Link>
          )}
          <span className="text-white/70 text-sm hidden sm:inline">{user?.name || user?.displayName}</span>
          <button
            onClick={signOut}
            className="text-white/60 text-sm hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {milestone && <MilestoneBanner message={milestone} />}
        <TopBar contacts={contacts} feedItems={feed} userName={user?.name} summary={summary} />
        <DashboardLayout
          left={leftPanel}
          right={rightPanel}
          showRight={showRight}
          onToggleRight={() => setShowRight((s) => !s)}
        />
      </div>

      {logModal && (
        <ContactLogModal
          delegate={logModal.delegate}
          method={logModal.method}
          onClose={() => setLogModal(null)}
          onSubmitted={handleLogSubmitted}
        />
      )}

      {briefingDelegate && (
        <BriefingDrawer
          delegate={briefingDelegate}
          onClose={() => setBriefingDelegate(null)}
        />
      )}

    </div>
  );
}
