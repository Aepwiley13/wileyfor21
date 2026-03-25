import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useMilestones } from "@/hooks/useMilestones";
import TopBar from "@/components/layout/TopBar";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DelegateCard from "@/components/cards/DelegateCard";
import MilestoneBanner from "@/components/cards/MilestoneBanner";
import ActivityFeed from "@/components/feed/ActivityFeed";
import Leaderboard from "@/components/feed/Leaderboard";
import ContactLogModal from "@/components/modals/ContactLogModal";
import BriefingDrawer from "@/components/modals/BriefingDrawer";

export default function VolunteerDashboard() {
  const { user, signOut } = useAuth();
  const { contacts, updateContact } = useContacts();
  const feed = useActivityFeed();
  const leaderboard = useLeaderboard(user?.uid);
  const milestone = useMilestones();

  const [showRight, setShowRight] = useState(false);
  const [logModal, setLogModal] = useState(null); // { delegate, method }
  const [briefingDelegate, setBriefingDelegate] = useState(null);

  function handleOpenLog(method, delegate) {
    setLogModal({ delegate, method });
  }

  function handleLogSubmitted(logEntry, newStage) {
    if (newStage !== logEntry.stageBeforeContact) {
      updateContact(logEntry.delegateId, {
        stage: newStage,
        lastContactedAt: new Date().toISOString(),
        lastContactedBy: user.name,
      });
    } else {
      updateContact(logEntry.delegateId, {
        lastContactedAt: new Date().toISOString(),
        lastContactedBy: user.name,
      });
    }
  }

  const leftPanel = (
    <div>
      <h2 className="font-condensed font-bold text-navy text-xl mb-3">Your Contacts Today</h2>
      {contacts.length === 0 ? (
        <p className="text-gray-500 text-sm">No delegates assigned yet.</p>
      ) : (
        contacts.map((d) => (
          <DelegateCard
            key={d.id}
            delegate={d}
            onOpenLog={handleOpenLog}
            onOpenBriefing={setBriefingDelegate}
          />
        ))
      )}
    </div>
  );

  const rightPanel = (
    <div className="space-y-4">
      <Leaderboard data={leaderboard} currentUserId={user?.uid} />
      <ActivityFeed items={feed} />
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Sticky header */}
      <div className="bg-navy-darker px-4 py-2 flex items-center justify-between">
        <h1 className="font-condensed font-bold text-white text-lg">WILEY FOR 21</h1>
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-sm hidden sm:inline">{user?.name}</span>
          <button onClick={signOut} className="text-white/60 text-sm hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Milestone banner */}
        {milestone && <MilestoneBanner message={milestone} />}

        <TopBar contacts={contacts} feedItems={feed} userName={user?.name} />

        <DashboardLayout
          left={leftPanel}
          right={rightPanel}
          showRight={showRight}
          onToggleRight={() => setShowRight((s) => !s)}
        />
      </div>

      {/* Contact Log Modal */}
      {logModal && (
        <ContactLogModal
          delegate={logModal.delegate}
          method={logModal.method}
          onClose={() => setLogModal(null)}
          onSubmitted={handleLogSubmitted}
        />
      )}

      {/* Briefing Drawer */}
      {briefingDelegate && (
        <BriefingDrawer
          delegate={briefingDelegate}
          onClose={() => setBriefingDelegate(null)}
        />
      )}
    </div>
  );
}
