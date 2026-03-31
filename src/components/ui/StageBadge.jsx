import { useState } from "react";
import { STAGE_BADGES, STAGES } from "@/lib/constants";
import { db, useMock } from "@/lib/firebase";

const ALL_STAGES = [...STAGES, "not_winnable"];

export default function StageBadge({ stage, delegateId, currentStage }) {
  const activeStage = currentStage ?? stage;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const badge = STAGE_BADGES[activeStage] || STAGE_BADGES.unknown;

  // Read-only (volunteer view — no delegateId passed)
  if (!delegateId) {
    return (
      <span
        className="inline-block rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap"
        style={{ backgroundColor: badge.bg, color: badge.text }}
      >
        {badge.label}
      </span>
    );
  }

  // Admin view — clickable dropdown
  async function handleSelect(newStage) {
    if (newStage === activeStage) { setOpen(false); return; }
    setSaving(true);
    if (!useMock && db) {
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "delegates", delegateId), { stage: newStage });
    }
    setSaving(false);
    setOpen(false);
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50"
        style={{ backgroundColor: badge.bg, color: badge.text }}
      >
        {saving ? "saving…" : badge.label}
        <svg className="w-3 h-3 opacity-60" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 8L1 3h10z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[150px]">
            {ALL_STAGES.map((s) => {
              const b = STAGE_BADGES[s] || STAGE_BADGES.unknown;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: b.bg, color: b.text }}
                  >
                    {b.label}
                  </span>
                  {s === activeStage && (
                    <span className="text-gray-400 text-xs ml-auto">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
