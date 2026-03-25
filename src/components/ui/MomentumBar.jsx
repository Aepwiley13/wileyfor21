import { daysUntilCaucus } from "@/lib/utils";
import { TARGET_DELEGATES } from "@/lib/constants";

export default function MomentumBar({ committedCount = 0 }) {
  const days = daysUntilCaucus();
  const pct = Math.min(100, Math.round((committedCount / TARGET_DELEGATES) * 100));

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{committedCount} / {TARGET_DELEGATES} committed</span>
        <span>{days} days until convention</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 100 ? "#166534" : "#034A76",
          }}
        />
      </div>
    </div>
  );
}
