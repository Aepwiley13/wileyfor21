import { useState, useEffect } from "react";
import { MILESTONE_MESSAGES } from "@/lib/constants";

const STORAGE_KEY = "wiley21_milestones_seen";

function getSeenMilestones() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function markSeen(threshold) {
  const seen = getSeenMilestones();
  if (!seen.includes(threshold)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, threshold]));
  }
}

export function useMilestones(committedCount = 0) {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const seen = getSeenMilestones();
    const thresholds = Object.keys(MILESTONE_MESSAGES).map(Number).sort((a, b) => b - a);

    for (const t of thresholds) {
      if (committedCount >= t && !seen.includes(t)) {
        setMessage(MILESTONE_MESSAGES[t]);
        markSeen(t);
        // Auto-dismiss after 8 seconds
        const timer = setTimeout(() => setMessage(null), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [committedCount]);

  return message;
}
