import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useMilestones } from "@/hooks/useMilestones";
import { useStageSummary } from "@/hooks/useStageSummary";
import TopBar from "@/components/layout/TopBar";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DelegateCard from "@/components/cards/DelegateCard";
import MilestoneBanner from "@/components/cards/MilestoneBanner";
import ActivityFeed from "@/components/feed/ActivityFeed";
import Leaderboard from "@/components/feed/Leaderboard";
import ScoreboardPanel from "@/components/ui/ScoreboardPanel";
import ContactLogModal from "@/components/modals/ContactLogModal";
import BriefingDrawer from "@/components/modals/BriefingDrawer";

export default function VolunteerDashboard() {
  const { user, signOut } = useAuth();
  const { contacts, updateContact } = useContacts();
  const feed = useActivityFeed();
  const leaderboard = useLeaderboard(user?.uid);
  const milestone = useMilestones();
  const summary = useStageSummary();

  const [showRight, setShowRight] = useState(false);
  const [logModal, setLogModal] = useState(null);
  const [briefingDelegate, setBriefingDelegate] = useState(null);

  function handleOpenLog(method, delegate) {
    setLogModal({ delegate, method });
  }

  function handleLogSubmitted(logEntry, newStage) {
    const patch = {
      lastContactedAt: new Date().toISOString(),
      lastContactedBy: user.name,
    };
    if (newStage !== logEntry.stageBeforeContact) patch.stage = newStage;
    updateContact(logEntry.delegateId, patch);
  }

  const leftPanel = (
    <div>
      <h2 className="font-condensed font-bold text-navy text-sm tracking-widest uppercase mb-3">
        Your Contacts Today &mdash; Sorted by Priority
      </h2>
      {contacts.length === 0 ? (
        <p className="text-gray-500 text-sm">No delegates assigned yet.</p>
      ) : (
        contacts.map((d) => (
          <DelegateCard
            key={d.id}
            delegate={d}
            onOpenLog={handleOpenLog}
            onOpenBriefing={setBriefingDelegate}
            volunteerName={user?.name || user?.displayName}
          />
        ))
      )}
    </div>
  );

  const rightPanel = (
    <div className="space-y-4">
      <ScoreboardPanel summary={summary} />
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
            wileyfor21.com
          </a>
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
