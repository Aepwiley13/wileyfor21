import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useCampaignStats } from "../hooks/useCampaignStats";
import { useAuth } from "../hooks/useAuth";
import InlineStageEditor from "../components/InlineStageEditor";

const CONVENTION_DATE = new Date("2026-04-11T09:00:00");
const STAGES = ["locked", "committed", "leaning", "engaged", "identified", "unknown", "not_winnable"];
const STAGE_COLORS = {
  unknown:      "bg-gray-100 text-gray-600",
  identified:   "bg-blue-100 text-blue-700",
  engaged:      "bg-yellow-100 text-yellow-700",
  leaning:      "bg-orange-100 text-orange-700",
  committed:    "bg-green-100 text-green-700",
  locked:       "bg-green-600 text-white",
  not_winnable: "bg-red-100 text-red-600",
};

function daysUntil(date) {
  return Math.max(0, Math.ceil((date - Date.now()) / (1000 * 60 * 60 * 24)));
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { volunteer } = useAuth();
  const stats = useCampaignStats();

  const [delegates, setDelegates] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [atRisk, setAtRisk] = useState([]);
  const [filter, setFilter] = useState("all");
  const [precinctFilter, setPrecinctFilter] = useState("all");

  // Load all delegates in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "delegates"), (snap) => {
      setDelegates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Today's contact feed — last 20 logs ordered by createdAt desc
  useEffect(() => {
    const q = query(
      collection(db, "contactLogs"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRecentLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // At-risk delegates (no contact in 14+ days)
  // NOTE: This compound query requires a Firestore composite index.
  // If it fails on first load, Firestore will log a URL to create the index.
  useEffect(() => {
    const fourteenDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    );

    const q = query(
      collection(db, "delegates"),
      where("lastContactedAt", "<", fourteenDaysAgo),
      where("isVacant", "==", false),
      where("isOpposingCandidate", "==", false)
    );

    getDocs(q)
      .then((snap) => {
        const results = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((d) => !["locked", "not_winnable"].includes(d.stage));
        setAtRisk(results);
      })
      .catch((err) => {
        // Firestore will print a link to create the composite index
        console.warn("At-risk query needs a composite index:", err.message);
      });
  }, []);

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  // Derived values
  const committed = stats
    ? (stats.totalByStage?.committed || 0) + (stats.totalByStage?.locked || 0)
    : 0;
  const target = stats?.target || 53;
  const progressPct = Math.min(100, Math.round((committed / target) * 100));
  const days = daysUntil(CONVENTION_DATE);

  // Filtered delegate list
  const precincts = [...new Set(delegates.map((d) => d.precinct))].sort();
  const filteredDelegates = delegates.filter((d) => {
    if (filter === "vacant") return d.isVacant;
    if (filter !== "all" && filter !== "precinct") {
      if (d.stage !== filter) return false;
    }
    if (precinctFilter !== "all" && d.precinct !== precinctFilter) return false;
    return true;
  });

  const leaningCandidates = [
    { key: "aaron",      label: "Aaron Wiley"      },
    { key: "undecided",  label: "Undecided"         },
    { key: "lock",       label: "Jeneanne Lock"     },
    { key: "mann",       label: "Darin Mann"        },
    { key: "washburn",   label: "Anthony Washburn"  },
    { key: "otterstrom", label: "S. Otterstrom"     },
    { key: "ord_was",    label: "Was Ord"           },
    { key: "refused",    label: "Refused"           },
  ];

  const maxLeaning = stats
    ? Math.max(1, ...leaningCandidates.map((c) => stats.leaningByCandidate?.[c.key] || 0))
    : 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-navy text-white px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold tracking-widest opacity-60 uppercase">
            Wiley for HD21
          </span>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm opacity-70 hover:opacity-100 underline"
        >
          Log out
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* ── SCOREBOARD BAR ─────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-wrap items-center gap-8 mb-4">
            <div>
              <div className="text-3xl font-bold text-navy">
                {committed}
                <span className="text-gray-400 text-xl font-normal"> / {target}</span>
              </div>
              <div className="text-sm text-gray-500">Committed + Locked</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-coral">{days}</div>
              <div className="text-sm text-gray-500">Days until April 11</div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress to {target}</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: progressPct >= 100 ? "#22c55e" : "#034A76",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── STAGE BREAKDOWN + CANDIDATE SUPPORT ───────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stage breakdown */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-navy mb-4">Stage Breakdown</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase border-b">
                  <th className="text-left pb-2">Stage</th>
                  <th className="text-right pb-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {STAGES.map((s) => {
                  const count = stats?.totalByStage?.[s] ?? 0;
                  return (
                    <tr key={s} className="border-b last:border-0">
                      <td className="py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[s]}`}
                        >
                          {s}
                        </span>
                      </td>
                      <td className="text-right py-2 font-semibold">{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Candidate support */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-navy mb-4">Candidate Support</h2>
            <div className="space-y-3">
              {leaningCandidates.map(({ key, label }) => {
                const count = stats?.leaningByCandidate?.[key] || 0;
                const pct = Math.round((count / maxLeaning) * 100);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={key === "aaron" ? "font-bold text-navy" : "text-gray-600"}>
                        {label}
                      </span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: key === "aaron" ? "#034A76" : key === "lock" ? "#dc2626" : "#9ca3af",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── TODAY'S CONTACTS + AT-RISK ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's contacts feed */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-navy mb-4">Recent Contacts</h2>
            {recentLogs.length === 0 ? (
              <p className="text-gray-400 text-sm">No contacts logged yet.</p>
            ) : (
              <ul className="space-y-3 max-h-72 overflow-y-auto">
                {recentLogs.map((log) => (
                  <li key={log.id} className="text-sm border-b pb-2 last:border-0">
                    <span className="font-medium">{log.delegateName || "—"}</span>
                    <span className="text-gray-400 mx-1">·</span>
                    <span className="text-gray-500">{log.volunteerName || "volunteer"}</span>
                    {log.stageAfterContact && (
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${STAGE_COLORS[log.stageAfterContact] || ""}`}
                      >
                        → {log.stageAfterContact}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* At-risk delegates */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-navy mb-1">At-Risk Delegates</h2>
            <p className="text-xs text-gray-400 mb-4">No contact in 14+ days</p>
            {atRisk.length === 0 ? (
              <p className="text-green-600 text-sm font-medium">
                All delegates recently contacted.
              </p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {atRisk.map((d) => (
                  <li key={d.id} className="text-sm flex items-center justify-between border-b pb-1 last:border-0">
                    <span>{d.name}</span>
                    <span className="text-gray-400 text-xs">{d.precinct}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── DELEGATE TABLE ─────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <h2 className="font-bold text-navy text-lg">All Delegates</h2>

            {/* Stage filter */}
            <div className="flex flex-wrap gap-2">
              {["all", "vacant", ...STAGES].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    filter === f
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-gray-600 border-gray-300 hover:border-navy"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Precinct filter */}
            <select
              value={precinctFilter}
              onChange={(e) => setPrecinctFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-navy"
            >
              <option value="all">All Precincts</option>
              {precincts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase border-b">
                  <th className="text-left pb-3 pr-4">Name</th>
                  <th className="text-left pb-3 pr-4">Precinct</th>
                  <th className="text-left pb-3 pr-4">Role</th>
                  <th className="text-left pb-3 pr-4">Stage</th>
                  <th className="text-left pb-3 pr-4">Leaning</th>
                  <th className="text-left pb-3">Contacts</th>
                </tr>
              </thead>
              <tbody>
                {filteredDelegates.map((d) => (
                  <tr
                    key={d.id}
                    className={`border-b last:border-0 ${
                      d.isOpposingCandidate ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="py-2 pr-4 font-medium">
                      {d.isVacant ? (
                        <span className="text-gray-400 italic">[Vacant]</span>
                      ) : (
                        <>
                          {d.name}
                          {d.isOpposingCandidate && (
                            <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                              Opposing
                            </span>
                          )}
                          {d.isPLEO && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">
                              PLEO
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{d.precinct}</td>
                    <td className="py-2 pr-4 text-gray-500">{d.role}</td>
                    <td className="py-2 pr-4">
                      {d.isVacant || d.isOpposingCandidate ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : (
                        <InlineStageEditor
                          delegateId={d.id}
                          currentStage={d.stage || "unknown"}
                        />
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">
                      {d.currentLeaning || "—"}
                    </td>
                    <td className="py-2 text-gray-500">{d.totalContacts || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredDelegates.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">
                No delegates match this filter.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
