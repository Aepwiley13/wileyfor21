import { daysUntilCaucus } from "@/lib/utils";

export default function TopBar({ feedItems, userName, summary }) {
  const days = daysUntilCaucus();
  const totalContacts = feedItems?.length || 0;
  const uniqueVolunteers = new Set(feedItems?.map((f) => f.volunteerName) || []).size;
  const committedTotal = summary?.committedTotal ?? 0;
  const needed = summary?.needed ?? null;

  const myContacts = feedItems?.filter((f) => f.volunteerName === userName) || [];
  const myStageUps = myContacts.filter((f) => f.stageAfterContact !== f.stageBeforeContact).length;

  return (
    <div className="bg-navy text-white p-4 rounded-xl mb-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: campaign pulse */}
        <div>
          <p className="text-sm opacity-80">
            Today: {totalContacts} contact{totalContacts !== 1 ? "s" : ""} by {uniqueVolunteers} volunteer{uniqueVolunteers !== 1 ? "s" : ""}
          </p>
          <p className="font-condensed font-bold text-2xl leading-tight">
            {days} day{days !== 1 ? "s" : ""} until convention
          </p>
        </div>

        {/* Center: committed count */}
        <div className="text-center hidden sm:block">
          <p className="font-condensed font-black text-3xl leading-none text-white">
            {committedTotal}
          </p>
          <p className="text-xs opacity-70">committed delegates</p>
          {needed !== null && needed > 0 && (
            <p className="text-xs font-bold" style={{ color: "#F36F6B" }}>{needed} needed</p>
          )}
        </div>

        {/* Right: personal stats */}
        <div className="text-right text-sm">
          <p><span className="font-bold text-base">{myContacts.length}</span> contacts this week</p>
          <p><span className="font-bold text-base">{myStageUps}</span> stage upgrade{myStageUps !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  );
}
