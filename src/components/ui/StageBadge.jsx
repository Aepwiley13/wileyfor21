import { STAGE_BADGES } from "@/lib/constants";

export default function StageBadge({ stage }) {
  const badge = STAGE_BADGES[stage] || STAGE_BADGES.unknown;
  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: badge.bg, color: badge.text }}
    >
      {badge.label}
    </span>
  );
}
