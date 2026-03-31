import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db, useMock } from "@/lib/firebase";
import PublicNav from "@/components/layout/PublicNav";

// Shared mock store with EndorsementPage
const mockEndorsements = [];

export default function EndorsementsWallPage() {
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (useMock) {
      setEndorsements([...mockEndorsements]);
      setLoading(false);
      return;
    }
    if (!db) {
      setLoading(false);
      return;
    }
    let unsubscribe;
    (async () => {
      const { collection, query, orderBy, onSnapshot } = await import("firebase/firestore");
      const q = query(collection(db, "endorsements"), orderBy("createdAt", "desc"));
      unsubscribe = onSnapshot(q, (snap) => {
        setEndorsements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    })();
    return () => unsubscribe?.();
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <PublicNav />
      <header className="bg-navy text-white py-8 px-4 text-center">
        <h1 className="font-condensed font-black text-4xl tracking-wide">WILEY FOR 21</h1>
        <p className="text-white/60 text-sm mt-1">Utah House District 21 · April 11, 2026</p>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Title row */}
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <h2 className="font-condensed font-black text-4xl text-navy leading-tight">
              People Endorsing Aaron
            </h2>
            {!loading && (
              <p className="text-gray-500 text-sm mt-1">
                {endorsements.length} neighbor{endorsements.length !== 1 ? "s" : ""} standing up for District 21
              </p>
            )}
          </div>
          <Link
            to="/endorse"
            className="inline-block px-5 py-2.5 rounded-xl bg-coral text-white font-condensed font-bold text-base hover:bg-coral/90 transition-colors"
          >
            Add Your Endorsement
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-gray-400 text-sm">Loading endorsements...</div>
        )}

        {/* Empty state */}
        {!loading && endorsements.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-base mb-4">No endorsements yet — be the first!</p>
            <Link
              to="/endorse"
              className="inline-block px-6 py-3 rounded-xl bg-coral text-white font-condensed font-bold text-lg hover:bg-coral/90 transition-colors"
            >
              Endorse Aaron
            </Link>
          </div>
        )}

        {/* Endorsement cards */}
        {!loading && endorsements.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {endorsements.map((e) => (
              <div
                key={e.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3"
              >
                {/* Quote */}
                {e.why && (
                  <p className="text-gray-700 text-sm leading-relaxed italic flex-1">
                    &ldquo;{e.why}&rdquo;
                  </p>
                )}

                {/* Person */}
                <div className="flex items-center gap-3 mt-auto pt-3 border-t border-gray-100">
                  {e.photoURL ? (
                    <img
                      src={e.photoURL}
                      alt={`${e.firstName} ${e.lastName}`}
                      className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-navy flex items-center justify-center text-white font-condensed font-bold text-base flex-shrink-0">
                      {e.firstName?.[0]}{e.lastName?.[0]}
                    </div>
                  )}
                  <p className="font-semibold text-gray-900 text-sm leading-tight">
                    {e.firstName} {e.lastName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CTA banner */}
      {!loading && endorsements.length > 0 && (
        <div className="bg-navy mt-16 py-10 px-4 text-center">
          <h3 className="font-condensed font-bold text-white text-2xl mb-3">
            Join {endorsements.length} neighbor{endorsements.length !== 1 ? "s" : ""} backing Aaron
          </h3>
          <Link
            to="/endorse"
            className="inline-block px-8 py-3 rounded-xl bg-coral text-white font-condensed font-bold text-lg hover:bg-coral/90 transition-colors"
          >
            Add Your Endorsement
          </Link>
        </div>
      )}

      <footer className="text-center text-xs text-gray-400 py-6 border-t border-gray-200 mt-0">
        Paid for by Wiley for House District 21
      </footer>
    </div>
  );
}
