const MEDALS = ["", "\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];

export default function Leaderboard({ data, currentUserId }) {
  const { top5, myRank } = data;

  // Dynamic nudge text
  let nudge = null;
  if (myRank && myRank.rank > 1) {
    const above = top5.find((v) => v.rank === myRank.rank - 1);
    if (above) {
      const diff = above.contacts - myRank.contacts + 1;
      nudge = `Make ${diff} more contact${diff !== 1 ? "s" : ""} to pass ${above.name}.`;
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
      <h3 className="font-condensed font-bold text-navy text-lg mb-3">
        &#127942; This Week's Top Volunteers
      </h3>

      {top5.length === 0 ? (
        <p className="text-sm text-gray-400">No contacts logged this week yet.</p>
      ) : (
        <div className="space-y-2">
          {top5.map((v) => {
            const isMe = v.id === currentUserId || v.name === "Demo Volunteer";
            return (
              <div
                key={v.id}
                className={`flex items-center justify-between text-sm py-1.5 px-2 rounded-lg ${
                  isMe ? "bg-navy/5 font-semibold" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center">
                    {MEDALS[v.rank] || `${v.rank}.`}
                  </span>
                  <span className={isMe ? "text-navy" : "text-gray-700"}>
                    {v.name} {isMe && <span className="text-coral">&larr; You</span>}
                  </span>
                </div>
                <span className="text-gray-500">{v.contacts} contacts</span>
              </div>
            );
          })}
        </div>
      )}

      {nudge && (
        <p className="text-xs text-coral font-medium mt-3 text-center">{nudge}</p>
      )}
    </div>
  );
}
