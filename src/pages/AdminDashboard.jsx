import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignStats } from "@/hooks/useCampaignStats";
import { db } from "@/lib/firebase";

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

function StageBadge({ delegateId, currentStage }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function changeStage(newStage) {
    if (newStage === currentStage) { setOpen(false); return; }
    setSaving(true);
    try {
      const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
      await updateDoc(doc(db, "delegates", delegateId), {
        stage: newStage,
        stageHistory: arrayUnion({ stage: newStage, changedAt: new Date().toISOString(), changedBy: "admin" }),
      });
    } finally { setSaving(false); setOpen(false); }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${STAGE_COLORS[currentStage] || STAGE_COLORS.unknown}`}
      >
        {saving ? "…" : currentStage || "unknown"}
      </button>
      {open && (
        <div className="absolute z-10 top-7 left-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px]">
          {STAGES.map((s) => (
            <button key={s} onClick={() => changeStage(s)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${s === currentStage ? "font-bold" : ""}`}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const stats = useCampaignStats();
  const [delegates, setDelegates] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [precinctFilter, setPrecinctFilter] = useState("all");
  const [assigning, setAssigning] = useState({});

  useEffect(() => {
    let unsub;
    (async () => {
      const { collection, onSnapshot } = await import("firebase/firestore");
      unsub = onSnapshot(collection(db, "delegates"), (snap) => {
        setDelegates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    })();
    return () => unsub?.();
  }, []);

  useEffect(() => {
    let unsub;
    (async () => {
      const { collection, onSnapshot } = await import("firebase/firestore");
      unsub = onSnapshot(collection(db, "volunteers"), (snap) => {
        setVolunteers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    })();
    return () => unsub?.();
  }, []);

  async function assignDelegate(delegateId, volunteerId) {
    setAssigning((prev) => ({ ...prev, [delegateId]: true }));
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "delegates", delegateId), {
        assignedTo: volunteerId || null,
      });
    } finally {
      setAssigning((prev) => ({ ...prev, [delegateId]: false }));
    }
  }

  const committed = stats
    ? (stats.totalByStage?.committed || 0) + (stats.totalByStage?.locked || 0)
    : delegates.filter((d) => ["committed", "locked"].includes(d.stage)).length;
  const target = stats?.target || 53;
  const progressPct = Math.min(100, Math.round((committed / target) * 100));
  const days = daysUntil(CONVENTION_DATE);

  const precincts = [...new Set(delegates.map((d) => d.precinct).filter(Boolean))].sort();
  const filteredDelegates = delegates.filter((d) => {
    if (filter === "vacant") return d.isVacant;
    if (filter === "unassigned") return !d.assignedTo && !d.isVacant && !d.isOpposingCandidate;
    if (filter !== "all" && !["vacant", "unassigned"].includes(filter)) {
      if (d.stage !== filter) return false;
    }
    if (precinctFilter !== "all" && d.precinct !== precinctFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy text-white px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold tracking-widest opacity-60 uppercase">Wiley for HD21</span>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm opacity-70">{user?.name || user?.email}</span>
          <button onClick={signOut} className="text-sm opacity-70 hover:opacity-100 underline">Sign out</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Scoreboard */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-wrap items-center gap-8 mb-4">
            <div>
              <div className="text-3xl font-bold text-navy">
                {committed}<span className="text-gray-400 text-xl font-normal"> / {target}</span>
              </div>
              <div className="text-sm text-gray-500">Committed + Locked</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-coral">{days}</div>
              <div className="text-sm text-gray-500">Days until April 11</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-navy">{delegates.filter((d) => !d.isVacant && !d.isOpposingCandidate).length}</div>
              <div className="text-sm text-gray-500">Total delegates</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-navy">{volunteers.length}</div>
              <div className="text-sm text-gray-500">Volunteers</div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress to {target}</span><span>{progressPct}%</span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${progressPct}%`, backgroundColor: progressPct >= 100 ? "#22c55e" : "#034A76" }} />
              </div>
            </div>
          </div>
        </section>

        {/* Delegates table */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <h2 className="font-bold text-navy text-lg">All Delegates</h2>
            <div className="flex flex-wrap gap-2">
              {["all", "unassigned", "vacant", ...STAGES].map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    filter === f ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-300 hover:border-navy"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
            <select value={precinctFilter} onChange={(e) => setPrecinctFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-navy ml-auto">
              <option value="all">All Precincts</option>
              {precincts.map((p) => <option key={p} value={p}>{p}</option>)}
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
                  <th className="text-left pb-3 pr-4">Phone</th>
                  <th className="text-left pb-3">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {filteredDelegates.map((d) => (
                  <tr key={d.id} className={`border-b last:border-0 ${d.isOpposingCandidate ? "bg-red-50" : ""}`}>
                    <td className="py-2 pr-4 font-medium">
                      {d.isVacant ? (
                        <span className="text-gray-400 italic">[Vacant]</span>
                      ) : (
                        <>
                          {d.name}
                          {d.isOpposingCandidate && (
                            <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Opposing</span>
                          )}
                          {d.isPLEO && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">PLEO</span>
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
                        <StageBadge delegateId={d.id} currentStage={d.stage} />
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">{d.phone || "—"}</td>
                    <td className="py-2">
                      {d.isVacant || d.isOpposingCandidate ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : (
                        <select
                          value={d.assignedTo || ""}
                          disabled={assigning[d.id]}
                          onChange={(e) => assignDelegate(d.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-navy bg-white max-w-[160px]"
                        >
                          <option value="">— unassigned —</option>
                          {volunteers.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.firstName && v.lastName ? `${v.firstName} ${v.lastName}` : v.name || v.email}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDelegates.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">No delegates match this filter.</p>
            )}
          </div>
        </section>

        {/* Volunteers */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Volunteers ({volunteers.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase border-b">
                  <th className="text-left pb-3 pr-4">Name</th>
                  <th className="text-left pb-3 pr-4">Email</th>
                  <th className="text-left pb-3 pr-4">District</th>
                  <th className="text-left pb-3 pr-4">Phone</th>
                  <th className="text-left pb-3">Delegates Assigned</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map((v) => {
                  const assigned = delegates.filter((d) => d.assignedTo === v.id).length;
                  return (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {v.firstName && v.lastName ? `${v.firstName} ${v.lastName}` : v.name || "—"}
                        {v.role === "admin" && (
                          <span className="ml-2 text-xs bg-navy text-white px-1.5 py-0.5 rounded-full">Admin</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-500">{v.email}</td>
                      <td className="py-2 pr-4 text-gray-500">{v.houseDistrict ? `HD ${v.houseDistrict}` : "—"}</td>
                      <td className="py-2 pr-4 text-gray-500">{v.phone || "—"}</td>
                      <td className="py-2 font-semibold text-navy">{assigned}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
