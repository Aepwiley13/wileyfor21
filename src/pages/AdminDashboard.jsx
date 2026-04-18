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

function buildContactListText(volunteer, delegates, volNameFn) {
  const name = volNameFn(volunteer);
  const lines = [
    `Hi ${volunteer.firstName || name},`,
    ``,
    `Here is your contact list for the Wiley for HD21 campaign. Please reach out to each person below before the April 11 caucus.`,
    ``,
    `YOUR DELEGATES (${delegates.length}):`,
    ``,
  ];
  delegates.forEach((d, i) => {
    lines.push(`${i + 1}. ${d.name}`);
    if (d.precinct) lines.push(`   Precinct: ${d.precinct}${d.role ? ` — ${d.role}` : ""}`);
    if (d.phone)    lines.push(`   Phone: ${d.phone}`);
    if (d.email)    lines.push(`   Email: ${d.email}`);
    if (d.address)  lines.push(`   Address: ${d.address}`);
    lines.push(``);
  });
  lines.push(`Questions? Reply to this email or reach out to the campaign.`);
  lines.push(`Thank you for your help!`);
  return lines.join("\n");
}

function buildSmsText(volunteer, delegates, volNameFn) {
  const firstName = volunteer.firstName || volNameFn(volunteer).split(" ")[0];
  const lines = [
    `Hi ${firstName}! Your Wiley HD21 call list (${delegates.length} delegate${delegates.length !== 1 ? "s" : ""}):`,
    ``,
  ];
  delegates.forEach((d, i) => {
    const phone = d.phone ? ` – ${d.phone}` : "";
    lines.push(`${i + 1}. ${d.name}${phone}`);
  });
  lines.push(``, `Questions? Text or call Aaron's campaign. Thanks!`);
  return lines.join("\n");
}

function VolunteerContactRow({ volunteer, assignedDelegates, volName }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [smsCopied, setSmsCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const name = volName(volunteer);

  function handleCopy() {
    const text = buildContactListText(volunteer, assignedDelegates, volName);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleEmail() {
    const body = buildContactListText(volunteer, assignedDelegates, volName);
    const subject = encodeURIComponent("Your Delegate Contact List — Wiley for HD21");
    const to = encodeURIComponent(volunteer.email || "");
    // Copy body to clipboard first so it's available if mailto truncates it
    navigator.clipboard.writeText(body).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 3000);
    });
    window.open(`mailto:${to}?subject=${subject}&body=${encodeURIComponent(body)}`, "_self");
  }

  function handleSmsCopy() {
    const text = buildSmsText(volunteer, assignedDelegates, volName);
    navigator.clipboard.writeText(text).then(() => {
      setSmsCopied(true);
      setTimeout(() => setSmsCopied(false), 2000);
    });
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-gray-400 text-xs select-none">{open ? "▼" : "▶"}</span>
        <span className="font-semibold text-navy text-sm flex-1">
          {name}
          {volunteer.role === "admin" && <span className="ml-2 text-xs bg-navy text-white px-1.5 py-0.5 rounded-full">Admin</span>}
        </span>
        <span className="text-xs text-gray-400">{volunteer.email}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${assignedDelegates.length > 0 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
          {assignedDelegates.length} delegate{assignedDelegates.length !== 1 ? "s" : ""}
        </span>
        {assignedDelegates.length > 0 && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCopy}
              className="text-xs font-semibold px-3 py-1 rounded-lg border border-gray-200 hover:border-navy text-gray-600 hover:text-navy transition-colors"
            >
              {copied ? "Copied!" : "Copy List"}
            </button>
            <button
              onClick={handleSmsCopy}
              className="text-xs font-semibold px-3 py-1 rounded-lg border border-green-200 hover:border-green-500 text-green-700 hover:text-green-800 transition-colors"
            >
              {smsCopied ? "Copied!" : "Copy SMS"}
            </button>
            <button
              onClick={handleEmail}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-coral text-white hover:bg-coral/90 transition-colors"
            >
              {emailCopied ? "Body Copied!" : "Email List"}
            </button>
          </div>
        )}
      </div>

      {/* Expanded delegate list */}
      {open && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          {assignedDelegates.length === 0 ? (
            <p className="text-xs text-gray-400">No delegates assigned yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {assignedDelegates.map((d) => (
                <div key={d.id} className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs">
                  <div className="font-semibold text-navy leading-snug">{d.name}</div>
                  {d.precinct && <div className="text-gray-400">{d.precinct}{d.role ? ` — ${d.role}` : ""}</div>}
                  {d.phone && <div className="text-gray-600 mt-0.5">{d.phone}</div>}
                  {d.email && <div className="text-gray-500 truncate">{d.email}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Event Invite ────────────────────────────────────────────────────────────

function generateEventEmailHTML(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Thank you — and what comes next</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:ital,wght@0,400;0,600;0,700;1,400&display=swap');
    body{margin:0;padding:0;background:#f0f4f8;font-family:'Barlow',Arial,sans-serif;color:#1a1a1a;}
    .wrapper{max-width:620px;margin:0 auto;background:#ffffff;}
    .header{background:linear-gradient(160deg,#001f3f 0%,#002A52 55%,#034A76 100%);padding:36px 40px 28px;text-align:center;border-bottom:5px solid #F36F6B;}
    .eyebrow{font-family:'Barlow Condensed',Arial,sans-serif;font-size:12px;letter-spacing:4px;color:#F36F6B;margin:0 0 10px;text-transform:uppercase;}
    .header-title{font-family:'Barlow Condensed',Arial,sans-serif;font-weight:800;font-size:34px;letter-spacing:1px;color:#ffffff;margin:0 0 4px;line-height:1.1;text-transform:uppercase;}
    .header-sub{font-family:'Barlow',Arial,sans-serif;font-size:14px;color:#a8cfe0;margin:10px 0 0;font-style:italic;}
    .hero-band{background:#F36F6B;padding:16px 40px;text-align:center;}
    .hero-band p{margin:0;font-family:'Barlow Condensed',Arial,sans-serif;font-size:19px;font-weight:800;color:#ffffff;letter-spacing:1px;text-transform:uppercase;}
    .body-pad{padding:32px 40px;}
    .greeting{font-size:20px;font-weight:700;color:#002A52;margin:0 0 16px;}
    .body-copy{font-size:15px;line-height:1.75;color:#374151;margin:0 0 18px;}
    .italic-note{font-size:14px;line-height:1.7;color:#6b7280;font-style:italic;margin:0 0 20px;}
    .divider{height:1px;background:#e5e7eb;margin:24px 0;}
    .section-label{font-family:'Barlow Condensed',Arial,sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#F36F6B;font-weight:700;margin:0 0 8px;}
    .callout-box{background:#f8f9fb;border-left:4px solid #F36F6B;border-radius:0 10px 10px 0;padding:16px 20px;margin:20px 0;}
    .callout-box p{font-size:15px;line-height:1.7;color:#374151;margin:0;}
    .pillars{margin:20px 0;}
    .pillar{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;}
    .pillar-icon{font-size:22px;line-height:1;margin-top:2px;}
    .pillar-text{font-size:15px;color:#002A52;font-weight:600;line-height:1.4;}
    .speech-link{display:block;text-align:center;background:#002A52;color:#ffffff;font-family:'Barlow Condensed',Arial,sans-serif;font-size:16px;font-weight:800;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:8px;margin:24px 0;}
    .cta-grid{display:table;width:100%;border-collapse:separate;border-spacing:8px;margin:24px 0;}
    .cta-grid-row{display:table-row;}
    .cta-cell{display:table-cell;width:33.33%;}
    .cta-btn{display:block;text-align:center;font-family:'Barlow Condensed',Arial,sans-serif;font-size:14px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:13px 8px;border-radius:8px;}
    .cta-coral{background:#F36F6B;color:#ffffff;}
    .cta-navy{background:#002A52;color:#ffffff;}
    .cta-teal{background:#0891b2;color:#ffffff;}
    .sign-off{padding:8px 40px 0;}
    .sign-off p{font-size:15px;line-height:1.75;color:#374151;margin:0 0 6px;}
    .sign-off .name{font-family:'Barlow Condensed',Arial,sans-serif;font-size:20px;font-weight:800;color:#002A52;margin:12px 0 2px;}
    .sign-off .title{font-size:13px;color:#6b7280;}
    .footer{padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;margin-top:32px;}
    .footer p{font-size:12px;color:#9ca3af;margin:4px 0;line-height:1.6;}
    .footer a{color:#9ca3af;}
  </style>
</head>
<body>
<div class="wrapper">

  <!-- Header -->
  <div class="header">
    <p class="eyebrow">Wiley for HD21 · House District 21</p>
    <h1 class="header-title">We're Moving<br/>Forward Together</h1>
    <p class="header-sub">A message from Aaron Wiley</p>
  </div>

  <!-- Hero band -->
  <div class="hero-band">
    <p>Thank you — from the bottom of my heart</p>
  </div>

  <!-- Body -->
  <div class="body-pad">
    <p class="greeting">Dear ${firstName},</p>

    <p class="body-copy">It's been six days since we were together at Highland High — and I still haven't stopped smiling.</p>
    <p class="italic-note">(Seriously. My kids can confirm.)</p>

    <p class="body-copy">Before anything else, I want to recognize the people who stood in this race with me: <strong>Anthony Washburn, Darin Mann, and Jeneanne Lock.</strong> Each brought real passion, real ideas, and a deep love for our community. District 21 is stronger because of them — and I'm proud to call them friends. I hope they'll stand with us as we move forward together.</p>

    <p class="body-copy">To every delegate who showed up, listened, and voted — <strong>thank you.</strong> Your trust means everything to me, and I carry it with me every single day.</p>

    <div class="divider"></div>

    <p class="section-label">Where Things Stand</p>
    <div class="callout-box">
      <p>Two of us advanced — myself and Stephen Otterstrom. This race will be decided on <strong>June 23rd.</strong> And the people who will shape what happens next are the same people who were in that room on Saturday.</p>
    </div>

    <p class="body-copy">That's you. <strong>And I need you with me.</strong></p>

    <p class="body-copy">There is no Republican in this race. Whoever wins this primary wins the seat. June 23rd isn't just a primary — <strong>it's the election.</strong></p>

    <p class="body-copy">The stakes are real. And the window is short.</p>

    <div class="divider"></div>

    <p class="section-label">What We're Fighting For</p>
    <p class="body-copy">I'm running to carry forward the legacy Sandra Hollins built on the West Side — and to take it even further. That means breaking down barriers and delivering real results:</p>

    <div class="pillars">
      <div class="pillar"><span class="pillar-icon">🏥</span><span class="pillar-text">Healthcare on the West Side — access, not obstacles</span></div>
      <div class="pillar"><span class="pillar-icon">🏠</span><span class="pillar-text">Affordability on the West Side — so families can stay in the communities they built</span></div>
      <div class="pillar"><span class="pillar-icon">✨</span><span class="pillar-text">A West Side that shines — vibrant, visible, and fully represented at the Capitol</span></div>
    </div>

    <p class="body-copy">We've already started building something special together — and now it's time to take the next step.</p>

    <div class="divider"></div>

    <p class="section-label">Here's How You Can Help</p>
    <div class="cta-grid">
      <div class="cta-grid-row">
        <div class="cta-cell"><a class="cta-btn cta-coral" href="https://wileyfor21.com/join">Join the Team</a></div>
        <div class="cta-cell"><a class="cta-btn cta-navy" href="https://wileyfor21.com/donate">Donate</a></div>
        <div class="cta-cell"><a class="cta-btn cta-teal" href="https://wileyfor21.com/volunteer">Volunteer</a></div>
      </div>
    </div>

    <p class="body-copy" style="text-align:center;font-size:14px;color:#6b7280;">👉 Knock doors &nbsp;·&nbsp; Make calls &nbsp;·&nbsp; Spread the word &nbsp;·&nbsp; Show up</p>

    <a class="speech-link" href="https://wileyfor21.com/speech">Read My Convention Speech →</a>

    <p class="body-copy" style="text-align:center;font-size:14px;color:#6b7280;font-style:italic;">Those words belong to all of us.</p>
  </div>

  <!-- Sign-off -->
  <div class="sign-off">
    <p>The West Side has always been here.</p>
    <p><strong>Now it's time to make sure the Capitol sees us.</strong></p>
    <br/>
    <p>Let's go.</p>
    <p class="name">— Aaron</p>
    <p class="title">Aaron Wiley · Democratic Candidate, Utah House District 21</p>
    <p class="title"><a href="https://wileyfor21.com" style="color:#034A76;">wileyfor21.com</a></p>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Paid for by Wiley for HD21 · Salt Lake City, Utah</p>
    <p>You're receiving this as a delegate in House District 21.</p>
    <p><a href="#">Unsubscribe</a></p>
  </div>

</div>
</body>
</html>`;
}

function generateTextMessage(firstName) {
  return `Hey ${firstName}! If you're free and want to join the conversation, come join us at Culture Coffee! We'll be gathering around 5 and should be kicking off around 5:30–6:30 at the latest. 📍 285 N 900 W, Salt Lake City`;
}

function DelegateEventInviteSection({ delegates }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [copyState, setCopyState] = useState("idle"); // idle | copied | error
  const [showDeferred, setShowDeferred] = useState(false);
  const [mode, setMode] = useState("email"); // "email" | "text"

  const deferredCount = delegates.filter((d) => (d.email || d.phone) && d.isDeferred && !d.isVacant && !d.isOpposingCandidate).length;

  const inviteable = delegates
    .filter((d) => (mode === "email" ? d.email : d.phone) && !d.isVacant && !d.isOpposingCandidate)
    .filter((d) => showDeferred ? d.isDeferred : !d.isDeferred)
    .filter((d) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (d.name || "").toLowerCase().includes(q) ||
        (d.email || "").toLowerCase().includes(q) ||
        (d.phone || "").includes(q) ||
        (d.precinct || "").toLowerCase().includes(q);
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const firstName = selected ? (selected.name || "").split(" ")[0] || "there" : "there";
  const emailHTML = selected ? generateEventEmailHTML(firstName) : null;
  const textMsg = selected ? generateTextMessage(firstName) : "";

  const SUBJECT = "Thank you — and what comes next";

  async function handleCopy() {
    try {
      if (mode === "email") {
        if (!emailHTML) return;
        if (window.ClipboardItem) {
          const blob = new Blob([emailHTML], { type: "text/html" });
          await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
        } else {
          await navigator.clipboard.writeText(emailHTML);
        }
      } else {
        await navigator.clipboard.writeText(textMsg);
      }
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2500);
    }
  }

  function handleGmail() {
    if (!selected?.email) return;
    const to = encodeURIComponent(selected.email);
    const su = encodeURIComponent(SUBJECT);
    window.open(`https://mail.google.com/mail/?view=cm&to=${to}&su=${su}`, "_blank");
  }

  function handleSMS() {
    if (!selected?.phone) return;
    const phone = selected.phone.replace(/\D/g, "");
    window.open(`sms:+1${phone}?body=${encodeURIComponent(textMsg)}`, "_self");
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-bold text-navy text-lg mb-0.5">Event Invite — Jordan River &amp; Great Salt Lake</h2>
          <p className="text-xs text-gray-400">Click a delegate to preview their personalized message, then copy or send.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
            <button
              onClick={() => { setMode("email"); setSelected(null); setCopyState("idle"); }}
              className={`px-3 py-1.5 transition-all ${mode === "email" ? "bg-navy text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              📧 Email
            </button>
            <button
              onClick={() => { setMode("text"); setSelected(null); setCopyState("idle"); }}
              className={`px-3 py-1.5 transition-all border-l border-gray-200 ${mode === "text" ? "bg-navy text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              💬 Text
            </button>
          </div>
          <button
            onClick={() => { setShowDeferred((v) => !v); setSelected(null); setSearch(""); }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              showDeferred
                ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200"
            }`}
          >
            {showDeferred ? "⬅ Back to Active" : `Deferred (${deferredCount})`}
          </button>
          <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-3 py-1.5 rounded-full border border-blue-100">
            {inviteable.length} {showDeferred ? "deferred" : "active"} with {mode === "email" ? "email" : "phone"}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: delegate list */}
        <div className="lg:w-72 flex-shrink-0">
          <input
            type="text"
            placeholder={`Search ${showDeferred ? "deferred" : "active"} delegates…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
          <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
            {inviteable.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No delegates match.</p>
            )}
            {inviteable.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm ${
                  selected?.id === d.id
                    ? "bg-navy text-white border-navy"
                    : "bg-white hover:bg-gray-50 border-gray-100"
                }`}
              >
                <div className="font-semibold leading-snug flex items-center gap-2">
                  {d.name}
                  {d.isDeferred && <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${selected?.id === d.id ? "bg-yellow-300 text-yellow-900" : "bg-yellow-100 text-yellow-700"}`}>Deferred</span>}
                </div>
                <div className={`text-xs mt-0.5 truncate ${selected?.id === d.id ? "text-blue-200" : "text-gray-400"}`}>
                  {mode === "email" ? d.email : d.phone}
                </div>
                {d.precinct && (
                  <div className={`text-xs ${selected?.id === d.id ? "text-blue-300" : "text-gray-300"}`}>
                    {d.precinct}{d.role ? ` · ${d.role}` : ""}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: preview + actions */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="h-full min-h-[280px] flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200">
              <div className="text-center">
                <div className="text-3xl mb-3">{mode === "email" ? "📧" : "💬"}</div>
                <p className="text-sm text-gray-400 font-medium">Select a delegate to preview their {mode === "email" ? "email invite" : "text message"}</p>
              </div>
            </div>
          ) : mode === "email" ? (
            <div>
              {/* Email action bar */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 mb-0.5">To</div>
                  <div className="text-sm font-medium text-navy truncate">{selected.email}</div>
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    copyState === "copied" ? "bg-green-500 text-white"
                    : copyState === "error" ? "bg-red-500 text-white"
                    : "bg-navy text-white hover:bg-navy/90"
                  }`}
                >
                  {copyState === "copied" ? "✓ Copied!" : copyState === "error" ? "Copy failed" : "Copy Rich Email"}
                </button>
                <button
                  onClick={handleGmail}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-coral text-white hover:bg-coral/90 transition-all"
                >
                  Open in Gmail ↗
                </button>
              </div>
              <div className="text-xs text-gray-400 mb-3">
                <strong className="text-gray-500">Subject:</strong> {SUBJECT}
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <iframe
                  srcDoc={emailHTML}
                  title="Email preview"
                  className="w-full"
                  style={{ height: 560, border: "none" }}
                  sandbox="allow-same-origin"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                "Copy Rich Email" → paste into Gmail compose to send with full formatting
              </p>
            </div>
          ) : (
            <div>
              {/* Text action bar */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 mb-0.5">To</div>
                  <div className="text-sm font-medium text-navy">{selected.phone}</div>
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    copyState === "copied" ? "bg-green-500 text-white"
                    : copyState === "error" ? "bg-red-500 text-white"
                    : "bg-navy text-white hover:bg-navy/90"
                  }`}
                >
                  {copyState === "copied" ? "✓ Copied!" : copyState === "error" ? "Copy failed" : "Copy Text"}
                </button>
                <button
                  onClick={handleSMS}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-all"
                >
                  Open in SMS ↗
                </button>
              </div>
              {/* iMessage-style preview */}
              <div className="bg-gray-100 rounded-2xl p-6 min-h-[200px]">
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-blue-500 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-3 leading-relaxed shadow-sm">
                    {textMsg}
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center mt-4">Preview — message is personalized with delegate's first name</p>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                "Copy Text" → paste into any SMS app &nbsp;·&nbsp; "Open in SMS" → opens your phone's messages app
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
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

  const committed = delegates.filter(
    (d) => ["committed", "locked"].includes(d.stage) && !d.isDeferred && !d.isVacant && !d.isOpposingCandidate
  ).length;
  const target = stats?.target || 53;
  const progressPct = Math.min(100, Math.round((committed / target) * 100));
  const days = daysUntil(CONVENTION_DATE);

  const activeTotal = delegates.filter((d) => !d.isVacant && !d.isOpposingCandidate && !d.isDeferred).length;
  const voteTarget56 = Math.ceil(target * 0.56);
  const neededFor56 = Math.max(0, voteTarget56 - committed);
  const vote56Pct = Math.min(100, Math.round((committed / voteTarget56) * 100));
  const stageCounts = Object.fromEntries(
    STAGES.map((s) => [s, delegates.filter((d) => d.stage === s && !d.isDeferred && !d.isVacant && !d.isOpposingCandidate).length])
  );

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
              <div className="text-3xl font-bold text-navy">{activeTotal}</div>
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

          {/* 56% Vote Threshold */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-8 mb-5">
              <div>
                <div className="text-2xl font-bold text-navy">
                  {committed}<span className="text-gray-400 text-lg font-normal"> / {voteTarget56}</span>
                </div>
                <div className="text-sm text-gray-500">56% Vote Threshold</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${neededFor56 === 0 ? "text-green-600" : "text-coral"}`}>{neededFor56}</div>
                <div className="text-sm text-gray-500">Still needed for 56%</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-navy">{vote56Pct}%</div>
                <div className="text-sm text-gray-500">Current vote share</div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress to 56% ({voteTarget56} delegates needed)</span><span>{vote56Pct}%</span>
                </div>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${vote56Pct}%`, backgroundColor: vote56Pct >= 100 ? "#22c55e" : "#f59e0b" }} />
                </div>
              </div>
            </div>

            {/* Stage breakdown */}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Stage breakdown — {activeTotal} active delegates</div>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((s) => {
                  const count = stageCounts[s] || 0;
                  const pct = activeTotal > 0 ? Math.round((count / activeTotal) * 100) : 0;
                  return (
                    <div key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${STAGE_COLORS[s]}`}>
                      <span className="capitalize">{s === "not_winnable" ? "not winnable" : s}</span>
                      <span className="font-bold">{count}</span>
                      <span className="opacity-60">({pct}%)</span>
                    </div>
                  );
                })}
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

        {/* Volunteers + Contact List Sender */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-navy text-lg mb-1">Volunteers ({volunteers.length})</h2>
          <p className="text-xs text-gray-400 mb-4">Expand any volunteer to see their contact list, then copy or email it to them.</p>
          <div className="space-y-2">
            {volunteers.map((v) => {
              const assigned = delegates.filter(
                (d) => getAssigned(d).includes(v.id) && !d.isVacant && !d.isOpposingCandidate
              );
              return (
                <VolunteerContactRow key={v.id} volunteer={v} assignedDelegates={assigned} volName={volName} />
              );
            })}
            {volunteers.length === 0 && (
              <p className="text-sm text-gray-400">No volunteers yet.</p>
            )}
          </div>
        </section>

        {/* Event Invite Tool */}
        <DelegateEventInviteSection delegates={delegates} />
      </main>
    </div>
  );
}

