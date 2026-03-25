import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";

const STAGES = [
  "unknown",
  "identified",
  "engaged",
  "leaning",
  "committed",
  "locked",
  "not_winnable",
];

const STAGE_COLORS = {
  unknown:      "bg-gray-100 text-gray-600",
  identified:   "bg-blue-100 text-blue-700",
  engaged:      "bg-yellow-100 text-yellow-700",
  leaning:      "bg-orange-100 text-orange-700",
  committed:    "bg-green-100 text-green-700",
  locked:       "bg-green-600 text-white",
  not_winnable: "bg-red-100 text-red-600",
};

/**
 * Renders the delegate's current stage as a clickable badge.
 * Clicking opens a dropdown to change the stage (admin only).
 *
 * @param {{ delegateId: string, currentStage: string }} props
 */
export default function InlineStageEditor({ delegateId, currentStage }) {
  const { volunteer } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function changeStage(newStage) {
    if (newStage === currentStage) {
      setOpen(false);
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "delegates", delegateId), {
        stage: newStage,
        stageHistory: arrayUnion({
          stage: newStage,
          changedAt: new Date().toISOString(),
          changedBy: `${volunteer?.name || "admin"} (admin override)`,
        }),
      });
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  const colorClass = STAGE_COLORS[currentStage] || STAGE_COLORS.unknown;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${colorClass}`}
        title="Click to change stage"
      >
        {saving ? "…" : currentStage}
      </button>

      {open && (
        <div className="absolute z-10 top-7 left-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px]">
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => changeStage(s)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                s === currentStage ? "font-bold" : ""
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
