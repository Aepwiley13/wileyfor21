import { daysSince } from "@/lib/utils";
import StageBadge from "@/components/ui/StageBadge";
import ConflictWarningCard from "./ConflictWarningCard";

function LastContactedLine({ delegate }) {
  if (!delegate.lastContactedAt) {
    return <p className="text-sm text-amber-600 font-medium">Never contacted &mdash; first outreach needed</p>;
  }
  const days = daysSince(delegate.lastContactedAt);
  const color = days > 14 ? "text-red-600" : days > 7 ? "text-amber-600" : "text-gray-500";
  return (
    <p className={`text-sm ${color}`}>
      Last contact: {days} day{days !== 1 ? "s" : ""} ago by {delegate.lastContactedBy}
    </p>
  );
}

export default function DelegateCard({ delegate, onOpenLog, onOpenBriefing }) {
  if (delegate.isOpposingCandidate) {
    return <ConflictWarningCard delegate={delegate} />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="font-condensed font-bold text-navy text-lg leading-tight truncate">
            {delegate.name}
          </h3>
          <p className="text-xs text-gray-500">
            {delegate.precinct} &middot; {delegate.role}
          </p>
          <div className="flex gap-2 mt-1 flex-wrap">
            {delegate.isPLEO && (
              <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                &#9733; PLEO
              </span>
            )}
            {delegate.wasOrdSupporter && (
              <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                Former Ord supporter
              </span>
            )}
          </div>
        </div>
        <StageBadge stage={delegate.stage} />
      </div>

      {/* Last contacted */}
      <div className="mb-3">
        <LastContactedLine delegate={delegate} />
      </div>

      {/* Contact buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => onOpenLog?.("call", delegate)}
          className="flex-1 bg-navy text-white text-sm font-medium py-2 rounded-lg hover:bg-navy-dark active:scale-95 transition-all"
        >
          &#128222; Call
        </button>
        <button
          onClick={() => onOpenLog?.("text", delegate)}
          className="flex-1 bg-navy text-white text-sm font-medium py-2 rounded-lg hover:bg-navy-dark active:scale-95 transition-all"
        >
          &#128172; Text
        </button>
        <button
          onClick={() => onOpenLog?.("email", delegate)}
          className="flex-1 bg-navy text-white text-sm font-medium py-2 rounded-lg hover:bg-navy-dark active:scale-95 transition-all"
        >
          &#9993;&#65039; Email
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onOpenBriefing?.(delegate)}
          className="flex-1 text-sm text-navy font-medium py-1.5 border border-navy/20 rounded-lg hover:bg-navy/5 transition-colors"
        >
          View briefing &#8599;
        </button>
        <button
          onClick={() => onOpenLog?.(null, delegate)}
          className="flex-1 text-sm text-coral font-medium py-1.5 border border-coral/20 rounded-lg hover:bg-coral/5 transition-colors"
        >
          Log contact
        </button>
      </div>
    </div>
  );
}
