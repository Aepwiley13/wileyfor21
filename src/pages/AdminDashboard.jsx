import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignStats } from "@/hooks/useCampaignStats";
import { db } from "@/lib/firebase";

function parseCSVLines(text) {
  const lines = text.trim().split("\n");
  const headers = [];
  // Parse header row respecting quotes
  let cur = "", inQuote = false;
  for (const ch of lines[0]) {
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === "," && !inQuote) { headers.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  headers.push(cur.trim());

  return lines.slice(1).map((line) => {
    const fields = [];
    cur = ""; inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { fields.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    fields.push(cur.trim());
    return { _headers: headers, ...Object.fromEntries(headers.map((h, i) => [h, (fields[i] || "").trim()])) };
  });
}

// Finds a column by partial case-insensitive match
function col(row, ...patterns) {
  for (const pattern of patterns) {
    const key = row._headers.find((h) => h.toLowerCase().includes(pattern.toLowerCase()));
    if (key && row[key]) return row[key].trim();
  }
  return "";
}

function mapRow(row) {
  const headers = row._headers.map((h) => h.toLowerCase());
  const isNewFormat = headers.some((h) => h.includes("first name"));

  let name, precinct, role, phone, email, address;

  if (isNewFormat) {
    // Exact column names: "First Name:", "Middle Name:", "Last Name:",
    // "Precinct ABCXXX:", "Precinct Office:", "Phone #:", "Email:",
    // "Street Address:", "City:", "State:", "Zip:"
    const get = (exact) => {
      // Try exact, then with/without trailing colon
      const key = row._headers.find(
        (h) => h === exact || h === exact + ":" || h === exact.replace(/:$/, "")
      );
      return key ? (row[key] || "").trim() : "";
    };

    name = [get("First Name:"), get("Middle Name:"), get("Last Name:")].filter(Boolean).join(" ");
    precinct = get("Precinct ABCXXX:");
    role = get("Precinct Office:");
    phone = get("Phone #:");
    email = get("Email:");
    const street = get("Street Address:");
    const city = get("City:");
    // Use exact "State:" to avoid matching "State House District" etc.
    const state = get("State:");
    const zip = get("Zip:");
    address = [street, city, state, zip].filter(Boolean).join(", ");
  } else {
    // Original format: name, precinct, role, phone, email, address
    name = (row.name || "").trim();
    precinct = (row.precinct || "").trim();
    role = (row.role || "").trim();
    phone = (row.phone || "").trim();
    email = (row.email || "").trim();
    address = (row.address || "").trim();
  }

  return { name, precinct, role, phone, email, address };
}

function AddDelegateModal({ onClose, onAdded, delegate }) {
  const isEdit = Boolean(delegate);
  const [form, setForm] = useState({
    name: delegate?.name || "",
    precinct: delegate?.precinct || "",
    role: delegate?.role || "",
    phone: delegate?.phone || "",
    email: delegate?.email || "",
    address: delegate?.address || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const isPLEO = form.role.toUpperCase().includes("PLEO");
      const isLock = form.name.trim() === "Jeneanne Lock";
      if (isEdit) {
        const { doc, updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "delegates", delegate.id), {
          name: form.name.trim(),
          precinct: form.precinct.trim(),
          role: form.role.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          isPLEO,
          conflictOfInterest: isLock,
          isOpposingCandidate: isLock,
        });
      } else {
        const { collection, addDoc } = await import("firebase/firestore");
        await addDoc(collection(db, "delegates"), {
          name: form.name.trim(),
          precinct: form.precinct.trim(),
          role: form.role.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          district: "HD21",
          stage: "unknown",
          stageHistory: [],
          currentLeaning: "undecided",
          leaningHistory: [],
          assignedTo: null,
          lastContactedAt: null,
          totalContacts: 0,
          conflictOfInterest: isLock,
          isOpposingCandidate: isLock,
          isPLEO,
          isVacant: false,
        });
      }
      onAdded?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save delegate. Check console.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy">{isEdit ? "Edit Delegate" : "Add Delegate"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Precinct</label>
              <input
                value={form.precinct}
                onChange={(e) => set("precinct", e.target.value)}
                placeholder="e.g. SLC030"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
              <input
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="e.g. P Chair"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="801-555-1234"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="jane@example.com"
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="123 Main St, Salt Lake City, UT 84101"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-navy text-white hover:bg-navy/90 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Delegate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CsvImporter({ onImported }) {
  const fileRef = useRef();
  const [status, setStatus] = useState(null);
  const [counts, setCounts] = useState({ done: 0, total: 0 });
  const [clearing, setClearing] = useState(false);

  async function clearDelegates() {
    if (!window.confirm("Delete ALL existing delegates before reimporting? This cannot be undone.")) return;
    setClearing(true);
    try {
      const { collection, getDocs, deleteDoc } = await import("firebase/firestore");
      const snap = await getDocs(collection(db, "delegates"));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    } finally {
      setClearing(false);
    }
    onImported?.();
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("importing");
    setCounts({ done: 0, total: 0 });
    try {
      const text = await file.text();
      const rows = parseCSVLines(text);
      setCounts({ done: 0, total: rows.length });
      const { collection, addDoc } = await import("firebase/firestore");
      let done = 0;
      for (const row of rows) {
        const { name, precinct, role, phone, email, address } = mapRow(row);
        const isVacant = !name;
        const isPLEO = role.toUpperCase().includes("PLEO");
        const isLock = name === "Jeneanne Lock";
        await addDoc(collection(db, "delegates"), {
          name, precinct, role, phone, email, address,
          district: "HD21",
          stage: "unknown",
          stageHistory: [],
          currentLeaning: "undecided",
          leaningHistory: [],
          assignedTo: null,
          lastContactedAt: null,
          totalContacts: 0,
          conflictOfInterest: isLock,
          isOpposingCandidate: isLock,
          isPLEO,
          isVacant,
        });
        done++;
        setCounts({ done, total: rows.length });
      }
      setStatus("done");
      onImported?.();
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
    fileRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      <button
        onClick={() => fileRef.current.click()}
        disabled={status === "importing" || clearing}
        className="px-4 py-2 text-sm font-semibold rounded-lg border border-navy text-navy hover:bg-navy hover:text-white transition-colors disabled:opacity-50"
      >
        {status === "importing" ? `Importing… ${counts.done}/${counts.total}` : "Import CSV"}
      </button>
      <button
        onClick={clearDelegates}
        disabled={status === "importing" || clearing}
        className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-400 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {clearing ? "Clearing…" : "Clear All Delegates"}
      </button>
      {status === "done" && <span className="text-green-600 text-sm font-medium">Imported {counts.total} delegates</span>}
      {status === "error" && <span className="text-red-600 text-sm">Import failed — check console</span>}
    </div>
  );
}

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

// Normalize assignedTo to always be an array
function getAssigned(d) {
  if (!d.assignedTo) return [];
  if (Array.isArray(d.assignedTo)) return d.assignedTo;
  return [d.assignedTo]; // legacy single-string value
}

function StageBadge({ delegateId, currentStage }) {
  const [saving, setSaving] = useState(false);

  async function changeStage(newStage) {
    if (newStage === currentStage) return;
    setSaving(true);
    try {
      const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
      await updateDoc(doc(db, "delegates", delegateId), {
        stage: newStage,
        stageHistory: arrayUnion({ stage: newStage, changedAt: new Date().toISOString(), changedBy: "admin" }),
      });
    } finally { setSaving(false); }
  }

  return (
    <select
      value={currentStage || "unknown"}
      onChange={(e) => changeStage(e.target.value)}
      disabled={saving}
      className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer border-0 outline-none appearance-none ${STAGE_COLORS[currentStage] || STAGE_COLORS.unknown}`}
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

// Per-row assignment tags with add/remove
function AssignmentCell({ delegate, volunteers }) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const assigned = getAssigned(delegate);
  const unassigned = volunteers.filter((v) => !assigned.includes(v.id));

  async function add(volunteerId) {
    if (!volunteerId) return;
    setSaving(true);
    try {
      const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
      await updateDoc(doc(db, "delegates", delegate.id), { assignedTo: arrayUnion(volunteerId) });
    } finally { setSaving(false); setAdding(false); }
  }

  async function remove(volunteerId) {
    setSaving(true);
    try {
      const { doc, updateDoc, arrayRemove } = await import("firebase/firestore");
      await updateDoc(doc(db, "delegates", delegate.id), { assignedTo: arrayRemove(volunteerId) });
    } finally { setSaving(false); }
  }

  const volName = (v) => v.firstName ? `${v.firstName} ${v.lastName}` : v.name || v.email;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {assigned.map((uid) => {
        const v = volunteers.find((x) => x.id === uid);
        return v ? (
          <span key={uid} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
            {volName(v)}
            <button onClick={() => remove(uid)} disabled={saving} className="text-blue-400 hover:text-red-500 leading-none">×</button>
          </span>
        ) : null;
      })}
      {adding ? (
        <select autoFocus onChange={(e) => add(e.target.value)} onBlur={() => setAdding(false)} disabled={saving}
          className="text-xs border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none bg-white max-w-[140px]">
          <option value="">— pick volunteer —</option>
          {unassigned.map((v) => <option key={v.id} value={v.id}>{volName(v)}</option>)}
        </select>
      ) : (
        unassigned.length > 0 && (
          <button onClick={() => setAdding(true)} disabled={saving}
            className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 rounded-full w-5 h-5 flex items-center justify-center font-bold">
            +
          </button>
        )
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const stats = useCampaignStats();
  const [delegates, setDelegates] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [filter, setFilter] = useState("active");   // default: hide deferred
  const [precinctFilter, setPrecinctFilter] = useState("all");
  const [showDeferred, setShowDeferred] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkVolunteer, setBulkVolunteer] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [showAddDelegate, setShowAddDelegate] = useState(false);
  const [editingDelegate, setEditingDelegate] = useState(null);

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

  // Defer / undeferselected rows
  async function setDeferred(ids, value) {
    setBulkSaving(true);
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      await Promise.all([...ids].map((id) => updateDoc(doc(db, "delegates", id), { isDeferred: value })));
      setSelected(new Set());
    } finally { setBulkSaving(false); }
  }

  // Defer all P Vice at once
  async function deferAllPVice() {
    if (!window.confirm("Defer all P Vice delegates? They'll be hidden from the active list.")) return;
    const pvice = delegates.filter((d) => !d.isVacant && d.role?.includes("P Vice"));
    await setDeferred(pvice.map((d) => d.id), true);
  }

  async function deleteDelegate(id, name) {
    if (!window.confirm(`Delete "${name || "this delegate"}" permanently? This cannot be undone.`)) return;
    const { doc, deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "delegates", id));
  }

  // Bulk assign selected delegates to a volunteer (adds, doesn't replace)
  async function bulkAssign() {
    if (!bulkVolunteer || selected.size === 0) return;
    setBulkSaving(true);
    try {
      const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
      await Promise.all([...selected].map((id) =>
        updateDoc(doc(db, "delegates", id), { assignedTo: arrayUnion(bulkVolunteer) })
      ));
      setSelected(new Set());
      setBulkVolunteer("");
    } finally { setBulkSaving(false); }
  }

  const committed = stats
    ? (stats.totalByStage?.committed || 0) + (stats.totalByStage?.locked || 0)
    : delegates.filter((d) => ["committed", "locked"].includes(d.stage) && !d.isDeferred && !d.isVacant && !d.isOpposingCandidate).length;
  const target = stats?.target || 53;
  const progressPct = Math.min(100, Math.round((committed / target) * 100));
  const days = daysUntil(CONVENTION_DATE);

  const precincts = [...new Set(delegates.map((d) => d.precinct).filter(Boolean))].sort();

  const filteredDelegates = delegates.filter((d) => {
    // Deferred visibility
    if (!showDeferred && d.isDeferred) return false;
    if (showDeferred && !d.isDeferred) return false;

    if (filter === "vacant") return d.isVacant;
    if (filter === "unassigned") return getAssigned(d).length === 0 && !d.isVacant && !d.isOpposingCandidate;
    if (filter === "active") {
      // active = not vacant, not opposing, not deferred
      if (d.isVacant || d.isOpposingCandidate) return false;
    } else if (filter !== "all") {
      if (d.stage !== filter) return false;
    }
    if (precinctFilter !== "all" && d.precinct !== precinctFilter) return false;
    return true;
  });

  const allVisibleIds = filteredDelegates
    .filter((d) => !d.isVacant && !d.isOpposingCandidate)
    .map((d) => d.id);
  const allChecked = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allChecked) {
      setSelected((s) => { const n = new Set(s); allVisibleIds.forEach((id) => n.delete(id)); return n; });
    } else {
      setSelected((s) => new Set([...s, ...allVisibleIds]));
    }
  }

  function toggleOne(id) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const volName = (v) => v.firstName ? `${v.firstName} ${v.lastName}` : v.name || v.email;

  return (
    <div className="min-h-screen bg-gray-50">
      {showAddDelegate && (
        <AddDelegateModal
          onClose={() => setShowAddDelegate(false)}
          onAdded={() => {}}
        />
      )}
      {editingDelegate && (
        <AddDelegateModal
          delegate={editingDelegate}
          onClose={() => setEditingDelegate(null)}
          onAdded={() => {}}
        />
      )}
      <header className="bg-navy text-white px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold tracking-widest opacity-60 uppercase">Wiley for HD21</span>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm opacity-70">{user?.name || user?.email}</span>
          <a href="/volunteer" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">My Dashboard</a>
          <button onClick={signOut} className="text-sm opacity-70 hover:opacity-100 underline">Sign out</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Scoreboard */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-wrap items-center gap-8">
            <div>
              <div className="text-3xl font-bold text-navy">{committed}<span className="text-gray-400 text-xl font-normal"> / {target}</span></div>
              <div className="text-sm text-gray-500">Committed + Locked</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-coral">{days}</div>
              <div className="text-sm text-gray-500">Days until April 11</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-navy">{delegates.filter((d) => !d.isVacant && !d.isOpposingCandidate && !d.isDeferred).length}</div>
              <div className="text-sm text-gray-500">Active delegates</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-400">{delegates.filter((d) => d.isDeferred).length}</div>
              <div className="text-sm text-gray-500">Deferred</div>
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
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="font-bold text-navy text-lg">Delegates</h2>
            <CsvImporter onImported={() => {}} />
            <button
              onClick={() => setShowAddDelegate(true)}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-navy text-white hover:bg-navy/90 transition-colors">
              + Add Delegate
            </button>
            <button onClick={deferAllPVice}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-yellow-400 text-yellow-700 hover:bg-yellow-50 transition-colors">
              Defer all P Vice
            </button>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Active / Deferred toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
              <button onClick={() => { setShowDeferred(false); setFilter("active"); }}
                className={`px-3 py-1.5 transition-colors ${!showDeferred ? "bg-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                Active
              </button>
              <button onClick={() => { setShowDeferred(true); setFilter("all"); }}
                className={`px-3 py-1.5 transition-colors ${showDeferred ? "bg-yellow-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                Deferred
              </button>
            </div>

            {!showDeferred && ["all", "unassigned", "vacant", ...STAGES].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  filter === f ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-300 hover:border-navy"
                }`}>
                {f}
              </button>
            ))}

            <select value={precinctFilter} onChange={(e) => setPrecinctFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none ml-auto">
              <option value="all">All Precincts</option>
              {precincts.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Bulk action bar — visible when rows are checked */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
              <span className="text-sm font-semibold text-blue-700">{selected.size} selected</span>
              <select value={bulkVolunteer} onChange={(e) => setBulkVolunteer(e.target.value)}
                className="text-sm border border-blue-300 rounded-lg px-2 py-1.5 focus:outline-none bg-white">
                <option value="">Assign to volunteer…</option>
                {volunteers.map((v) => <option key={v.id} value={v.id}>{volName(v)}</option>)}
              </select>
              <button onClick={bulkAssign} disabled={!bulkVolunteer || bulkSaving}
                className="px-3 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
                {bulkSaving ? "Assigning…" : "Assign"}
              </button>
              <button onClick={() => setDeferred(selected, true)} disabled={bulkSaving}
                className="px-3 py-1.5 text-sm font-semibold border border-yellow-400 text-yellow-700 rounded-lg hover:bg-yellow-50 disabled:opacity-40 transition-colors">
                Defer selected
              </button>
              {showDeferred && (
                <button onClick={() => setDeferred(selected, false)} disabled={bulkSaving}
                  className="px-3 py-1.5 text-sm font-semibold border border-green-400 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-40 transition-colors">
                  Restore selected
                </button>
              )}
              <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700 ml-auto">
                Clear selection
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase border-b">
                  <th className="pb-3 pr-3 w-8">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll}
                      className="rounded accent-navy" />
                  </th>
                  <th className="text-left pb-3 pr-4">Name</th>
                  <th className="text-left pb-3 pr-4">Precinct</th>
                  <th className="text-left pb-3 pr-4">Role</th>
                  <th className="text-left pb-3 pr-4">Stage</th>
                  <th className="text-left pb-3 pr-4">Phone</th>
                  <th className="text-left pb-3 pr-4">Assigned To</th>
                  <th className="pb-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filteredDelegates.map((d) => {
                  const isSelectable = !d.isVacant && !d.isOpposingCandidate;
                  return (
                    <tr key={d.id} className={`border-b last:border-0 ${d.isOpposingCandidate ? "bg-red-50" : ""} ${selected.has(d.id) ? "bg-blue-50" : ""}`}>
                      <td className="py-2 pr-3">
                        {isSelectable && (
                          <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleOne(d.id)}
                            className="rounded accent-navy" />
                        )}
                      </td>
                      <td className="py-2 pr-4 font-medium">
                        {d.isVacant ? (
                          <span className="text-gray-400 italic">[Vacant]</span>
                        ) : (
                          <>
                            {d.name}
                            {d.isOpposingCandidate && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Opposing</span>}
                            {d.isPLEO && <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">PLEO</span>}
                            {d.isDeferred && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Deferred</span>}
                          </>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-500">{d.precinct}</td>
                      <td className="py-2 pr-4 text-gray-500">{d.role}</td>
                      <td className="py-2 pr-4">
                        {d.isVacant || d.isOpposingCandidate ? <span className="text-gray-300 text-xs">—</span>
                          : <StageBadge delegateId={d.id} currentStage={d.stage} />}
                      </td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">{d.phone || "—"}</td>
                      <td className="py-2 pr-4">
                        {d.isVacant || d.isOpposingCandidate ? <span className="text-gray-300 text-xs">—</span>
                          : <AssignmentCell delegate={d} volunteers={volunteers} />}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingDelegate(d)}
                            title="Edit"
                            className="text-gray-400 hover:text-navy transition-colors p-1 rounded"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteDelegate(d.id, d.name)}
                            title="Delete"
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                  const count = delegates.filter((d) => getAssigned(d).includes(v.id)).length;
                  return (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {volName(v)}
                        {v.role === "admin" && <span className="ml-2 text-xs bg-navy text-white px-1.5 py-0.5 rounded-full">Admin</span>}
                      </td>
                      <td className="py-2 pr-4 text-gray-500">{v.email}</td>
                      <td className="py-2 pr-4 text-gray-500">{v.houseDistrict ? `HD ${v.houseDistrict}` : "—"}</td>
                      <td className="py-2 pr-4 text-gray-500">{v.phone || "—"}</td>
                      <td className="py-2 font-semibold text-navy">{count}</td>
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

