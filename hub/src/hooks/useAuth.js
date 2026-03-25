import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

/**
 * Returns the current Firebase user, their /volunteers doc, loading state,
 * and a convenience isAdmin flag.
 *
 * Team B depends on this hook — do not rename or change the return shape.
 *
 * @returns {{ user, volunteer, loading, isAdmin }}
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "volunteers", firebaseUser.uid));
        setVolunteer(snap.exists() ? snap.data() : null);
        setUser(firebaseUser);
      } else {
        setUser(null);
        setVolunteer(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    volunteer,
    loading,
    isAdmin: volunteer?.role === "admin",
  };
}
