import { useEffect, useState } from "react";
import { useMock, db } from "@/lib/firebase";

export function useCampaignStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (useMock) return;
    let unsubscribe;
    (async () => {
      const { doc, onSnapshot } = await import("firebase/firestore");
      unsubscribe = onSnapshot(doc(db, "campaignStats", "live"), (snap) => {
        if (snap.exists()) setStats(snap.data());
      });
    })();
    return () => unsubscribe?.();
  }, []);

  return stats;
}
