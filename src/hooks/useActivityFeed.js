import { useState, useEffect } from "react";
import { useMock, db } from "@/lib/firebase";
import { mockFeed } from "@/data/mockFeed";

export function useActivityFeed(maxItems = 20) {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    if (useMock) {
      setFeed(mockFeed.slice(0, maxItems));
      return;
    }

    let unsubscribe;
    (async () => {
      const { collection, query, orderBy, limit, onSnapshot } = await import("firebase/firestore");
      const q = query(
        collection(db, "contactLogs"),
        orderBy("timestamp", "desc"),
        limit(maxItems)
      );
      unsubscribe = onSnapshot(q, (snap) => {
        setFeed(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    })();

    return () => unsubscribe?.();
  }, [maxItems]);

  return feed;
}
