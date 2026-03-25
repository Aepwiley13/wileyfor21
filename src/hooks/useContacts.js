import { useState, useEffect } from "react";
import { useMock, db } from "@/lib/firebase";
import { useAuth } from "./useAuth";
import { mockContacts } from "@/data/mockContacts";
import { sortByPriority } from "@/lib/utils";

export function useContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }

    if (useMock) {
      setContacts(sortByPriority(mockContacts.filter((c) => c.assignedTo === user.uid)));
      setLoading(false);
      return;
    }

    // Real Firestore mode
    let unsubscribe;
    (async () => {
      const { collection, query, where, onSnapshot } = await import("firebase/firestore");
      const q = query(
        collection(db, "delegates"),
        where("assignedTo", "array-contains", user.uid)
      );
      unsubscribe = onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setContacts(sortByPriority(docs));
        setLoading(false);
      });
    })();

    return () => unsubscribe?.();
  }, [user]);

  const updateContact = (id, updates) => {
    setContacts((prev) =>
      sortByPriority(prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
    );
  };

  return { contacts, loading, updateContact };
}
