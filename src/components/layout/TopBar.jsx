import MomentumBar from "@/components/ui/MomentumBar";
import { daysUntilCaucus } from "@/lib/utils";

export default function TopBar({ contacts, feedItems, userName }) {
  const days = daysUntilCaucus();
  const totalContacts = feedItems?.length || 0;
  const uniqueVolunteers = new Set(feedItems?.map((f) => f.volunteerName) || []).size;
  const committedCount = contacts?.filter((c) => c.stage === "committed" || c.stage === "locked").length || 0;

  // Personal stats
  const myContacts = feedItems?.filter((f) => f.volunteerName === userName) || [];
  const myStageUps = myContacts.filter((f) => f.stageAfterContact !== f.stageBeforeContact).length;

  return (
    <div className="bg-navy text-white p-4 rounded-xl mb-4">
      <div className="flex flex-col gap-3">
        {/* Campaign pulse */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm opacity-80">
              Today: {totalContacts} contacts by {uniqueVolunteers} volunteer{uniqueVolunteers !== 1 ? "s" : ""}
            </p>
            <p className="font-condensed font-bold text-lg">
              {days} day{days !== 1 ? "s" : ""} until convention
            </p>
          </div>
          <div className="text-right text-sm">
            <p>{myContacts.length} contacts this week</p>
            <p>{myStageUps} stage upgrade{myStageUps !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Momentum bar */}
        <MomentumBar committedCount={committedCount} />
      </div>
    </div>
  );
}
