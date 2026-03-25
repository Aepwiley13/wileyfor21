import { useState, useEffect } from "react";
import { useMock, db } from "@/lib/firebase";
import { mockFeed } from "@/data/mockFeed";

export function useLeaderboard(currentUserId) {
  const [data, setData] = useState({ top5: [], myRank: null });

  useEffect(() => {
    if (useMock) {
      const counts = {};
      mockFeed.forEach(({ volunteerId, volunteerName }) => {
        const id = volunteerId || volunteerName;
        if (!counts[id]) counts[id] = { name: volunteerName, contacts: 0 };
        counts[id].contacts++;
      });
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1].contacts - a[1].contacts)
        .map(([id, d], i) => ({ rank: i + 1, id, ...d }));
      setData({
        top5: sorted.slice(0, 5),
        myRank: sorted.find((v) => v.id === currentUserId || v.name === "Demo Volunteer") || null,
      });
      return;
    }

    (async () => {
      const { collection, query, where, getDocs, Timestamp } = await import("firebase/firestore");
      const weekStart = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const snap = await getDocs(
        query(collection(db, "contactLogs"), where("timestamp", ">=", weekStart))
      );
      const counts = {};
      snap.forEach((doc) => {
        const { volunteerId, volunteerName } = doc.data();
        if (!counts[volunteerId]) counts[volunteerId] = { name: volunteerName, contacts: 0 };
        counts[volunteerId].contacts++;
      });
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1].contacts - a[1].contacts)
        .map(([id, d], i) => ({ rank: i + 1, id, ...d }));
      setData({
        top5: sorted.slice(0, 5),
        myRank: sorted.find((v) => v.id === currentUserId) || null,
      });
    })();
  }, [currentUserId]);

  return data;
}
