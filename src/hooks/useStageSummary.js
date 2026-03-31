import { useEffect, useState } from "react";
import { useMock, db } from "@/lib/firebase";
import { mockContacts } from "@/data/mockContacts";
import { TARGET_DELEGATES } from "@/lib/constants";

const WIN_MINIMUM = 46;

function computeSummary(delegates) {
  const stageCounts = {
    locked: 0,
    committed: 0,
    leaning: 0,
    engaged: 0,
    identified: 0,
    unknown: 0,
    not_winnable: 0,
  };
  for (const d of delegates) {
    if (d.isDeferred) continue;
    const s = d.stage || "unknown";
    if (s in stageCounts) stageCounts[s]++;
    else stageCounts.unknown++;
  }
  const committedTotal = stageCounts.locked + stageCounts.committed;
  const total = delegates.filter((d) => !d.isDeferred).length;
  return {
    stageCounts,
    total,
    committedTotal,
    needed: Math.max(0, TARGET_DELEGATES - committedTotal),
    winMinimum: WIN_MINIMUM,
  };
}

export function useStageSummary() {
  const [summary, setSummary] = useState(() => useMock ? computeSummary(mockContacts) : null);

  useEffect(() => {
    if (useMock) {
      setSummary(computeSummary(mockContacts));
      return;
    }

    let unsubscribe;
    (async () => {
      const { collection, onSnapshot } = await import("firebase/firestore");
      unsubscribe = onSnapshot(collection(db, "delegates"), (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSummary(computeSummary(docs));
      });
    })();

    return () => unsubscribe?.();
  }, []);

  return summary;
}
