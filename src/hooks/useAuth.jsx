import { useState, useEffect, createContext, useContext } from "react";
import { useMock, auth } from "@/lib/firebase";

const MOCK_USER = {
  uid: "vol_001",
  displayName: "Demo Volunteer",
  email: "demo@wileyfor21.com",
  name: "Demo Volunteer",
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(useMock ? MOCK_USER : null);
  const [loading, setLoading] = useState(!useMock);

  useEffect(() => {
    if (useMock) return;
    import("firebase/auth").then(({ onAuthStateChanged }) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u ? { uid: u.uid, displayName: u.displayName, email: u.email, name: u.displayName } : null);
        setLoading(false);
      });
      return unsub;
    });
  }, []);

  const signIn = async (email, password) => {
    if (useMock) {
      setUser(MOCK_USER);
      return;
    }
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setUser({ uid: cred.user.uid, displayName: cred.user.displayName, email: cred.user.email, name: cred.user.displayName });
  };

  const signOut = async () => {
    if (useMock) {
      setUser(null);
      return;
    }
    const { signOut: fbSignOut } = await import("firebase/auth");
    await fbSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
