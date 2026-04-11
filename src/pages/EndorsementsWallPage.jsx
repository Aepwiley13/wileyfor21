import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db, useMock } from "@/lib/firebase";
import { mockEndorsements } from "@/lib/mockStore";
import PublicNav from "@/components/layout/PublicNav";

const FEATURED_ENDORSERS = [
  {
    name: "Rep. Sandra Hollins",
    role: "Rep. Sandra Hollins",
    title: "Current Utah House\nDistrict 21 Representative",
    initials: "SH",
  },
  {
    name: "Rep. Ashlee Matthews",
    role: "Rep. Ashlee Matthews",
    title: "Utah House of\nRepresentatives",
    initials: "AM",
  },
  {
    name: "Rep. Rosalba Dominguez",
    role: "Rep. Rosalba Dominguez",
    title: "Utah House of\nRepresentatives",
    initials: "RD",
  },
  {
    name: "Councilwoman Natalie Pinkney",
    role: "Natalie Pinkney",
    title: "Salt Lake County\nCouncil",
    initials: "NP",
  },
  {
    name: "Liban Mohamed",
    role: "Liban Mohamed",
    title: "1st Congressional\nDistrict Candidate",
    initials: "LM",
  },
];

function FeaturedEndorserCard({ endorser }) {
  return (
    <div className="relative flex flex-col rounded-2xl overflow-hidden shadow-lg" style={{ background: "linear-gradient(160deg, #001f3f 0%, #002A52 55%, #034A76 100%)" }}>
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: "#F36F6B" }} />

      <div className="flex flex-col items-center text-center px-4 pt-6 pb-5 gap-3 flex-1">
        {/* Avatar */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 border-2"
          style={{ borderColor: "#F36F6B", background: "rgba(243,111,107,0.15)" }}
        >
          <span className="font-condensed font-black text-xl text-white tracking-wide">
            {endorser.initials}
          </span>
        </div>

        {/* Name */}
        <div>
          <p className="font-condensed font-black text-white text-lg leading-tight tracking-wide uppercase whitespace-pre-line">
            {endorser.title}
          </p>
          <p className="text-white/50 text-xs mt-1 font-medium">{endorser.role}</p>
        </div>

        {/* Endorsed badge */}
        <div className="flex items-center gap-1.5 mt-auto">
          <div
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.4)" }}
          >
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-condensed font-bold text-white text-sm tracking-widest uppercase">
            Endorsed
          </span>
        </div>
      </div>

      {/* Bottom branding strip */}
      <div className="px-4 py-2 text-center" style={{ background: "rgba(0,0,0,0.25)" }}>
        <p className="font-condensed font-bold text-white/60 text-xs tracking-widest uppercase">
          Aaron Wiley · District 21
        </p>
      </div>
    </div>
  );
}

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

      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* ── Featured Endorsers ── */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="font-condensed font-black text-4xl text-navy leading-tight">
              Official Endorsements
            </h2>
            <p className="text-gray-500 text-sm mt-1">Elected leaders and community champions standing with Aaron</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {FEATURED_ENDORSERS.map((e) => (
              <FeaturedEndorserCard key={e.name} endorser={e} />
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="font-condensed font-bold text-gray-400 text-sm tracking-widest uppercase whitespace-nowrap">
            + Community Endorsers
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* ── Community endorsements ── */}
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

        {loading && (
          <div className="text-center py-16 text-gray-400 text-sm">Loading endorsements...</div>
        )}

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

        {!loading && endorsements.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {endorsements.map((e) => (
              <div
                key={e.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3"
              >
                {e.why && (
                  <p className="text-gray-700 text-sm leading-relaxed italic flex-1">
                    &ldquo;{e.why}&rdquo;
                  </p>
                )}
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
                  <div>
                    <p className="font-semibold text-gray-900 text-sm leading-tight">
                      {e.firstName} {e.lastName}
                    </p>
                    {e.title && (
                      <p className="text-xs text-coral font-medium mt-0.5">{e.title}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

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
