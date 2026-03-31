import { STAGE_BADGES, TARGET_DELEGATES } from "@/lib/constants";

const STAGE_ROWS = [
  { key: "locked",      label: "Locked" },
  { key: "committed",   label: "Committed" },
  { key: "leaning",     label: "Leaning" },
  { key: "engaged",     label: "Engaged" },
  { key: "identified",  label: "Identified" },
  { key: "unknown",     label: "Unknown" },
];

export default function ScoreboardPanel({ summary }) {
  if (!summary) return null;
  const { stageCounts, total, committedTotal, needed, winMinimum } = summary;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
      <h3 className="font-condensed font-bold text-navy text-sm tracking-widest uppercase mb-3">
        Campaign Scoreboard
      </h3>

      {/* Big committed number */}
      <div className="flex items-end gap-3 mb-1">
        <span
          className="font-condensed font-black leading-none"
          style={{ fontSize: "3rem", color: committedTotal >= winMinimum ? "#166534" : "#034A76" }}
        >
          {committedTotal}
        </span>
        <div className="mb-1">
          <p className="text-sm text-gray-500 leading-tight">/ {total} delegates</p>
          {needed > 0 ? (
            <p className="text-xs font-bold" style={{ color: "#F36F6B" }}>
              {needed} needed to hit 70% target
            </p>
          ) : (
            <p className="text-xs font-bold text-green-700">Target reached!</p>
          )}
          <p className="text-xs text-gray-400">{winMinimum} minimum to win</p>
        </div>
      </div>

      {/* Stage breakdown */}
      <div className="space-y-1.5 mt-3">
        {STAGE_ROWS.map(({ key, label }) => {
          const count = stageCounts[key] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const badge = STAGE_BADGES[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                {count > 0 && (
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: badge?.bg === "#F3F4F6" ? "#D1D5DB" : badge?.bg }}
                  />
                )}
              </div>
              <span className="text-xs font-semibold text-gray-700 w-5 text-right shrink-0">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
