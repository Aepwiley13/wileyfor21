import { useState, useEffect } from "react";
import { db, useMock } from "@/lib/firebase";

const MOCK_INSIGHTS = {
  completedCount: 7,
  topIssues: [
    { label: "Cost of living & affordability", count: 6 },
    { label: "Housing affordability & displacement", count: 5 },
    { label: "Access to healthcare (including mental health)", count: 4 },
    { label: "Public education funding", count: 3 },
  ],
};

export function useDelegateInsights() {
  const [insights, setInsights] = useState({ completedCount: 0, topIssues: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (useMock) {
      setInsights(MOCK_INSIGHTS);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { collection, getDocs, query, where } = await import("firebase/firestore");
        const q = query(
          collection(db, "delegates"),
          where("survey.completed", "==", true)
        );
        const snap = await getDocs(q);
        const counts = {};
        snap.forEach((doc) => {
          const priorities = doc.data()?.survey?.topPriorities || [];
          priorities.forEach((p) => {
            counts[p] = (counts[p] || 0) + 1;
          });
        });
        const topIssues = Object.entries(counts)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);
        setInsights({ completedCount: snap.size, topIssues });
      } catch {
        // Firestore rules may restrict access — silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { insights, loading };
}
