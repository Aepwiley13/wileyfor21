import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Real-time listener on campaignStats/live.
 * Returns null until the first snapshot arrives.
 */
export function useCampaignStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "campaignStats", "live"),
      (snap) => {
        if (snap.exists()) {
          setStats(snap.data());
        }
      }
    );
    return unsubscribe;
  }, []);

  return stats;
}
