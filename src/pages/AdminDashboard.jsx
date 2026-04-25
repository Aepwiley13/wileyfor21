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

// ─── Convention Thank-You Email ───────────────────────────────────────────────

function generateConventionEmailHTML(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Today Is The Day. Thank You for Standing With Me.</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:ital,wght@0,400;0,600;1,400&display=swap');
    body{margin:0;padding:0;background-color:#f8f6f2;font-family:'Barlow',Arial,sans-serif;color:#1a1a1a;}
    .wrapper{max-width:620px;margin:0 auto;background-color:#ffffff;}
    .header{background-color:#002A52;padding:28px 40px 20px;text-align:center;border-bottom:5px solid #F36F6B;}
    .header-eyebrow{font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:13px;letter-spacing:4px;color:#F36F6B;margin:0 0 8px;text-transform:uppercase;}
    .header-logo{font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-weight:700;font-size:34px;letter-spacing:3px;color:#ffffff;margin:0;line-height:1;text-transform:uppercase;}
    .header-sub{font-family:'Barlow',Arial,sans-serif;font-size:13px;color:#99bbcc;margin:6px 0 0;font-style:italic;}
    .hero-band{background-color:#F36F6B;padding:22px 40px;text-align:center;}
    .hero-band p{font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-weight:700;font-size:22px;letter-spacing:3px;color:#ffffff;margin:0;text-transform:uppercase;line-height:1.3;}
    .body-pad{padding:40px 44px;}
    .greeting{font-size:22px;font-weight:600;color:#034A76;margin:0 0 24px;}
    .body-copy{font-size:16px;line-height:1.8;color:#2d2d2d;margin:0 0 18px;}
    .punch{font-size:18px;font-weight:600;color:#034A76;border-left:4px solid #F36F6B;padding-left:16px;margin:28px 0;}
    .endorsement-card{background-color:#002A52;border-radius:6px;padding:28px 32px;margin:28px 0;}
    .endorsement-card-title{font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-weight:700;font-size:13px;letter-spacing:3px;color:#F36F6B;margin:0 0 18px;text-transform:uppercase;}
    .endorsement-name{font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-weight:700;font-size:17px;letter-spacing:1px;color:#ffffff;margin:0 0 2px;text-transform:uppercase;}
    .endorsement-role{font-size:13px;color:#99bbcc;margin:0 0 14px;padding-bottom:14px;border-bottom:1px solid #1a4a6a;font-style:italic;}
    .endorsement-role-last{font-size:13px;color:#99bbcc;margin:0;font-style:italic;}
    .snack-band{background-color:#f8f6f2;border-radius:6px;border-left:5px solid #F36F6B;padding:20px 24px;margin:24px 0;}
    .snack-label{font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:14px;letter-spacing:2px;color:#034A76;text-transform:uppercase;display:block;margin-bottom:6px;font-weight:700;}
    .snack-copy{font-size:16px;color:#2d2d2d;margin:0;line-height:1.7;}
    .fact-card{background-color:#034A76;border-radius:6px;padding:24px 28px;margin:28px 0;}
    .fact-card-title{font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-weight:700;font-size:13px;letter-spacing:3px;color:#F36F6B;margin:0 0 14px;text-transform:uppercase;}
    .fact-row{color:#e8eef4;font-size:15px;line-height:1.7;margin:0 0 10px;}
    .fact-row:last-child{margin:0;}
    .fact-label{color:#F36F6B;font-weight:700;}
    .divider{border:none;border-top:2px solid #eeecea;margin:32px 0;}
    .signoff-pad{padding:0 44px 36px;}
    .signoff-copy{font-size:16px;line-height:1.8;color:#2d2d2d;margin:0 0 14px;}
    .name{font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-weight:700;font-size:22px;letter-spacing:2px;color:#034A76;margin:20px 0 2px;text-transform:uppercase;}
    .title-line{font-size:13px;color:#888;font-style:italic;margin:0;}
    .ps{background-color:#fdf4f4;border-left:3px solid #F36F6B;padding:14px 18px;margin-top:24px;font-size:14px;color:#444;line-height:1.7;}
    .footer{background-color:#002A52;padding:24px 40px;text-align:center;}
    .footer p{font-size:12px;color:#7799aa;margin:0 0 6px;line-height:1.6;}
    .footer a{color:#F36F6B;text-decoration:none;}
    .tagline{font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-weight:700;font-size:16px;letter-spacing:3px;color:#ffffff;margin:14px 0 0;text-transform:uppercase;}
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <p class="header-eyebrow">Utah House District 21 &middot; Convention Day</p>
    <p class="header-logo">Aaron Wiley</p>
    <p class="header-sub">West Side Salt Lake City &middot; April 11, 2026</p>
  </div>
  <div class="hero-band">
    <p>&#x2B50; Today Is The Day. Thank You for Standing With Me.</p>
  </div>
  <div class="body-pad">
    <p class="greeting">Dear ${firstName},</p>
    <p class="body-copy">Today we show up. And I could not be more grateful.</p>
    <p class="body-copy">When you chose to rank me <strong>#1</strong>, you don't just make a political decision &mdash; you make a statement about what you believe the West Side of Salt Lake City deserves. You put your credibility behind this campaign, and I do not take that lightly. Not for a single second.</p>
    <p class="punch">&ldquo;This is what a movement looks like &mdash; leaders and neighbors standing together, choosing community over politics. That&rsquo;s why we&rsquo;re going to win today.&rdquo;</p>
    <p class="body-copy">Because of you and so many others who believed from the very beginning, we have built something real. Something rooted. Something the West Side can be proud of.</p>
    <div class="endorsement-card">
      <p class="endorsement-card-title">&#x2705; Those Who Stood With Us</p>
      <p class="endorsement-name">Representative Sandra Hollins</p>
      <p class="endorsement-role">Current Utah House District 21 Representative &mdash; Our Own Rep</p>
      <p class="endorsement-name">Representative Ashlee Matthews</p>
      <p class="endorsement-role">Utah House of Representatives</p>
      <p class="endorsement-name">Representative Rosalba Dominguez</p>
      <p class="endorsement-role">Utah House of Representatives</p>
      <p class="endorsement-name">County Councilwoman Natalie Pinkney</p>
      <p class="endorsement-role">Salt Lake County Council</p>
      <p class="endorsement-name">Liban Mohamed</p>
      <p class="endorsement-role">1st Congressional District Candidate</p>
      <p class="endorsement-name">David Hollins</p>
      <p class="endorsement-role-last">Community Leader &amp; Supporter</p>
    </div>
    <p class="body-copy">When Representative Sandra Hollins &mdash; the woman who has carried this district with distinction &mdash; chooses to pass the torch to me, I feel the full weight of that trust. I will honor it every single day I serve. And when leaders like Rep. Ashlee Matthews, Rep. Rosalba Dominguez, Councilwoman Natalie Pinkney, Liban Mohamed, and David Hollins add their voices to this campaign, it says something powerful: <strong>this community is ready for what comes next.</strong></p>
    <p class="body-copy">I have overwhelming support heading into today &mdash; but I never forget that every single endorsement is a promise I owe this community. I will fight for you. I will show up for you. I will make District 21 proud.</p>
    <div class="snack-band">
      <span class="snack-label">&#x1F37F; We&rsquo;ve Got You Covered at Convention</span>
      <p class="snack-copy">Come find us at the Aaron Wiley table &mdash; we&rsquo;ll have <strong>snacks and water</strong> waiting for you. You&rsquo;re giving your Saturday for this community. The least we can do is make sure you&rsquo;re fueled up. Come say hello and let&rsquo;s celebrate what we built together.</p>
    </div>
    <div class="fact-card">
      <p class="fact-card-title">&#x1F4CB; Convention Reminder</p>
      <p class="fact-row"><span class="fact-label">&#x1F4CD; Where:</span> Highland High School &mdash; 2166 S 1700 E, SLC</p>
      <p class="fact-row"><span class="fact-label">&#x1F4C5; Today:</span> Saturday, April 11, 2026 &middot; Check-in opens 8:00 AM</p>
      <p class="fact-row"><span class="fact-label">&#x1F5F3; District 21 Breakout:</span> 1:40 PM &middot; Voting begins 2:00 PM</p>
      <p class="fact-row"><span class="fact-label">&#x2B50; Your vote:</span> Rank Aaron Wiley <strong>#1</strong>. Let&rsquo;s make it official.</p>
    </div>
    <p class="body-copy">You chose to be part of this from the beginning. Today, we finish what we started &mdash; together.</p>
    <hr class="divider"/>
  </div>
  <div class="signoff-pad">
    <p class="signoff-copy">From the bottom of my heart &mdash; thank you. For your time, your trust, and your belief that the West Side deserves a strong, fearless voice in the Utah House.</p>
    <p class="signoff-copy">I will not let you down. Today, I fight for every family in District 21. Let&rsquo;s go win this.</p>
    <p class="signoff-copy">With deep gratitude and West Side pride,</p>
    <p class="name">Aaron Wiley</p>
    <p class="title-line">Candidate &middot; Utah House District 21 &middot; wileyfor21.com</p>
    <div class="ps"><strong>P.S.</strong> &mdash; If you see me at Highland High School today, come say hi. I genuinely want to meet you face to face and thank you personally. That&rsquo;s not a talking point &mdash; it&rsquo;s just who I am.</div>
  </div>
  <div class="footer">
    <p class="tagline">WE ARE 21. WE ARE HERE.</p>
    <p style="margin-top:12px;">Paid for by Utah for Wiley &middot; Aaron Wiley for Utah House District 21</p>
    <p><a href="mailto:utahforwiley@gmail.com">utahforwiley@gmail.com</a> &middot; <a href="https://wileyfor21.com">wileyfor21.com</a></p>
    <p style="margin-top:10px;font-size:11px;color:#557788;">You are receiving this because you are a credentialed delegate for District 21.<br/>To unsubscribe, reply with &ldquo;unsubscribe&rdquo; and we&rsquo;ll remove you immediately.</p>
  </div>
</div>
</body>
</html>`;
}

function generateConventionTextMessage(firstName) {
  return `${firstName} — Today's the day and I am grateful beyond words.\n\nYou chose to rank me #1, and I don't take that lightly. Because of delegates like you, we head into this convention with the support of Rep. Sandra Hollins, Rep. Ashlee Matthews, Rep. Rosalba Dominguez, Councilwoman Natalie Pinkney, Liban Mohamed, and David Hollins behind this campaign.\n\nThat's not politics. That's a movement.\n\nCome find us at the Aaron Wiley table — we have SNACKS & WATER waiting for you.\n\n📍 Highland High School — 2166 S 1700 E, SLC\n🗓️ District 21 breakout: 1:40 PM | Voting: 2:00 PM\n⭐ Rank Aaron Wiley #1 — let's make it official.\n\nThank you for the opportunity to fight for our community. See you today.\n\n— Aaron Wiley | wileyfor21.com`;
}

// ─── Post-Convention Nominee ──────────────────────────────────────────────────

function generatePostConventionNomineeEmailHTML(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>14 Days Later — We're Still Just Getting Started | Aaron Wiley for HD21</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,900;1,700&family=Barlow:ital,wght@0,400;0,500;0,600;1,400&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background-color: #e8e4df;
    font-family: 'Barlow', Georgia, sans-serif;
    color: #1a1a1a;
    -webkit-font-smoothing: antialiased;
  }

  .email-wrapper {
    max-width: 620px;
    margin: 0 auto;
    background: #ffffff;
    box-shadow: 0 4px 40px rgba(0,0,0,0.18);
  }

  /* ── HERO ── */
  .hero {
    position: relative;
    background: #044a77;
    overflow: hidden;
  }
  .hero img {
    width: 100%;
    display: block;
    opacity: 0.92;
  }
  .hero-stripe {
    height: 6px;
    background: linear-gradient(90deg, #f26f6c 0%, #d94f4f 50%, #f26f6c 100%);
  }

  /* ── DATE CHIP ── */
  .date-chip {
    background: #f26f6c;
    text-align: center;
    padding: 12px 32px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #fff;
  }

  /* ── INTRO BLOCK ── */
  .intro {
    background: #044a77;
    padding: 36px 52px 32px;
    text-align: center;
  }
  .intro-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: #f26f6c;
    margin-bottom: 10px;
  }
  .intro-headline {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 42px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.0;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }
  .intro-headline em {
    color: #f26f6c;
    font-style: normal;
  }
  .intro-sub {
    font-size: 14px;
    color: rgba(255,255,255,0.55);
    letter-spacing: 1px;
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
  }

  /* ── BODY ── */
  .body {
    padding: 44px 52px;
    background: #ffffff;
  }

  .salutation {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: #044a77;
    margin-bottom: 22px;
    letter-spacing: 0.5px;
  }

  p {
    font-size: 16px;
    line-height: 1.8;
    color: #2d2d2d;
    margin-bottom: 20px;
  }

  .italic-note {
    font-style: italic;
    color: #888;
    font-size: 14px;
    margin-top: -14px;
    margin-bottom: 22px;
    padding-left: 16px;
    border-left: 2px solid #e8e4df;
  }

  /* ── DIVIDER ── */
  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #ddd 20%, #ddd 80%, transparent);
    margin: 28px 0;
  }

  /* ── CALLOUT BOX ── */
  .callout-box {
    background: #f9f7f5;
    border-left: 5px solid #f26f6c;
    padding: 22px 26px;
    margin: 30px 0;
    border-radius: 0 6px 6px 0;
  }
  .callout-box p {
    margin: 0;
    font-size: 16.5px;
    font-weight: 600;
    color: #044a77;
    line-height: 1.6;
  }
  .callout-box .callout-accent {
    color: #f26f6c;
    font-style: italic;
    display: block;
    margin-top: 10px;
    font-size: 18px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-style: normal;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* ── PLATFORM ── */
  .platform-wrap {
    margin: 28px 0;
    border: 1px solid #ebebeb;
    border-radius: 8px;
    overflow: hidden;
  }
  .platform-item {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid #ebebeb;
  }
  .platform-item:last-child { border-bottom: none; }
  .platform-icon {
    background: #044a77;
    width: 64px;
    min-width: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    padding: 18px 0;
  }
  .platform-text {
    padding: 16px 20px;
    flex: 1;
  }
  .platform-text strong {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 17px;
    font-weight: 700;
    color: #044a77;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 3px;
  }
  .platform-text span {
    font-size: 13.5px;
    color: #666;
    line-height: 1.5;
  }

  /* ── VIDEO BLOCK ── */
  .video-section {
    margin: 36px 0 24px;
  }
  .video-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 12px;
    text-align: center;
  }
  .video-card {
    display: block;
    text-decoration: none;
    background: #044a77;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid #044a77;
    transition: all 0.2s;
  }
  .video-inner {
    display: flex;
    align-items: center;
    gap: 0;
  }
  .video-play-col {
    background: #f26f6c;
    width: 90px;
    min-width: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px 0;
    flex-shrink: 0;
  }
  .play-circle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(255,255,255,0.6);
  }
  .play-triangle {
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-left: 17px solid white;
    margin-left: 4px;
  }
  .video-text-col {
    padding: 20px 24px;
    flex: 1;
  }
  .video-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #f26f6c;
    margin-bottom: 6px;
  }
  .video-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 20px;
    font-weight: 900;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.1;
    margin-bottom: 6px;
  }
  .video-meta {
    font-size: 12px;
    color: rgba(255,255,255,0.4);
    letter-spacing: 1px;
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
  }
  .video-arrow {
    padding: 0 20px 0 0;
    font-size: 22px;
    color: rgba(255,255,255,0.3);
    font-family: 'Barlow Condensed', sans-serif;
  }

  /* ── SPEECH BUTTON ── */
  .speech-section {
    text-align: center;
    padding: 4px 0 8px;
  }
  .speech-btn {
    display: inline-block;
    background: transparent;
    border: 2px solid #044a77;
    color: #044a77 !important;
    text-decoration: none;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 13px 32px;
    border-radius: 2px;
  }

  /* ── CTA SECTION ── */
  .cta-section {
    background: #044a77;
    padding: 44px 52px;
    text-align: center;
    position: relative;
  }
  .cta-section::before {
    content: '';
    display: block;
    height: 4px;
    background: linear-gradient(90deg, #f26f6c, #d94f4f, #f26f6c);
    position: absolute;
    top: 0; left: 0; right: 0;
  }
  .cta-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    margin-bottom: 8px;
  }
  .cta-headline {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 36px;
    font-weight: 900;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 6px;
    line-height: 1.0;
  }
  .cta-headline em {
    color: #f26f6c;
    font-style: normal;
  }
  .cta-sub {
    font-size: 13px;
    color: rgba(255,255,255,0.4);
    margin-bottom: 32px;
    font-family: 'Barlow Condensed', sans-serif;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .cta-btn-primary {
    display: block;
    background: #f26f6c;
    color: #ffffff !important;
    text-decoration: none;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    padding: 18px 32px;
    border-radius: 3px;
    margin-bottom: 10px;
  }
  .cta-btn-outline {
    display: block;
    background: transparent;
    color: #ffffff !important;
    text-decoration: none;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    padding: 16px 32px;
    border: 1.5px solid rgba(255,255,255,0.25);
    border-radius: 3px;
    margin-bottom: 10px;
  }
  .cta-btn-ghost {
    display: block;
    background: transparent;
    color: rgba(255,255,255,0.5) !important;
    text-decoration: none;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 14px 32px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 3px;
  }

  /* ── SIGNATURE ── */
  .sig-section {
    padding: 40px 52px 32px;
    background: #ffffff;
    border-top: 1px solid #f0f0ec;
  }
  .sig-closing {
    font-size: 17px;
    line-height: 1.7;
    color: #333;
    font-style: italic;
    margin-bottom: 24px;
    padding-left: 18px;
    border-left: 3px solid #f26f6c;
  }
  .sig-sign {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 32px;
    font-weight: 900;
    color: #044a77;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .sig-name-line {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 2px;
  }
  .sig-url {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    color: #f26f6c !important;
    text-decoration: none;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  /* ── WORDMARK FOOTER ── */
  .wordmark-bar {
    background: #044a77;
    padding: 24px 52px;
    text-align: center;
    border-top: 5px solid #f26f6c;
  }
  .wordmark-bar img {
    width: 280px;
    max-width: 80%;
    opacity: 0.9;
  }

  /* ── LEGAL FOOTER ── */
  .legal-footer {
    background: #033a60;
    padding: 20px 40px;
    text-align: center;
  }
  .legal-footer p {
    font-size: 10.5px;
    color: rgba(255,255,255,0.3);
    line-height: 1.7;
    margin: 0;
  }
  .legal-footer a {
    color: rgba(255,255,255,0.45);
    text-decoration: underline;
  }
</style>
</head>
<body>
<div class="email-wrapper">

  <!-- HERO -->
  <div class="hero">
    <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QC8RXhpZgAASUkqAAgAAAAGABIBAwABAAAAAQAAABoBBQABAAAAVgAAABsBBQABAAAAXgAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAZgAAAAAAAABgAAAAAQAAAGAAAAABAAAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAMAAQAAAFMDAAADoAMAAQAAADsBAAAAAAAA/+EO4Wh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI2LTA0LTI1PC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkRhdGE+eyZxdW90O2RvYyZxdW90OzomcXVvdDtEQUhGR1lEZnVHQSZxdW90OywmcXVvdDt1c2VyJnF1b3Q7OiZxdW90O1VBRlhmTDN4WmxvJnF1b3Q7LCZxdW90O2JyYW5kJnF1b3Q7OiZxdW90O0Fhcm9uIFdpbGV54oCZcyBUZWFtJnF1b3Q7fTwvQXR0cmliOkRhdGE+CiAgICAgPEF0dHJpYjpFeHRJZD45NTA1YmU2Ni0zNzgzLTQ0NzktOGQ4NC0wMTU1ZTM1NmVmMWE8L0F0dHJpYjpFeHRJZD4KICAgICA8QXR0cmliOkZiSWQ+NTI1MjY1OTE0MTc5NTgwPC9BdHRyaWI6RmJJZD4KICAgICA8QXR0cmliOlRvdWNoVHlwZT4yPC9BdHRyaWI6VG91Y2hUeXBlPgogICAgPC9yZGY6bGk+CiAgIDwvcmRmOlNlcT4KICA8L0F0dHJpYjpBZHM+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOmRjPSdodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyc+CiAgPGRjOnRpdGxlPgogICA8cmRmOkFsdD4KICAgIDxyZGY6bGkgeG1sOmxhbmc9J3gtZGVmYXVsdCc+V0lMRVkgRElTVElDVCAyMSAtIDE8L3JkZjpsaT4KICAgPC9yZGY6QWx0PgogIDwvZGM6dGl0bGU+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnBkZj0naHR0cDovL25zLmFkb2JlLmNvbS9wZGYvMS4zLyc+CiAgPHBkZjpBdXRob3I+QWFyb24gV2lsZXk8L3BkZjpBdXRob3I+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnhtcD0naHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyc+CiAgPHhtcDpDcmVhdG9yVG9vbD5DYW52YSAoUmVuZGVyZXIpIGRvYz1EQUhGR1lEZnVHQSB1c2VyPVVBRlhmTDN4WmxvIGJyYW5kPUFhcm9uIFdpbGV54oCZcyBUZWFtPC94bXA6Q3JlYXRvclRvb2w+CiA8L3JkZjpEZXNjcmlwdGlvbj4KPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0ndyc/Pv/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIATsDUwMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkq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" alt="Aaron Wiley — Fighting for the Future of District 21" />
  </div>
  <div class="hero-stripe"></div>

  <!-- DATE CHIP -->
  <div class="date-chip">⚡ &nbsp; Primary Election · June 23rd, 2026 · No Republican in This Race</div>

  <!-- INTRO HEADLINE BLOCK -->
  <div class="intro">
    <p class="intro-eyebrow">From Aaron Wiley · District 21</p>
    <h1 class="intro-headline">14 Days Later —<br><em>Still Not Stopping.</em></h1>
    <p class="intro-sub">West Side Salt Lake City · April 2026</p>
  </div>

  <!-- BODY -->
  <div class="body">

    <p class="salutation">Dear ${firstName},</p>

    <p>It's been 14 days since we were together at Highland High — and I still haven't stopped smiling.</p>

    <p class="italic-note">(Seriously. My kids can confirm.)</p>

    <p>Before anything else, I want to recognize the people who stood in this race with me: <strong>Anthony Washburn, Darin Mann, and Jeneanne Lock.</strong> Each brought real passion, real ideas, and a deep love for our community. District 21 is stronger because of them — and I'm proud to call them friends. I hope they'll stand with us as we move forward together.</p>

    <p>To every delegate who showed up, listened, and voted — <strong>thank you.</strong> Your trust means everything to me, and I carry it with me every single day.</p>

    <div class="divider"></div>

    <div class="callout-box">
      <p>Two of us advanced — and this race will be decided on <strong>June 23rd</strong>. The people who will shape what happens next are the same people who were in that room on Saturday.
      <span class="callout-accent">That's you. And I need you with me.</span></p>
    </div>

    <p>There is no Republican in this race. Whoever wins this primary wins the seat. <strong>June 23rd isn't just a primary — it's the election.</strong> The stakes are real. The window is short.</p>

    <p>I'm running to carry forward the legacy Sandra Hollins built on the West Side — and to take it even further. Breaking down barriers and delivering real results:</p>

    <div class="platform-wrap">
      <div class="platform-item">
        <div class="platform-icon">🏥</div>
        <div class="platform-text">
          <strong>Healthcare on the West Side</strong>
          <span>Access, not obstacles — our families deserve better care.</span>
        </div>
      </div>
      <div class="platform-item">
        <div class="platform-icon">🏠</div>
        <div class="platform-text">
          <strong>Affordability on the West Side</strong>
          <span>So families can stay in the communities they built.</span>
        </div>
      </div>
      <div class="platform-item">
        <div class="platform-icon">✨</div>
        <div class="platform-text">
          <strong>A West Side That Shines</strong>
          <span>Vibrant, visible, and fully represented at the Capitol.</span>
        </div>
      </div>
    </div>

    <p>We've already started building something special together — and now it's time to take the next step.</p>

    <div class="divider"></div>

    <!-- VIDEO CARD -->
    <div class="video-section">
      <p class="video-eyebrow">Watch &amp; Share</p>
      <a href="https://www.youtube.com/watch?v=sRvyAXNZ2Es" class="video-card" target="_blank">
        <div class="video-inner">
          <div class="video-play-col">
            <div class="play-circle">
              <div class="play-triangle"></div>
            </div>
          </div>
          <div class="video-text-col">
            <p class="video-label">Convention Speech · April 2026</p>
            <p class="video-title">My Message to<br>District 21</p>
            <p class="video-meta">Watch on YouTube →</p>
          </div>
          <div class="video-arrow">›</div>
        </div>
      </a>
    </div>

    <div class="speech-section">
      <a href="https://www.youtube.com/watch?v=sRvyAXNZ2Es" class="speech-btn" target="_blank">📖 &nbsp; Watch My Full Convention Speech →</a>
    </div>

  </div>

  <!-- CTA -->
  <div class="cta-section">
    <p class="cta-eyebrow">The window is short</p>
    <h2 class="cta-headline">Here's How You<br><em>Can Help</em></h2>
    <p class="cta-sub">June 23rd · Every action counts</p>
    <a href="https://wileyfor21.com/signup" class="cta-btn-primary">👉 &nbsp; Join the Team — Volunteer Now</a>
    <a href="https://buy.stripe.com/7sY9ASeNR0tr1Ng25b4ZG01" class="cta-btn-outline">💛 &nbsp; Donate — Every Dollar Matters</a>
    <a href="https://wileyfor21.com/signup" class="cta-btn-ghost">📍 &nbsp; Attend a Community Event</a>
  </div>

  <!-- SIGNATURE -->
  <div class="sig-section">
    <p class="sig-closing">The West Side has always been here.<br>Now it's time to make sure the Capitol sees us.</p>
    <p class="sig-sign">— Aaron</p>
    <p class="sig-name-line">Aaron Wiley · Democratic Candidate</p>
    <p class="sig-name-line" style="margin-bottom:6px;">Utah House District 21</p>
    <a href="https://wileyfor21.com" class="sig-url">[wileyfor21.com](http://wileyfor21.com)</a>
  </div>

  <!-- WORDMARK -->
  <div class="wordmark-bar">
    <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAbwBvAAD/4QC8RXhpZgAASUkqAAgAAAAGABIBAwABAAAAAQAAABoBBQABAAAAVgAAABsBBQABAAAAXgAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAZgAAAAAAAABvAAAAAQAAAG8AAAABAAAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAMAAQAAANAHAAADoAMAAQAAADUFAAAAAAAA/+EO9Gh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI2LTA0LTI1PC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkRhdGE+eyZxdW90O2RvYyZxdW90OzomcXVvdDtEQUhHWXBmWFI1USZxdW90OywmcXVvdDt1c2VyJnF1b3Q7OiZxdW90O1VBRlhmTDN4WmxvJnF1b3Q7LCZxdW90O2JyYW5kJnF1b3Q7OiZxdW90O0Fhcm9uIFdpbGV54oCZcyBUZWFtJnF1b3Q7fTwvQXR0cmliOkRhdGE+CiAgICAgPEF0dHJpYjpFeHRJZD5kOTk1N2MyNi1iZWNiLTQyYzItYjFmYi0yYTg1NWIzYzZmOTE8L0F0dHJpYjpFeHRJZD4KICAgICA8QXR0cmliOkZiSWQ+NTI1MjY1OTE0MTc5NTgwPC9BdHRyaWI6RmJJZD4KICAgICA8QXR0cmliOlRvdWNoVHlwZT4yPC9BdHRyaWI6VG91Y2hUeXBlPgogICAgPC9yZGY6bGk+CiAgIDwvcmRmOlNlcT4KICA8L0F0dHJpYjpBZHM+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOmRjPSdodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyc+CiAgPGRjOnRpdGxlPgogICA8cmRmOkFsdD4KICAgIDxyZGY6bGkgeG1sOmxhbmc9J3gtZGVmYXVsdCc+T1VSIFZPSUNFLiBPVVIgRlVUVVJFLiBPVVIgRElTVFJJQ1QgLSAxPC9yZGY6bGk+CiAgIDwvcmRmOkFsdD4KICA8L2RjOnRpdGxlPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpwZGY9J2h0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8nPgogIDxwZGY6QXV0aG9yPkFhcm9uIFdpbGV5PC9wZGY6QXV0aG9yPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczp4bXA9J2h0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8nPgogIDx4bXA6Q3JlYXRvclRvb2w+Q2FudmEgKFJlbmRlcmVyKSBkb2M9REFIR1lwZlhSNVEgdXNlcj1VQUZYZkwzeFpsbyBicmFuZD1BYXJvbiBXaWxleeKAmXMgVGVhbTwveG1wOkNyZWF0b3JUb29sPgogPC9yZGY6RGVzY3JpcHRpb24+CjwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCjw/eHBhY2tldCBlbmQ9J3cnPz7/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAU1B9ADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6pooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKha7tlcq1xCGBwQXGc1h/EHxLF4S8JX+rS7TJEm2BD/HK3Cj8+T7A18QXVxNd3U1zcyNJPM5kkdjyzE5JP4114bCusm72RxYrGKg1FK7P0BorhPgx4t/4S3wRazTybtRtP9Gusnkso4f8A4EMH659K7uuacHCTi+h1QmpxUl1CiiipLCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA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ooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACvlj9pDxb/bPipNFtJM2WlZV8Hhpz97/AL5GF9jur6A+JXiiPwh4Ov8AVCV+0BfKtkP8crcKPfHJPsDXxHPLJPNJNM7SSyMXd2OSxJySa9HAUbt1H0PLzKtZKkuu4yiiivWPGCiiigAooooAKKKKACiiigAooooAKKKKACvQvgd4t/4RXxvbi4k26df4trjJ4XJ+Rz9G7+havPaKicFOLi+pdObpyUl0P0Gorz34H+Lf+Er8EwfaZN+o2GLa5yeWwPkc/Ud/UNXoVfOzg4ScX0Pp6c1UipLqFFFFSWFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRWZrev6TocW/Vr+3tRjIV2+Zvoo5P4CvONe+NOnwbo9EsJrt+glnPlp9QOSfxxXRRwtWt8EbnPWxVKj8crHrVRzzRW8ZknlSKMdWdgoH4mvmjWPif4p1JmC34s4j/wAs7VAmP+Bct+tcheXl1fS+be3M1xL/AH5ZC5/M16NPJpv45JfiedUzmC+CLf4H1NqHjrwxYZFxrdmSOoibzSPwTNc7ffGHwzb5EAvro9vLhCj/AMeIr50orshk9FfE2zjnnFZ/Ckj3Sf43WK/6jRrl/wDfmVf5A1Sf44t/B4fA+t5n/wBkrxiitllmGX2fxZi8zxL+1+CPYz8cLjPGhRf+BJ/+Jp8PxxcH99oKkeqXeP8A2SvGaKf9m4b+X8X/AJi/tLE/zfgv8j3aD426a2PtGkXif7kit/PFa1n8YPDE5Al+3W3vLBnH/fJNfOdFZyyrDvZNfM0jmuIW7T+R9W6d468MagQLbWrME9BK3lE/g+K6GKWOaMSQusiHoynIP418Y1b0/Ur7TZPM0+8uLV/70MhQ/oa5qmTR+xL7zpp5zL7cfuPsaivm7Rfiz4l0/atzLDqEQ4xcR4bH+8uD+ea7/Q/jNo90VTVrS4sHPV1/exj8gG/Q1wVcsxFPZX9DvpZnh6m7t6nqVFUNI1jTtYg87S72C6j7+U4JX6jqPxq/XA04uzO9NSV0FFFFIYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUVy/xL8UR+EPB19qhK/aAvlWyn+KZuF+uOWPspqoxcmoomUlFOT2R8/8A7R/i3+2fFa6LaSZstKyr4PDTn73/AHyML7Hd615DT5pZJ5pJZnZ5ZGLO7HJYnkk0yvoaVNU4KK6HzNWo6s3N9QooorQyCiiigAooooAKKKKACiiigAooooAKKKKACiiigD0H4IeLf+EU8b25uJNunX+La5yeFyflf8G7+havsWvz5r7E+B3i3/hKvBEAuJN2o2GLa4yeWwPkc/Ud/UGvMzCjtUXzPXy2tvSfyPQqKKK8s9YKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooqhq2s6Zo8Xm6tqFpZRnkG4mWPP0yeaaTeiE2lqy/RXmGu/HDwdpm5bW4udSlHG21hO3P+8+0Y9xmvP8AWP2idQk3Lo2h2sA7PdStKfrhduPzNbwwlWeyOeeMow3kfR9MmljgjaSaRI416s5AA/GvjnWvi5401XcH1mS1jP8ABaIsOP8AgQG79a4y/wBRvdQk8zULy5upP708rOfzJrpjl0n8TOWeZwXwxufbGoeO/Cun5+1+IdLVh1VbhXYfgpJrmtQ+Nngi0yI9Rnu2HaC2f+bACvkKit45fTW7ZzyzOo9kj6bvP2h9ATP2PSNUm/66eXHn8masW5/aNcki18NKB2Ml7n9An9a+fqK0WCoroZPH131PbLj9ofXWz9m0fTI/+uhkf+TCsy4+PnjCXPlx6VD/ANc7dj/6ExryaitFhaS+yZvF1n9o9Of44+Nm6Xlov0tU/rUL/Gvxy3TVIV+lpF/Va83op/V6X8qJ+s1f5n956GfjN48JyNcA9hZwf/EVInxq8dL11aJvraRf0WvOKKfsKX8q+4X1ir/M/vPTk+OPjZet5aN9bVP6Vdtvj74vhx5kOkz/APXSBh/6C4rySik8PSf2UUsVWX2me5Wf7ROrJj7boVjL6+VK8f8APdXQWH7RWmOR/aGg3sA7+RMsv8wtfNtFZvB0X0Ljjq6+0fXWlfG7wVfsFlvLmxY9Bc27fzXcB+ddtpHiXQ9ZA/srV7C7Y/wwzqzD6rnIr4PoBwcjrWMsvg/hdjohmdRfEkz9BqK+HdE8deKNEK/2brt/Ei9I2lMiD/gDZX9K9G8OftBa3aMqa7p9rqEXd4swyfXup+mBXNPAVI/DqdUMypS+LQ+nKK878MfGLwhruyNr86bct/yyvh5Yz/v5K/rXoUUiTRrJE6yRsMqynII9Qa5J05QdpKx2wqRqK8XcdRRRUFhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRXMfEjxQ/g/wlc6zHardNC6L5TPsB3MF64PrTjFyaiupMpKCcnsjp6K+dP8Ahoy7/wChcg/8Cz/8RR/w0Zd/9C5B/wCBZ/8AiK6fqVbt+Ry/X6Hf8GfRdFfOn/DRl3/0LkH/AIFn/wCIo/4aMu/+hcg/8Cz/APEUfUq3b8g+v0O/4M+i6K+dP+GjLv8A6FyD/wACz/8AEUf8NGXf/QuQf+BZ/wDiKPqVbt+QfX6Hf8GfRdFfOn/DRl3/ANC5B/4Fn/4ij/hoy7/6FyD/AMCz/wDEUfUq3b8g+v0O/wCDPouivnT/AIaMu/8AoXIP/As//EUf8NGXf/QuQf8AgWf/AIij6lW7fkH1+h3/AAZ9F0V86f8ADRl3/wBC5B/4Fn/4ij/hoy7/AOhcg/8AAs//ABFH1Kt2/IPr9Dv+DPouivnT/hoy7/6FyD/wLP8A8RR/w0Zd/wDQuQf+BZ/+Io+pVu35B9fod/wZ9F0V5r8IviY/j641OCfTo7F7RI3ULMZN4YsD2GMYH516VWE4Spy5ZbnTTqRqR5o7BRRRUFhRRRQAUVwvjf4peGvCReG4uvtmoLx9ktcOyn/aPRfxOfY14P4v+N/ibW2eLS2TRrM8Bbc7pSPeQ8j/AICFrppYWpV1SsjlrYylS0bu/I+n9b8QaRoUPm6xqVpZLjIE0oUt9B1P4V5tr3x68LWG5NMivdTkHQxx+VGfxbB/8dr5Zubia6nee6mkmmc5aSRizMfUk9ajruhl8F8TuedUzKo/gVj3DVP2iNYlJ/svRbC2H/TxI8x/TbXPXXxx8bTNmO7tLcekdqp/9CzXmFFdKw1JbROaWLrS3kz0JvjN48JyNcA9hZwf/EVYt/jb44ixv1GCb/ftYx/6CBXmtFV7Cl/KvuI+sVf5n9567b/H/wAWxDElto83u8Dg/o4r6W8LajJrHhjSNSnRElvLOG4dUztVnQMQM9ua+DK+5fh1/wAk+8M/9gy2/wDRS15+OpQhFOKsell9adSTU3c6GiiivNPVCiiigAooooAKKKKACiiigAooooAKKwvFXivSfDFr5uqXIWRhmOBPmkk+i/1OBXhnjH4pazrm+3sCdNsTxtib944/2n/oMfjXZhsDVxGsVZdzjxOOpYfSTu+x7J4s8faF4aDx3Nz9ovR/y7W+GcH/AGuy/jz7GvHvE3xZ17Vt8WnldLtj2hOZCPdz0/ACvOycnJ60V72Hy2jR1a5n5/5Hg4jMq1bRPlXl/mPmlknlaSaR5JGOWdzkk+5plFFegeeFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAE1pdXFlcLPZzywTL92SJyrD6EV6T4X+MGr6fsh1qJNStxxv+5KB9RwfxGfevMKKxrYenWVqiubUcRUou9N2Pq3wt410PxKoXTrsLc4ybab5JB+Hf8M10lfF6MyOroxVlOQQcEGvTPBnxZ1PSjHba4G1GyHHmE/vkH1/i/Hn3rxcTlEo+9Rd/I9rDZvGXu1lbzPoSiszw/rum+ILEXek3SXEXRgOGQ+jDqDWnXjSi4u0lZnsxkpK8XdBRRRSGFFFFABRRRQAUUUUAFFFFABRRRQAUVyHxR8XyeCfDI1WKzW8YzpD5bSbB8wJznB9K8j/4aMu/+hcg/wDAs/8AxFb08NUqLmitDnq4qlSlyzep9F0V86f8NGXf/QuQf+BZ/wDiKP8Ahoy7/wChcg/8Cz/8RV/Uq3b8jP6/Q7/gz6Lor50/4aMu/wDoXIP/AALP/wARR/w0Zd/9C5B/4Fn/AOIo+pVu35B9fod/wZ9F0V86f8NGXf8A0LkH/gWf/iKP+GjLv/oXIP8AwLP/AMRR9SrdvyD6/Q7/AIM+i6K+dP8Ahoy7/wChcg/8Cz/8RR/w0Zd/9C5B/wCBZ/8AiKPqVbt+QfX6Hf8ABn0XRXzp/wANGXf/AELkH/gWf/iKP+GjLv8A6FyD/wACz/8AEUfUq3b8g+v0O/4M+i6K+dP+GjLv/oXIP/As/wDxFH/DRl3/ANC5B/4Fn/4ij6lW7fkH1+h3/Bn0XRXzp/w0Zd/9C5B/4Fn/AOIr0f4Q/EZvH6ap5unpYyWRj+VZS+8Pu56D+7UzwtWnHmktC6eLpVJcsXqeiUUUVznSFFFFABRRVXU9RstKspLvUrqG0tk+9LM4VR+J7+1CVwbtqy1RXh3jL4/6fZvJb+FrI38g4+1XGUiz7L95h9dteK+KPiF4n8TM41PVp/s7f8u8J8qLHptXr+OTXZTwNSer0OGrmFKGkdWfWHiL4ieFPDxdNS1q1Ey9YYT5sgPoVXOPxxXm+sftEaXCzLpGi3d1jgPcSrCD74G4/wAq+bKK7YYCnH4tTgnmNWXw6HsmoftBeJpiws7DS7ZD0JR5GH4lgP0rDl+Nnjl2JXVIYwey2kXH5qa83ordYakvso53iqz+0z0L/hcvj3/oO/8AknB/8RVq1+N/jeHHmX9tcf8AXS1QZ/75ArzOiq9hS/lX3ErEVV9p/eey2H7QfiWJgLzTtKuE77UeNj+O4j9K6zS/2itNkwNV0K7g9Wtpll/RgtfN1FZywdGXQ1jja0ftH2doHxV8G61tWDWYbaZv+Wd4DCQfTLfKfwJrtopEmjWSF1kjYZVlOQR7Gvz7rX8P+Jta8PS+Zoup3Vmc5KxyHY31XofxFc08uX2GdVPM39uP3H3fRXzt4M/aBmj8u38W2AlXp9rsxhvq0Z4P1BH0r3Pw34i0nxLYC80O+hu4OjbDhkPoynlT7EVwVaE6XxI9GliKdb4Wa1FFFYm4UUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFfK/wC0f4t/trxWujWkmbLSsq+Dw05+9/3zwvsd3rX0B8TPFCeEPB19qhK/aQvlWyn+KZuF+uOWPspr4kmleaZ5ZnZ5HYszMclieSTXo4Cjduo+h5eZVrJUl13GUUUV6x4wUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABXoHwR8W/8Ip43t2uJNmnX2La5yeFBPyv/AMBbHPoWrz+ipnBTi4vqXTm6clJdD9BqK88+Bni3/hKfBEC3Em7UdPxbXGTywA+R/wAV7+oNeh187ODhJxfQ+npzVSKkuoUUUVBYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV5p8R/i9pPgzUJdMW0uL7VI1VmiX93Gu4ZGXOexHQGvS6+Qf2hv+Srar/wBc4P8A0UtdWEpRq1LSOTG1pUafNDe5J4o+NXi3W98drcx6VbHjZZjD493OWz9MV5xdXM93O093NLPM/LSSuWY/UnmoqK9qFOMFaKseDOrOo7zdwoooqzMKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACuh8KeNNf8KzBtE1KaCPOWgJ3xN9UPH49feueopSipKzKjJxd4ux9MeB/j3pt/5dt4rt/wCzrk8faYQXgY+45ZP1HuK9osru3vrWO5sp4ri3kG5JYnDKw9QRwa/P+ui8HeM9c8IXgn0W9eOMnMlu53RS/wC8v9Rg+9efWwEZa09D0aGYyjpU1R9yUV5x8Nvizo3jER2lwV07WTx9mlb5ZT/0zbv/ALp5+uM16PXmThKm+WSPXp1I1FzRd0FFFFQWFFFFABRRRQAUUUUAFFFFABXmv7RH/JK9S/66wf8Aoxa9KrzX9oj/AJJXqX/XWD/0Yta0P4sfVGOJ/hS9GfIdFFFfRHzAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB6/8AswXv2f4gXNsT8tzYuoH+0rIw/QNX1PXxn8Dr37D8U9BcnCySPCffejKP1Ir7MrxsfG1W/dHu5bK9K3ZhRRXl3xW+LVh4QWTT9L8u+13GDHnMdv7uR3/2Rz644zyU6cqj5Yo7alSNKPNJ6Ha+LvFWkeEtNN7rd2sKHPlxjmSU+ir3P6DuRXzN8QfjLrviVpbXS2bSdKORsib97IP9tx0+gwPXNef+INc1LxDqcl/rN3LdXT9Wc8AeijoB7Dis6vYoYONPWWrPExGOnV0jogooorsOAKKKKACiiigAooooAK+5fh1/yT7wz/2DLb/0UtfDVfcvw6/5J94Z/wCwZbf+ilrzsx+GJ6mWfHL0OhoooryT2QooooAKKKKACiiigAooqrqmoWmlWE17qE6QW0Q3O7ngf4n2ppNuyE2krssswVSzEBQMkntXknxA+LMNn5lh4XZJ7jlXvCMxp/uD+I+/T61xnxE+JN54kaSy07faaTnBXOHm93x0H+z+ee3nte9g8rS9+v8Ad/meDjM0b9yh9/8AkT315c391Jc3s8k9xIcvJIxZj+NQUUV7aVtEeI3fVhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAAASQAMk11fxB8KP4WudMjYNi5tEkcntKBiRR+OD+NO+Fmjf23430+F13QQN9pl9NqcjPsW2j8a9f+Oej/2j4O+2RrmbT5BLnvsb5WH/AKCf+A159fF+zxEKXR7/AD2PQoYT2mHnV6rb5bnznRRRXoHnhRRRQAUUUUAFFFFAF7RtWv8ARb5LvS7qS2uF/iQ9R6EdCPY1718PvihZ68YrHWAllqZ+VWziKY+xP3T7H8D2r53orlxODp4le9v3OrDYyphn7u3Y+0aK8F+HHxSm00xab4kd57LhY7o/M8Xs395f1Hv293gmiuII5oJElikUMjochgehBr5jE4Wphpcs/vPp8NiqeJjzQ+4fRRRXMdIUUUUAFFFFABRRRQAUUUUAeT/tM/8AJN1/6/ov5PXyjX1d+0z/AMk3X/r+i/k9fKNe1gP4XzPBzH+N8gooortOAKKKKACiiigAooooAKKKKACiiigAr2v9le88vxbq9mTgTWXmfUo6j/2c14pXpH7PN59l+KemoThbmOaE/wDfssP1UVhiVzUpLyOjCy5a0X5n19RRRXz59KFFUtZ1Sx0XTZ7/AFS5jtrSEbnkkOAPb3PoBya+X/il8YtQ8TmbTtDMmn6McqxBxLcD/aI+6v8Asj8Selb0cPOs9Njnr4mFBe9v2PU/iP8AGnSfDhlsdCEeq6ouVYq37iE/7TD7x9h+JFfN3ivxVrPiq/8AtWuXslw4zsTpHGPRVHA/me9YlFexRw0KO2/c8OviqlZ+9t2Ciiiug5gooooAKKKKACiiigAooooAKKKKACtDQ9Z1HQdQS+0e8ms7pOjxNjI9COhHseKz6KTSejGm07o+mvhp8cLPVmi0/wAWiKwvThUu14hkP+1/cPv0+nSvbAQQCDkHvX5817F8HPi5P4dkh0fxHLJPopwkUx+Z7X09ynt1Hb0rzcTgvtU/uPVwuP8AsVfv/wAz6koplvNFcwRz28iSwyKHR0bKsp5BBHUU+vLPXCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKK5b4m+KU8IeDb7VMr9p2+Vaqf4pW+7x3xyx9lNVGLk1FEykoJyeyPn/wDaP8W/214sXRrWTNlpWUfB4ac/fP8AwHhfYhvWvIqdNI80ryyuzyOxZmY5LE8kmm19DSpqnBRXQ+Yq1HVm5vqFFFFaGYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB3/AMEvFv8Awinje3a4k2adfYtrnJ4UE/K//ATjn0Jr7Hr8+a+wvgX4t/4SnwRAlzJu1HT8W1xk8sAPkc/Ud/UGvMzCjtUXzPWy2tvSfyPRKKKK8s9cKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK+Qf2hv+Srar/wBc4P8A0UtfX1fIP7Q3/JVtV/65wf8Aopa7sv8A4r9Dz8y/hL1/zPN6KKK9k8IKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKABSVIKkgjkEdq95+Efxpe2MGj+Mpmkg4SHUW5ZPQS+o/2uo756jwaisqtKNWPLI2o1p0Zc0T9BI3SWNZImV43AZWU5BB6EGnV8qfBn4rTeFp4tI12R5tCc4RzlmtCe49U9R26juD9UQyxzwxywuskUih0dDkMDyCD3FeJXoSoysz38PiI143W4+iiisDoCiiigAooooAKKKKACvNf2iP+SV6l/wBdYP8A0YtelV5r+0R/ySvUv+usH/oxa1ofxY+qMcT/AApejPkOiiivoj5gKKKKACiiigAooooAKKKKACiiigAooooA1fCV7/Z3irRr3OBb3kMpPsrg/wBK+8a/PmvpD4s/Fo2Phqw03QJx/a1/ZxTXFwh5t0dAwA9HIP4DnqQR5+Noyqyionp4GvGlCbl5E/xp+Lo0gz6D4WmVtR5S5vEORb+qp6v6n+H69PmqR3lkaSRmd2JZmY5JJ6kmmkkkknJNFdVGjGjG0Tjr15V5c0gooorYwCiiigAooooAKKKKACiiigAr7l+HX/JPvDP/AGDLb/0UtfDVfcvw6/5J94Z/7Blt/wCilrzsx+GJ6mWfHL0OhoooryT2QooooAKKKKACiiqGuatZ6Hpc9/qMoit4hknuT2AHcn0ppOTshNqKuxNf1mx0HS5b/U5hFbx/iWPZVHcmvmfx540v/Ft/unJhsYyfItlPC+59W9/yqPx14tvfFuqm4uSY7WMkW9uDxGv9WPc/0rmq+mwGAVBc8/i/I+Zx+Pdd8kPh/MKKKK9M8wKKKKACiiigAooooAKKKKACiiigAooooAKKKVFZ3VEBZmOAB1JoA9z/AGe9G8nTNQ1iVfmuHEERP91eWI+pIH/Aa9W1C0iv7C5s7gbobiNonHqrDB/nVDwlpK6F4b07TVAzBCFfHdzyx/Fia1q+OxVZ1a0qi76H2OFoqlRjTfbU+ONVsZdN1O7sbgYmtpWib6qcVVr0r48aN9g8Wx6hGuIdQiDE9vMTCt+m0/jXmtfV4er7anGfc+UxFL2NSUOwUUUVsYhRRRQAUUUUAFFFFABXd/Df4gXXhadbW733Oju3zRZy0WerJ/UdD7VwlFZ1aUK0XCaujSlVnRkpwdmfZOnX1tqVjDeWMyT20y7kkQ8Ef57VYr5k+GnjmfwnqHk3BeXSZ2/fRDkof76+/qO4/CvpWzuoL21iubSVZbeVQ6OpyGB718rjMHLDTtunsz6rB4yOJhfZrdE1FFFcZ2BRRRQAUUUUAFFFFAHk/wC0z/yTdf8Ar+i/k9fKNfV37TP/ACTdf+v6L+T18o17WA/hfM8HMf43yCiiiu04AooooAKKKKACiiigAooooAKKKKACul+Gd59g+IXh2cnCi+iRj6KzBT+hNc1VnTZWg1G1mT70cqOPqCDUyV4tFQfLJM+/ay/E2vaf4a0afU9XnENrEPqzt2VR3Y+lWtV1C00nTbi/1GdILS3QySSMeFA/r7d6+Ofin4+vPHOtmVt0OlwEraW2fuj++3qx/Tp7nw8Nh3Wl5H0OKxKoR82RfErx9qXjnVjLcs0GnRMfs1mrfLGPU+rHufwHFcdRRXuRioLljsfPznKb5pPUKKKKogKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD2D4GfE5/Dd5HoeuTk6LO2IpHP8Ax6uT1/3Cevp19c/UwIIBByD0Ir8+a+lP2c/H7ajajwvq8xa7t03WUjnmSMDmP6r1H+z/ALteZjcN/wAvI/M9bAYr/l1P5f5HuVFFFeWeuFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABXyr+0b4t/tvxaNHtZM2OlZRsHhpz98/hwvsQ3rX0B8TvFKeEPBt9qeV+1Y8m1U/xSt93645Y+ymviWWR5pXlldnkdizMxyWJ6k16WAo3bqPoeXmVayVJddxtFFFeqeMFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABXffBPxb/AMIn43tnuJNmnXuLa5yeFBPyuf8AdOOfQmuBoqZwU4uL6l05unJSXQ/QaivOvgV4t/4SjwRAlzJu1HTsW1xk8sAPkf8AFRjPqpr0WvnZwcJOL6H09OaqRUl1CiiioLCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK+Qf2hv+Srar/1zg/8ARS19fV8g/tDf8lW1X/rnB/6KWu7L/wCK/Q8/Mv4S9f8AM83ooor2TwgooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACvdP2ffiSbC4h8L65N/ocrbbGZz/qnP/LMn+6T09Dx0PHhdA4ORWdWlGrHlka0a0qM+aJ+g1FeYfAjx4fFvh02WoSbtY09QkhY8zR9Fk+vY++D3r0+vn6kHTk4yPpadRVIqceoUUUVBYUUUUAFFFFABXmv7RH/JK9S/66wf+jFr0qvNf2iP+SV6l/11g/8ARi1rQ/ix9UY4n+FL0Z8h0UUV9EfMBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABQST1OaKKACiiigAooooAKKKKACiiigAooooAKKKKACvuX4df8k+8M/9gy2/9FLXw1X3L8Ov+SfeGf8AsGW3/opa87Mfhieplnxy9DoaKKK8k9kKKKKACiiigAqpqemWOqQCHUrO3u4gdwWaMOAfUZ6GrdFNNp3Qmk1ZnDax8LPC+oofLs3spf79tIR/46cr+leZeK/hHq+lK8+kONTtV52qNswH+7/F+Bz7V9DUV2Ucwr0n8V15nHWy+hVXw2fkfGDo0bsjqVdTgqRgg+hptfUPjnwDpfiqJpHUWupAfJdRryfZx/EP196+dfE/h3UfDWpNZapCUfqki8pIvqp7j+XevoMJjqeJVlo+x8/i8DUwzu9V3Miiiiu04gooooAKKKKACiiigAqxp88NveRS3NrHdwqfnhkZlDj0ypBH+etV6KGrqwJ2dz33wXoXw98VWXm2Glqlyg/e20lxLvj/APHuR7j9OldMPht4SHTRovxlkP8A7NXzLp19dabexXdhPJb3MRykiHBH+fSve/h38UbXW/KsNcMdpqRwqS9I5z/7K3t0Pb0rwcbhsRSvOlNuPq7o97BYnD1bQqwSl6KzOiHw78JjposH4s5/rU9r4G8M2txFPBo9qksTB0bBOGByDya6SivJeIqveT+9nrLD0ltFfcgooorE2M7WtD0zXIo49Ws4rpIyWQSD7pPpWMfh74UPXRbb8Cw/rXVUVpGtUgrRk18zOVGnN3lFP5HJH4ceEj10WH8JHH/s1QXHw68GQQvNcaVDFEgLO7XEihQOpJ3cVveJfEOm+G9PN5qs4jToiDl5D6KO5/ya+dfHvj3UvFcxiJNrpinKWyN973c/xH9B+td+EpYnEu6m1HvdnBi6uFwys4Jy7WQePb3woZzaeE9KVEQ/NetNKd3silsY9yPy61x1FFfSU6fs48t2/XU+bqVPaS5rJemgUUUVZAUUUUAFFFFABXpHwi8dN4fvV0vU5T/ZNw3ysx/493Pf/dPf8/XPm9FZVqMa0HCexrRrSozU4bn2iCCAQcg9CKK8h+CXjU3cSeHtUlzPEv8AokjHl0HWP6gdPb6V69XyOIoSw9RwkfXYevHEU1OIUUUVgbhRRRQAUUUUAeT/ALTP/JN1/wCv6L+T18o19XftM/8AJN1/6/ov5PXyjXtYD+F8zwcx/jfIKKKK7TgCiiigAooooAKKKKACiiigAooooAK1vCNg2q+KtIsEGTcXcUf0BcZP4DNZNb/gjXY/DWsyaoYmku4beUWeMFUmZdqu2ewBY/UCpnfldty4W5lfY9I/aL8dnWNYPhzTZT/Z9g/+ksp4lnHUfROn1z6CvGKV3aR2eRizscszHJJ9TSVNKmqUVFFVqrqzc5BRRRWhkFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFWtK1C50nU7W/sJTFdW0iyxuOzA5/L2qrRSauNO2qPujwN4kt/Fnhex1e1wvnpiWMHPlyDhl/A/pg963q+Yv2Z/Ff8AZviK48P3UmLXUR5kIJ4WZR/7Mox9VWvp2vAxFL2VRx6H0mFre2pqXXqFFFFYHQFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUVynxP8Up4Q8G32phl+1EeTaqf4pW+79ccsfZTVRi5NRRMpKEXJ7I+f/2jPFv9ueLRpFrJusdKzG2Dw85++fw4X6hvWvJKdLI8srySszyOSzMxyST1JptfQ06apxUV0PmKtR1Zub6hRRRWhmFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB33wU8W/8In43tpLiTbp17i2usnhQT8r/wDATg59M+tfZFfnzX2B8CfFv/CUeCIY7mTdqOnYtp8nlgB8j/iBjPcqa8zMKO1RfM9bLa29J/I9Goooryz1wooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACvkH9ob/kq2q/9c4P/RS19fV8g/tDf8lW1X/rnB/6KWu7L/4r9Dz8y/hL1/zPN6KKK9k8IKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA6DwH4muPCPimy1e23FYm2zRg/62I/eX8unoQD2r7fsLyDULG3vLORZba4jWWN16MrDIP5GvgCvpv9mTxSdQ0C68PXT5uNPPmwZPJhY8j/gLH8mArz8fR5o+0XQ9PLq3LL2b2Z7XRRRXkHtBRRRQAUUUUAFea/tEf8kr1L/rrB/6MWvSq81/aI/5JXqX/XWD/wBGLWtD+LH1Rjif4UvRnyHRRRX0R8wFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABX3L8Ov+SfeGf+wZbf8Aopa+Gq+5fh1/yT7wz/2DLb/0UtedmPwxPUyz45eh0NFFFeSeyFFFFABRRRQAUUUUAFFFFABWV4l0DT/EemPY6pCJIzyrDho2/vKexrVopxk4vmi9RSipLlktD5V8deDr/wAJaj5VwDNZyE+RcqMK49D6N7VzFfYms6XZ6zp01jqUCzW0owynt6EHsR6181/ELwNe+Ebzf81xpkrYhuAOn+y/o36Ht3A+mwGYKuuSppL8z5nH5e6D56esfyOPooor0zzAooooAKKKKACiiigAooooA9R+HXxRutJMWna8ZLuw4RJh80sPoP8AaX26jtnpX0BXyv8ADHSf7Z8b6XbsuYo5PPk9NqfNz9SAPxr6or5rNqdOFVcis3ufS5TUqTpPnd0tgoooryj1QrjfiP44h8H2UQW3a4v7kN5CEEIMYyWPtkcDn6da7KvNvjxpP27wel8i5lsJg5P+w3yt+u0/hXThIwnWjGpszmxcpwoylT3R4Rr2tX+vag97qlw887cDPAUeijoBWdRRX2EYqKstj4+UnJ3e4UUUUxBRRRQAUUUUAFFFFABRRRQBLa3E1pcxXFtI0U8TB0dTgqwOQRX1P8PvFEXivw9FeDat3H+7uYx/C47j2PUfl2r5Trrvhj4pbwv4lillYiwuMRXK9gueG+qnn6ZHeuDMML9Yp3XxLb/I78vxX1epZ/C9/wDM+o6KRWDqGUhlIyCDkEUtfKH1YUUUUAFFFFAHk/7TP/JN1/6/ov5PXyjX1d+0z/yTdf8Ar+i/k9fKNe1gP4XzPBzH+N8gooortOAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAs6bez6bqNrfWb7Lm2lWaNvRlOR+or7r8NatDr2gafqtt/qruBZQM52kjlfqDkfhXwXX0/+y/rpvfCV9pEr5k06fdGD2jkyQP++g/5iuDMKfNBT7HpZbV5ZuD6ns9FFFeOe2FFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV8p/tGeLf7c8XDSLWTdY6VmM4PDTH75/DhfqG9a+gfih4pTwh4MvtSDL9qI8m1U/wAUrfd+uOWPspr4mlkeWR5JWZ5HJZmY5JJ6k16WAo3bqM8vMq1kqS67jaKKK9U8YKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK734K+Lf+ET8b20lxJt068xbXWTwqk/K/8AwFsHPpn1rgqKmcFOLi+pcJunJSXQ/QaivOfgR4t/4SjwRDFcybtR03FtPk8soHyP+IGM9ypr0avnZwcJOL6H09OaqRUl1CiiioLCiiigAooooAKKKKACiiigAooooAKKKKACiiigAr5B/aG/5Ktqv/XOD/0UtfX1fIP7Q3/JVtV/65wf+ilruy/+K/Q8/Mv4S9f8zzeiiivZPCCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACux+EfiA+GvH+lXjPtt5JPs1xzx5b/ACkn6HDf8BrjqKmUVKLi+pUJOElJdD9BqK5v4b60fEHgXRdSdt8stsqyt6yL8rn/AL6U10lfNyi4tpn1MZKSUl1CiiikUFFFFABXmv7RH/JK9S/66wf+jFr0qvNf2iP+SV6l/wBdYP8A0Yta0P4sfVGOJ/hS9GfIdFFFfRHzAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFfcvw6/wCSfeGf+wZbf+ilr4ar7l+HX/JPvDP/AGDLb/0UtedmPwxPUyz45eh0NFFFeSeyFFFRXVxFaW0lxcOI4Y1LMx7AUDSbdkS0EhQSxAA6k15pr3xDmd2i0WIRxjjzpVyx9wOg/HNcXqGqX2oMTe3c03fDucD6DoK5Z4uMdFqe1h8ir1FzVHyr72e4y6xpkLbZdRs0b0adQf51NbX1pdHFrdQTH0jkDfyr57pVJUgqSCOhFZfXH2O58PQtpUd/Q+i6K8V0Xxhq2mOB57XMPeOcluPY9RXpnhzxRYa4oSJvJugMtA55/A9xXRTxEamnU8jGZVXwq5nrHuv1N6iiitzzQqtqVja6nYzWd/Ak9tKu143HBH+e9WaKabTuhNJqzPm74kfDq68MSPe2G+50dj9/q8Oez+3+1+eO/n9fZ8saSxvHKivG4KsrDIYHqCK8Q+I/wqktjLqXheNpIOWkshyye6eo/wBnr6Z6D6DA5mp/u6z17nz+Oyxw/eUVp2PH6KUgqSCCCOCDSV7J4wUUUUAFFFFABRRRQB7V+zxpPy6pq7r1xaxH8mf/ANkr2euX+GulDRfA+mW7gJI0Xny54+Z/mOfoCB+Fcj4/+LFtp3mWPhsx3V4Mq10eYoz/ALP94/p9elfK1o1MZiZezVz6qjKng8NH2jsdt4v8W6X4Vs/N1KbMzDMVvHzJJ9B2HueK4zwh8XrHU71rXXIE04u58mYNmPHZXJ6H36fSvCdQvbnUbyS6vp5Li4kOXkkbJNV69WnlNJQ5Z6vueVUzaq6nNDRdj7QVgyhlIKkZBHQiqmtWEeq6Re2E2PLuYWiJ9MjGfw6185+A/iLqXhdktpt17peeYHb5ox6oe306fTrX0F4b8Q6b4jsBd6VcLKnR0PDxn0Ydj/kV4+JwdXCy5unc9jDYylio22fY+SLmCS2uZYJlKyxOUdT2IOCKjruPjLpP9l+O7x0XEV4BdJ9W4b/x4Mfxrh6+po1FVgprqfLVqbpTcH0CiiitDMKKKKACiiigAooooAKKK6rwp4D13xLsktLXybNv+Xm4+RMe3dvwBqJ1I01zTdkXCnKo+WCuzlans7O5vphDZW81xKeiRIXY/gK9+8N/B/RdP2yatJLqU452n93EP+Ag5P4n8K9EsbG00+AQ2NtDbQjokSBB+Qry62cU46U1f8D1KOT1Ja1Hb8TlPhR/bcXhaO08QWctvJbHZA8pG54+wIzkFenIHGPeuzoorwKs/aTc7Wue/Sh7OChe9gooorM0CiiigDyf9pn/AJJuv/X9F/J6+Ua+rv2mf+Sbr/1/RfyevlGvawH8L5ng5j/G+QUUUV2nAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFep/s3av/Z3xHjtWbEeoW8kGD03Abwf/HCPxryytfwfqf8AY3ivSNS3YW1u45W/3Qw3D8s1nVhzwcTWjPkqRl2Z930UUV84fUBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUVyfxR8VJ4P8GX2pBh9rYeTaqf4pWzj8uWPspqoxcmorqTOShFyeyPn79ovxb/bvi4aTaybrHSsxnB4eY/fP4YC/UH1ryanSO8sjSSMzu5LMzHJJPUmm19DTpqnFRXQ+Yq1HVm5vqFFFFaGYUUUUAFFFFABRRRQAUUUUAFFFFABXcaZ4J+2fCjVfFZMontbtIo0B+VovlDnGPVxz/smuHr7R8LeDorX4VW/hi6XaZrFo7jI5WSQEsfwZjj6CuXFVvZJep2YSh7Zyv0X49D4uoqa+tZbG9uLS5XZPBI0Ui+jKcEfmKhrqOQKKKKBBRRRQAUUUUAFFFFABRRRQAUUUUAd58FvFv8AwiXje2luJNunXn+jXWTwqk8P/wABODn0z619lV+fNfX/AMB/Fv8Awk/giGK5k3ajpuLafJ5ZQPkf8QMe5U15mYUdqi+Z62W1t6T+R6PRRRXlnrhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV8g/tDf8lW1X/rnB/wCilr6+r5B/aG/5Ktqv/XOD/wBFLXdl/wDFfoefmX8Jev8Ameb0UUV7J4QUUUUAFFFFABRRRQAUVoafoeralj+ztMvrvPTyLd5M/kK6Oz+F/jW8x5Xh29XP/PbbF/6ERUOcY7suNOcvhTZxlFejR/Bbx0/3tIjT/eu4f6Masx/A3xqw+a0s0/3rpf6VH1il/MvvNPq1X+V/ceYUV6fJ8DfGqLlbWzc+i3S5/XFZl18IvHNtkvoMjj1jnif+TZpqvTf2l94nh6q3i/uODord1Hwf4k04E32g6pCo6u1q+3/vrGKw2UoxVgVYcEEYIrRST2M3Fx3QlFFFMkKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD6f/AGXNT+0+DdQ09my9nd7lHokigj/x5Xr2evmf9la/8rxRrNgTgXFos2PUo4H/ALUNfTFeDjI8tZn0WBlzUYhRRRXMdYUUUUAFea/tEf8AJK9S/wCusH/oxa9KrzX9oj/klepf9dYP/Ri1rQ/ix9UY4n+FL0Z8h0UUV9EfMBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV9y/Dr/kn3hn/ALBlt/6KWvhqvuX4df8AJPvDP/YMtv8A0UtedmPwxPUyz45eh0NFFFeSeyFcL8VNU8jTodOjb57g75P9xen5n+Vd1XiHjXUf7T8SXcqnMUbeTH/urx+pyfxrnxM+WFu56+S4f22IUntHX/IwqKKK8w+0CiiigAp0btG6vGzI6nIZTgg+optFAHpHhLx2G2WmuMAeiXPb/gf+P5+tehqwZQykFSMgjoa+dK6nwl4vudFZYLjdcWGfuZ+aP3X/AA/lXZRxNvdmfPZjkqneph9H2/yPY6Kq6bqFrqdotzZTLLE3cdQfQjsatV3J31R8tKLi+WSswooopiOB8ffDbT/E3mXdmVsdVPJlC/JKf9sDv/tDn614B4i0DUvD1+bTVrZoZOqt1Vx6qehFfXtUNb0ew1ywez1W2juLduzDlT6g9QfcV6eEzKdD3Z6x/FHmYvLYV/ehpL8GfHtFeq+M/hFfaf5l14ddr61HJt2wJkHt2b9D7GvLZY3hlaOZGjkQ4ZWGCD6EV9DRxFOuuam7nz1bD1KD5aisMooorYxCrekC1OqWn9osVsxKpmIGTsB5AHriqlFDV1Yadnc7zx78SNR8S77Sz3WOk9PJU/NKP9sj/wBBHH1rg6KKzpUoUY8sFZF1as60uabuwooorQzCr+iavf6JfpeaXcvb3C91PDD0I6EexqhRSaUlZjTcXdHcePPGFv4w0fTprmD7PrFo5jkCDKSowzuB7YKjg/3up7cPRRUUqUaUeWOxdWrKrLnluFFFFaGYUUUUAFFFFABWp4d0DUvEV+LTSbZppOrN0WMerHsK6v4e/De+8StHeX2+z0nr5hHzzD0QHt/tHj619B6Jo9hodglnpdtHbwL2UcsfVj1J9zXmYzMoUPchrL8Eeng8tnX9+ekfxZw/g34UaTo2y41bbqd6OcOv7lD7L/F9T+Qr0cAAAAAAcACiivnatadaXNUdz6KlQhRjy01YKKKKyNQooooAKKKKACiiigDyf9pn/km6/wDX9F/J6+Ua+rv2mf8Akm6/9f0X8nr5Rr2sB/C+Z4OY/wAb5BRRRXacAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAfd/g6+Op+EtFvmOWuLKGVvqUBP61r1wvwOujd/CvQJD1SN4v8AviRlH6AV3VfN1Fyza8z6mlLmhGXdBRRRUGgUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV8o/tFeLf7d8X/wBlWsm6w0rMXB4aY/fP4YC/gfWvoH4p+Kl8H+DL3UVZReMPItVPeVs44745Y+y18TyO0kjPIzO7ElmY5JJ7k16WX0bt1GeXmVayVJddxKKKK9U8YKKKKACiiigAooooAKKKKACiiigAooooA7P4PaB/wkfxC0m1dN1vDJ9qnyONkfzYPsThf+BV9p14X+y34e+z6PqXiCdMSXb/AGaAkf8ALNeWI9i2B/wCvdK8THVOepbse/l9LkpXfU+R/wBojQP7G+Ic91Gm221NBdLgcb/uuPrkbv8AgVeY19WftJ+Hv7W8DLqUKbrnSpfNyBz5TYVx+e0/8BNfKdelhKnPSXloeXjaXs6z89QooorpOQKKKKACiiigAooooAKKKKACiiigAru/gv4t/wCES8b2s1xJt067/wBGusngKx4f/gJwfpn1rhKKmcFOLi+pcJuElJdD9BqK83+A3i3/AISfwTDDcybtR03FtNk8suPkf8QMfVTXpFfO1IOEnF9D6enNVIqa6hRRRUFhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABXyD+0N/yVbVf+ucH/opa+vq+QP2hf+Srar/1zg/9FLXdl/8AFfoefmX8Jev+Z5xRRWx4a8M6z4mu/s+h6fPduPvMgwif7zHhfxNew2krs8NJydkY9A5OBXv3hT9nqZwk3inVBEOptrIbm/F2GB+AP1r2Hwv4C8M+GAjaTpNulwv/AC8SDzJf++myR+GBXHUx1OPw6ndSy+rPWWh8o+HPhn4t1/Y9lo1xHA3/AC2uR5KY9RuwSPoDXpWhfs7XThX17W4YvWKziL/+PNjH5GvouiuKePqS20O+nl1KPxanmWjfBDwZp20z2tzqDj+K6nOM/RNo/MV22meGdC0pVGm6Pp9tjoYrdFP54ya16K5pVZz+JnXCjTh8MUgooorM0CiiigAooooAKydc8N6Lr0ZTWdLs7zjAaWIFh9G6j8DWtRTTa1Qmk1ZnhXjX4AWNwj3HhK7a0mAyLS5YvG3sH+8v47vwrwDxDoWpeHdTk0/WbSS1uk52v0YdipHBHuK+9K5T4keCrDxtoElldKsd5GC1rc4+aJ/6qe4/qAa7qGNlF2qao8/EYCMlzU9GfElFWtUsLjS9SurC+jMV1bSNFIh7MDg1Vr2FqeI1bRhRRRQIKKKKACiiigAooooAKKKKACiiigAooooA9M/Z0ufI+KVjHn/j4gmi/JC//slfXVfGPwRm8n4qeH29ZXT/AL6jYf1r7Orx8wX7xPyPcy1/umvMKKKK4D0QooooAK81/aI/5JXqX/XWD/0YtelV5r+0R/ySvUv+usH/AKMWtaH8WPqjHE/wpejPkOiiivoj5gKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiinRRvK4SJGdz0VRkmgY2iugsPBfie/Aa08P6rIh/iFq4X8yMVrRfCrxvKu5fD10B/tMin9WqHUgt2i1Sm9ov7jiaK7Kf4X+NYQS/h29OP7gV/5E1g6t4e1nRxnVdJv7JezXFu6A/QkYoVSMtmKVOcd0zLr7l+HX/JPvDP8A2DLb/wBFLXw1X3L8Ov8Akn3hn/sGW3/opa4cx+GJ6OWfHL0OhoooryT2TO8RX39m6He3ecNHGdh/2jwv6kV4JXqnxXvPK0e2tVOGnl3H3VR/iRXldedi5XnbsfYZDR5KDqfzP8F/TCiiiuU9sKKKKACiiigAooooA0NG1e80e6E9jKUb+JTyrj0I716z4X8WWWuKsTEW97jmFj973U9/p1rxalVmRgyEqwOQQcEGtqVaVP0PPx2W0sWrvSXf/PufRdFeZeF/HskAS21vdLH0FwBll/3h3+vX616RaXMN3Ak9rKksTjKuhyDXo06sai0Pj8XgquElaotO/QlooorQ5Arm/FngrRfFCE6jbbboDC3MPyyD8e49jmukoq4TlTfNB2ZE4RqLlmro+cvFnwo1rRt8+mj+07Mc5iXEqj3Tv+Gfwrzx1ZGKuCrA4IIwQa+0K5vxT4J0PxKrNqFoFuSMC5h+SQfj3/HNexh83a0rK/mjx8RlCetF28mfKVFemeKfhFrGm75tHddTthztUbZVH+70P4HPtXnFzbzWs7w3MUkMyHDJIpVlPuDXtUq9Osr03c8WrQqUXaorEVFFFamQUUUUAFFFFABRRRQAUUUUAFFFa/hvw7qfiO9FtpNs0rDG9zwkY9WboP5+lKUlFc0nZDjFyfLFXZlIjSOqIpZ2OAoGST6V7R8N/hVtMWp+KYueGisW/Qyf/E/n6V13gH4dad4XVLmfbearjmdh8sfsg7fXr9OldzXgY3NHP3KO3c9/BZWoWnW37f5goCqAoAA4AHaiiivFPaCiiigAooooAKKR3VFLOwVR1JOBWXdeItHtSRNqVsCOoVwx/IZpOSW5cKc6mkE36GrRVHSdVs9XgebT5vNjR9hO0rzgHoR71eoTT1QpQlB8slZhRRRTJPJ/2mf+Sbr/ANf0X8nr5Rr6u/aZ/wCSbr/1/RfyevlGvawH8L5ng5j/ABvkFFFFdpwBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUV0Pg3wdrXjC/NtoloZAv+tnc7Yoh/tN/QZPtSlJRV2VGLk7RWpz1FfUHhH4CaHp6JL4inl1W5xkxITFCD+HzH65H0r0nS/B/hzSgo0/Q9NgZejrbru/76IyfzrhnmFOOkVc76eW1JK8nY+FqK/QIQRBCgiTYeq7RisLXfBXhvXYWj1TRbKbIx5giCSD6OuGH4GoWYq+sTR5W7aS/A+GqK9n+KPwVudBt5tU8MPNe6cgLS278zQjuRj7yj8x78mvGK7qdWNVc0WefVpTpS5ZoKKKK0MgooooAKKKKACiiigAooooAKKKKACiiigAooooA+tf2bpzL8MYEP/LG6mQfmG/8AZq9Rrx/9l1y/w9vFP8GpSAf9+4j/AFr2Cvn8SrVZep9LhXejH0CiiisDoCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKK5H4qeKl8H+DL3UVZReOPItVPeVs4OO+BlvotVGLk1FdSZyUIuT2R8/ftE+Lf7e8Yf2XaybrDScxcHh5j98/hgL+B9a8opZHaR2eRizsSWZjkk+ppK+ipwVOKiuh8xVqOrNzfUKKKKszCiiigAooooAKKKKACiiigAooooAKls7aW8u4La2QyTzOscaDqzE4A/M1FXqv7OXhv+2fHY1CZN1rpSeeSRwZTkRj/0Jv8AgNRUmqcHJ9DSlTdSagup9N+EtFi8O+GtN0i3wUtIVjLD+JurN+LEn8a1qKK+cbbd2fUJKKsivqNnBqOn3Vldpvt7mJoZF9VYEEfka+EvEekz6Fr1/pd1/rrSZoicY3YPBHsRg/jX3rXzP+1B4c+x+ILHX4ExFfJ5M5A6SoOCfquB/wAANd2Aqcs3B9Tz8ypc0FNdDxGiiivYPDCiiigAooooAKKKKACiiigAooooAKKKKAO6+DHi3/hEvG1rPPJt067/ANGusngKx4f/AICcH6Z9a+zK/Pmvr34C+Lf+Em8ExQXMm7UdMxbTZPLLj5H/ABAx9VNeZmFHaovmetltbek/kek0UUV5Z64UUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV8q/GLw/qniT40anY6JZy3dw0cBIQYCjyl5Zjwo9zX1VUUVvDFNNLFFGksxBkdVALkDAJPfAAFb0KzoyckjDEUFXiot9TxTwN8BNPsljufFlwb+56/ZYGKwr7FuGb9B9a9n06wtNMtI7XTrWG1to+FihQIo/AVZoqaladV3kyqVCFJWggooorI1CiiigAopGYIpZiFUDJJOABXKax8R/CGkMy3uv2W9eqQsZmHsQgJqoxlLSKuTKcY6ydjrKK8g1X4/eFrXK2NtqV8/YrGsaH8WOf0rk9Q/aLumyNO8PQRejT3JfP4BV/nW8cJWl9k55Y2jH7R9F0V8qXnx98XT58mLSrYdvLgYn/AMeY1k3Hxo8dS/d1dIh6JaRf1U1osBVfYyeZUV3PsGivi6b4p+NpWy3iG7B/2Qi/yFRj4n+NAc/8JFffiR/hV/2dPuiP7Tp9mfatFfGCfFfxunTxBcn6pGf5rVyH4zeO4+uthx6PaQ//ABFJ5fU7oazOl2f9fM+w6K+ULT48+MYMeb/Ztz/11tyM/wDfLCtyx/aJ1VMfbtCsZvXyZXi/nuqHgaqLWYUXu7GX+03o6WPjq31CJcLqFsrufWRDtP8A47sryCvRPi78RIPH40h49NewlshKHDTCQMH2YwcDptP5153Xq4dSjTSluePiZRlVlKGzCiiitjAKKKKACiiigAooooAKKKKACiiigAooooA6v4UuY/iT4bI730a/mcf1r7br4h+Fv/JR/Df/AF/w/wDoQr7eryMx+Neh7WWfBL1CiiivPPTCiiigArzX9oj/AJJXqX/XWD/0YtelV5r+0R/ySvUv+usH/oxa1ofxY+qMcT/Cl6M+Q6KKK+iPmAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiivTvhf8JNT8YBL/UGfTtFPImK/vJ/+uYPb/aPHpnmonUjTXNJmlOnKpLlgrs850+xutSu47XT7aa5uZDhIoULs30Ar17wn8A9c1EJN4guodKgPPlL+9m/EA7R+Z+lfQPhHwhonhKz+z6HYxwFhiSY/NLJ/vMeT9OnoK368urj5PSnoetRy2K1qO5514e+Dfg3RtrPp7ajOv/LS+fzB/wB8DC/pXeWNhZ6fF5VhaW9tH/chjCD8gKs0VxTqSn8TuehClCHwqwUUUVBYUMAwIYAg8EHvRRQByXiX4c+FfESN/aGj2yzH/lvbr5MgPrlcZ/HNdBoenR6PothpsDu8Nnbx26M+NzKihQTjvxV2iqc5NWb0IUIp8yWoUUUVJZ5P8VbnzdfhgB+WGEZHuSSf0xXF1t+NZ/tPirUnznbL5f8A3yAv9KxK8eq+abZ+g4Gn7PDwj5IKKKKg6gooooAKKKKACiiigAooooAK0tF1q+0afzLCcoCfmQ8o31H+TWbRQm07omcI1I8s1dHrvh3xzY6lthvsWd0ePmP7tj7Ht9D+ZrrxyMjpXznXQ+HvFuo6LtjV/tFqP+WMh4A/2T1H8vau2ni+kz57GZEn72Gfyf6M9rorn9A8WaZrO1Ek8i5P/LGU4JPseh/n7V0FdkZKSuj5urRnRly1FZhRRRVGYVma7oGla9B5WrWMNyoGAzLhl+jDkfga06KcZOLvF2YpRUlaSujx/XvgraybpND1GSBuoiuV3r9Nw5A/A155rfw68T6QzGTTZLmIf8tLT96D+A+YfiBX1HRXo0s1r09Ja+p51XKqFTWOnofGEsbxSNHKjI6nBVhgj8KbX2LqOl2GpJs1GytrpewmiV8fmK5XUfhf4UvSWGntbOf4reVl/TJH6V6FPOab+OLX4/5Hn1MmqL4JJ/gfMlFe/XXwV0Rzm21DUIvZyjj/ANBFUm+CFofua1OPrAD/AFroWaYZ9fwZzvK8Sun4nh1Fe6J8EbEH95rNy30hUf1Nadn8G/DkODPNqFwe4eVVH/jqg/rSlmuHWzb+Q45ViHukvmfPFbWg+F9a151Gl6dPMhOPN27Yx9XPH619JaZ4F8M6aVa10a1LryGmUykH1y2a6VQFUBQABwAO1clXOV/y7j9510smf/LyX3Hjnhb4MRxsk3iW7809fs1sSF/4E55P4AfWvWdL06z0qzS0062itrdOiRrgfX3PvVqivJr4qrXf7xnrUMLSoL92gooornOgKKKSR1jRnkZVRRksxwAKAFps0scMbSTOscajJZjgD8a4jxF4/trUtDpCC5mHBlb/AFY+ndv5V53qur3+rS77+5kl5yFJwq/QDgVzVMVGOi1PZwmS1q/vVPdX4/cen6v490qy3Jab72Uf88+E/wC+j/QGuO1Lx7rF3lbdorSM/wDPNct+Z/piuSorjniJy62PoKGUYaj9m789f+AWLy9ur1993cTTt6yOW/nVeiisb3PRSUVZHonwjusS6haE9VWVR9Mg/wAxXpFePfDOfyfFUSZ/10bx/pu/9lr2GvTwrvTPjM7p8mKb7pP9P0Ciiiug8g8n/aZ/5Juv/X9F/J6+Ua+rv2mf+Sbr/wBf0X8nr5Rr2sB/C+Z4OY/xvkFFFFdpwBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRWh4e0i617W7LS7BQ1zdyiNM9BnqT7AZJ9hSbsrsaTbsjrfhL8PLrxzq5MpeDR7Zh9puB1P8A0zT/AGj+g59AfrrQ9IsNC0yHT9JtY7W0hGFjQfqT1JPcnk1W8JeH7Lwv4ftNJ05AIYEwXxgyN/E7e5PP6VsV4WJxDrS8j6LC4ZUI+YUUUVzHUFFFFABXyj+0J4Jj8N+I49U02IR6bqZZtijCxTDllHoDnI/EdBX1dXCfG/RU1v4aauhUGW0T7bEf7pj5P/ju8fjXTharp1F2Zy4yiqtJ91qfGlFFFe8fOBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB9Q/ssn/ihNSH/AFEn/wDRUVey141+yz/yIup/9hJ//RUdey14GK/iyPpMJ/BiFFFFc50hRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFfJ/7RPi3+3vGB0u1k3WGlZi4PDTH75/DAX/gJ9a+gvir4qXwf4LvdQVgLxx5Fop7ysDg/gMt/wGvih3aR2d2LOxyWJySfU16WX0bt1GeVmVayVJfMSiiivVPHCiiigAooooAKKKKACiiigAooooAKKKKACvr34AeHP7A+H1rNMm271I/a5M9QpHyD/vnB+rGvmT4e+Hn8U+MdM0kA+VNKDMR/DEvLnP0Bx7kV9xRosUaxxqFRQFVQMAAdBXm5hUslTR6uWUrt1H6DqKKK8o9gK4/4t+HP+Eo8BanYxpvuo0+0W2Bz5icgD3Iyv/Aq7CiqjJxkpLoTOKnFxfU/Pmiu4+M3hv8A4Rn4gajbxpstLlvtdvjpsckkD6NuH4Vw9fRwkpxUl1Pl5wcJOL6BRRRVEBRRRQAUUUUAFFFFABRRRQAUUUUAFd18GfFv/CJeNrWeeTbp91/o11k8BWPD/wDATg/TPrXC0VM4qcXF9S4TcJKS6H6DDkcUV5r8BPFv/CTeCYre5k3ajpmLabJ5ZMfu3/EDH1U16VXztSDpycX0Pp6c1UiprqFFFFQWFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFI7KilnIVVGSScACgBaR2VEZnYKqjJJOABXk3jr436FoRltdEA1i/XI3RtiBD7v/F/wHI9xXz94y+IHiLxdIw1a/cWpORaQfJCv/AR1+rZNdlHBVKmr0RxVsdTp6LVn0r4s+MfhPw+Xiju21O7XjyrIB1B93+7+RJ9q8i8SfH3xFf7k0W1tdKiPR8edL+bDb/47XjlFehTwVKG6ueZVx1WezsvI19c8Ta3rzE6xqt5eDOdkspKD6L0H4CsiiiupJLRHG227sKKKKYgooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDqPhb/wAlH8N/9f8AD/6EK+3q+Ifhb/yUfw3/ANf8P/oQr7eryMx+Neh7WWfBL1CiiivPPTCiiigArzX9oj/klepf9dYP/Ri16VXmv7RH/JK9S/66wf8Aoxa1ofxY+qMcT/Cl6M+Q6KKK+iPmAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKK9U+A/w/HizW21LU4t2jWDjcrDieXqE+g4J/Ad6ipUVOLlI0pU5VZKETofgh8JV1NIfEHim3Jsjh7SzkGPO9Hcf3fQd+p46/SCKqIqooVVGAAMAClAAAAGAO1FeBWrSrS5pH0dChGjHliFFFFZGwUUUUAFFFFABRRRQAUUUUAFFFR3T+VbSyf3ELfkKBpXdj5/1CY3F/czHrJKz/AJkmq9FFeI9T9JSsrIKKKKBhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABXWeHvG2oaXtiuiby1HG2RvnUezf0P6VydFVGcoO8WZV8PTrx5aiuj3TQ/Emm6yoFpOFm7wyfK4/Dv+Ga2K+dASpBBII5BFdVoXjfU9N2x3LfbbccbZT8w+jdfzzXZTxa2mfOYrIJL3sO7+T/AMz2Giud0fxhpGp7VFx9nmP/ACzn+X8j0P510Q5GRXXGSkrpng1aNSi+WpFphRRRVGQUUUUAFFFFABRRRQAUUUUAFFFFABRUdzPFbQtNcSJFEoyzucAV574m8f8A37fQxx0Ny4/9BB/mfyrOpUjTV5HVhcHVxUuWmvn0Os8R+JLDQov9IfzLgjKQIfmP19B715T4i8S3+uSEXEnl2wOVgQ4UfX1P1rGmlknlaWZ2kkc5ZmOST7mmV59WvKppsj67A5XSwvvPWXf/ACCiiisD0wooooAKKKKANjwfL5PijTGzjM6r+fH9a90r5/0d/L1excdVnRvyYV9AV34N+60fK8Qx/eQl5BRRRXYfPHk/7TP/ACTdf+v6L+T18o19XftM/wDJN1/6/ov5PXyjXtYD+F8zwcx/jfIKKKK7TgCiiigAooooAKKKKACiiigAooooAKKKKACvdv2WvDwn1TU9fnQFbZBawEj+NuWI9woA/wCB14TX2F8AtLXTPhfpZ27ZbsyXUnuWYhT/AN8qtceOny0rLqd2X0+etd9NT0SiiivEPfCiiigAooooAKqaxbi70i+tiMiaB4yPqpH9at0UJ2E1fQ/Pmiiivpz5MKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPqH9ln/kRdT/7CT/8AoqOvZa8a/ZZ/5EXU/wDsJP8A+io69lrwMV/FkfSYT+DEKKKK5zpCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoorkPit4qXwf4LvdQRgLxx5Fop7ysDg/gMt/wABqoxcmorqTOShFyeyPn79ojxb/b/jE6ZaybrDSswjB4aY/fP4YC/8BPrXlNK7M7s7sWdjksTkk+tJX0VOCpxUV0PmKtR1Zub6hRRRVmYUUUUAFFFFABRRRQAUUUUAFFFFABRRVjTbKfUdQtrK0Qvc3Mqwxr6sxwB+Zo2Glc+hP2XPDXk2Oo+I7hPnnP2S2JH8AILkfVto/wCAmveqy/C2jQeHvDun6Ta/6q0hWPdjG4/xN9Scn8a1K+dr1PaTcj6bD0vZU1AKKKKyNgooooA8c/aY8Nf2n4Sg1q3TNxpj/vCOphcgH8m2n2Ga+XK+/dTsoNS066sbxN9tcxNDIvqrDB/Q18K+J9Hn8P8AiHUNJuwfNtJmiJxjcB0YexGD+Nevl9W8XB9Dxcypcs1UXUzKKKK9A8wKKKKACiiigAooooAKKKKACiiigAooooA7n4NeLf8AhEfG1rcTybdPuv8ARrrJ4CMeG/4CcH6Z9a+zRyOK/Pmvrz4B+Lf+Em8FRW1zJu1HTMW0uTyyY/dv+IGPqprzMwo7VF8z1strb0n8j0qiiivLPXCiiigAooooAKKKKACiiigAooooAKKK88+K3xNsPBFobeAJd63KuYrbPEY7PJjoPQdT7dRcISm+WO5FSpGnHmk9Df8AHHjPR/Bmmfa9Ynw7A+Tbx8yzH0UenueBXy18RPihrnjOV4XkNjpOfls4WOGH+238Z/T2rktf1rUPEGqzajq9y9zdynLO3YdgB0AHYCs+vZw+EjS1erPCxONnW0jogooorrOIKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA6j4W/wDJR/Df/X/D/wChCvt6viH4W/8AJR/Df/X/AA/+hCvt6vIzH416HtZZ8EvUKKKK889MKKKKACvNf2iP+SV6l/11g/8ARi16VXmv7RH/ACSvUv8ArrB/6MWtaH8WPqjHE/wpejPkOiiivoj5gKKKKACiiigAooooAKKKKACiiigAooooAKKKKALGm2U+pahbWVmhkubmVYY19WY4A/M19xeCvDtt4V8M2OkWeCsCfPJjBkkPLMfqc/QYHavnT9mfw+NT8az6rMm6HS4ty56ea+VX9N5+oFfU9eTmFW8lTXQ9rLaNouo+oUUUV5x6YUUUUAFFFFABRRRQAUUUUAFFFFABVXVTjTLw+kL/APoJq1VbUxu027HrE4/Q0nsXT+JHz5RRRXin6QFFFFABRRRQAVf0jSL3V7jyrCBpCPvN0VfqegrpfCXgmbUwl1qW+CzPKp0eQf0Hv/8Arr1Gxs7ewtlt7OFIYV6Ko/zk+9dNLDOestEeLj85hh24Uvel+COH0f4cwRhX1a5aV+8UPyr+Z5P6V01v4W0S3Xamm25H/TRd5/8AHs1s0V3Rowjsj5qtmGJrO8pv5afkZraBo7LtOl2OPaBQf5Vhat4B0q7QmzD2UvYoSy/ipP8AIiuvopypwlo0RTxlek7wm/vPEPEHhfUdEJeeMS22eJo+V/H0/GsKvotlV1KuAykYIIyCK4LxT4Djn33OiBYperW5OFb/AHT2+nT6Vx1cK1rA+hwOeRn7mI0ffp8+x5jRUlxBLbTvDcRtHKhwyMMEGo64z6FNNXQUUUUAFFFFABWvpHiLVNJwLO7cRD/lk/zJ+R6fhWRRTUnF3RFSnCouWauvM9M0v4jwsFXVLRo27yQHcPyPI/M11mm+INK1LAtL2FnPRGO1vyPNeD0V0RxU1vqeRXyLD1NYXi/vX9fM+jKK8Fstc1SxwLW/uEUdF3kr+R4rfs/iDrEIAnW3uR6um0/+O4H6V0RxcHujy6uQV4/A0/w/r7z1uivOIfiWw4n0xT7pNj9CKux/EjTyP3lldKf9naf6itFiKb6nHLKcXH7H4r/M7qiuKPxH0rHFtfZ/3E/+KqCX4k2QH7qwuGP+0yr/AI0e3p9yVleLf2Gd5RXmV18Srlh/omnwx+8khf8AlisO/wDGeuXgI+1mBD/DAoT9ev61EsVTW2p1U8jxU/itH5/5XPYb29tbGLzLy4igT1kYDP09a43WfiHZwBk0uFrmTtI/yoPw6n9K8xmlknkMk0jyOerOxJP4mo6554uT+HQ9XD5DRp61XzfgjR1jWb/WJvMv7hpAD8qDhV+grOoorlbbd2e3CEYR5YKyCiiigoKKKKACitbRvD+paww+xWzGPPMr/Kg/E9fwrvdH+HlnAFfVJnuZO8afKn+J/StYUZz2Rw4nMcPhtJy17Lc8wggluJRHbxPLIeiopYn8BW3beD9duFDJp7op/wCejKn6E5r2WysrWxi8qzt4oE9I1Az9fWrFdUcGvtM8SrxDNv8AdQS9f6R5FbeBdcjmikMUPysGx5ozwa9doorenSjT+E8rGY6pjGnUtp2CiiitTiPJ/wBpn/km6/8AX9F/J6+Ua+rv2mf+Sbr/ANf0X8nr5Rr2sB/C+Z4OY/xvkFFFFdpwBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABX3Z4IthZ+DNBtx0isIE+uI1r4Tr728OceHtL/69Yv8A0AV5uY7RPVyte9I0KKKK8o9gKKKKACiiigAoNFFAH580UUV9OfJBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB9Q/ss/8iLqf/YSf/wBFR17LXjX7LP8AyIup/wDYSf8A9FR17LXgYr+LI+kwn8GIUUUVznSFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABXyd+0P4t/t/xidNtZN1hpWYRg8NMf8AWH8MBf8AgJ9a+gviv4rXwh4LvdQRgL2QeRaA95WBwfwGW/Cvil2Z3Z3YszHJJOSTXpZfRu3UZ5WZVrJUl8xKKKK9U8cKKKKACiiigAooooAKKKKACiiigAooooAK9j/Zn8NDU/Fs+tXCZt9LT93noZnBA+uF3H2O2vHK1NK8Q61pEDQ6Tq+o2MLtvaO2uXiUtjGSFI5wBz7VlWg5wcYu1zWhONOalJXsfeVFfDP/AAm/iv8A6GfXP/A+X/4qj/hN/Ff/AEM+uf8AgfL/APFV539nS/mPU/tOH8p9zUV8M/8ACb+K/wDoZ9c/8D5f/iqP+E38V/8AQz65/wCB8v8A8VR/Z0v5g/tOH8p9zUV8M/8ACb+K/wDoZ9c/8D5f/iqP+E38V/8AQz65/wCB8v8A8VR/Z0v5g/tOH8p9zV85/tReGPJvrDxLbJ8k4+y3JA/jAJRj9Rkf8BFeS/8ACb+K/wDoZ9c/8D5f/iqraj4n1/U7VrXUtc1S8tmILRXF3JIhI5GQSRW1DBzpTUrmOIx0K0HDlMiiiivQPMCiiigAooooAKKKKACiiigAooooAKKKKACu4+Dniz/hEfG1pczybdPuf9GusngIx4b/AICcH6Z9a4eipnFTi4vqXCbhJSXQ/QYcjI6UV5p8AvFv/CS+Cora5k3ajpmLeXJ5ZMfu3/EDH1U16XXztSDpycX0Pp6dRVIqa6hRRRUFhRRRQAUUUUAFFFFABRRWF428S2fhLw3d6vfnKQriOMHBlkP3UH1P5DJ7U0nJ2QpSUVdnO/F34hW/gfRtsGybWrlSLaA8hR08x/8AZH6nj1I+QNSvrrU7+e9v53nup3LySOclmNXPE+u33iXXLrVdVl8y5nbJx91B2VR2AHArLr3cNh1Rj5nzuKxLry8ugUUUV0nKFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHUfC3/ko/hv/r/h/wDQhX29XxD8Lf8Ako/hv/r/AIf/AEIV9vV5GY/GvQ9rLPgl6hRRRXnnphRRRQAV5r+0R/ySvUv+usH/AKMWvSq81/aI/wCSV6l/11g/9GLWtD+LH1Rjif4UvRnyHRRRX0R8wFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH1X+zNpYsvh696V+e/unk3f7K4QD81b869brkvhLaCy+GvhyIDAazSb/vsb/8A2autr52vLmqSfmfT4ePLSivIKKKKyNgooooAKKKKACiiigAooooAKKKKACmTp5kMif3lK/mKfRQCdtT506daSrWpxG31K7hPBjmdPyYiqteI1Y/SovmSaCiir2kaVeavdi3sYTI/8R6Ko9SewoSbdkEpxgnKTskVI43lkWOJWd2OFVRkk+gFel+DvA62xS91lVebqlueVT3b1Pt0/pt+FfCtpoUYkbE98R80xH3fZR2Hv1P6V0dehRw3L709z5XMc5dW9PD6Lv1f+QUUUV1nz4UVHcTRW0Ek1xKkUMalnkkYKqgdSSegrxLxn8frCxuJLXwxY/2gyHH2qdikRP8AsqPmYe/FaU6M6rtBGVWtCkrzZ7jRXzTpP7Q+spdA6vo+nz2x6i1LxOPfLMwP5CvbfA/jvQvGdqX0i6xcKMyWs3yyx/Udx7jIq6mGqUleS0IpYqlVdovU6miiisDoMPxL4asteh/fDyrpRhJ1HI9j6j2ryLXtEvdEuvJvY8KfuSLyrj2P9K95qvf2VvqFq9veRLLC/VW/mPQ+9c9bDqpqtz1cBmtTC+5LWHbt6Hz3RXXeLfBtxpG+5st1xYdSf44/971HvXI1504ODtI+woYiniIc9N3QUUUVJsFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUVqaLoWoazJtsYCyA4aVuEX6n+nWvRNB8A2Nltl1Jvtk452YxGPw7/j+Va06M6mxw4rMaGF0m7vstzz3RPD+o6y4FlATFnBmf5UH49/oM16NoHgPT7DbLf/AOm3A5wwxGP+A9/x/KuvjRY0VI1VUUYCqMAClrup4aMNXqz5nF5xXr+7D3Y+W/3iKqooVQFUDAAGAKWiiug8gKKKKACiiigAooooA8n/AGmf+Sbr/wBf0X8nr5Rr6u/aZ/5Juv8A1/RfyevlGvawH8L5ng5j/G+QUUUV2nAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFfe3h3/kX9M/69Yv/AEAV8E197eHf+Rf0z/r1i/8AQBXm5jtE9XK95fI0KKKK8o9gKKKKACiiigAooooA/Pmiiivpz5IKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPqH9ln/kRdT/AOwk/wD6Kjr2WvGv2Wf+RF1P/sJP/wCio69lrwMV/FkfSYT+DEKKKK5zpCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiuP8Aix4rXwh4Lvb9GAvZB5FoPWVgcH8Blvwqoxc2orqTOShFyeyPn39obxb/AMJB4xOm2sm6w0rMIweGlP8ArG/AgL/wE+teV0rszuzOxZmOSSckmkr6KnBU4qK6HzFWo6k3N9QoooqzMKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAO3+Dviw+EfG1pdTSbdPuf9Gu8ngIxGG/4CcH6AjvX2eCCMjkV+fNfXXwB8W/8ACSeCo7S5k3ajpeLeXJ5aPH7tvyGPqpPevMzCjoqi+Z62W1tXSfyPTKKKK8s9cKKKKACiiigAooooAK+TP2gPGh8SeKm02zkzpemM0S4PEkvR398fdH0J717/APF/xQfCngW/vYX2Xsw+zWp7+Y2eR9AGb8K+LScnJ5Nell9G7dR/I8rMq9kqS+YUUUV6p44UUUUAFFFFABRRRQAUUUUAFFFFABRRVjTrK61K+hs7CCS4upm2RxRrlmPsKNhpXK9XNK0rUNXufs+lWNzeT/3IImcj64HFfRPw++BFhZwRXnjBjeXh+b7HG+Io/ZiOWP0IH1617Rp1hZ6barbadawWtuv3Y4Ywij8BXBVx8Y6QVz0aOXTkrzdj5J074LeN7xA76bFaqRkfaLhAfyBJH4itWH4AeLpPvXGkR/707/0Q19VUVyPH1X2OxZbRXc+WZP2ffFiLlb3RXPos8n9YxWRf/BTxvaAmPToboDvBcp/JiDX17RQsfVXYHl1F9z8/ru3ms7ua2uUMc8LtHIh6qwOCPzFRVqeK5hceKNYmU5WS8mcH6uTWXXsp3Vzw5KzsFFFFMkKKKKACiiigAooooAKKKKACiiigAooooA6j4W/8lH8N/wDX/D/6EK+3q+Ifhb/yUfw3/wBf8P8A6EK+3q8jMfjXoe1lnwS9Qooorzz0wooooAK81/aI/wCSV6l/11g/9GLXpVea/tEf8kr1L/rrB/6MWtaH8WPqjHE/wpejPkOiiivoj5gKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPuzwTj/hDNA2jC/2fb4/79rW1WJ4G/5Erw//ANg+3/8ARa1t181P4mfVw+FBRRRUlBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHh/jeD7P4q1FMY3SeZ/30A39aw69I8deGr7VvEsL2EOUkhAkkY4VSCRyfpjjrW14c8FWGlFZrkC7uxzucfKp9l/qf0rzXh5Sm7bH2MM2o0MNByd5WWi/rQ4zwv4Ju9U2XF9utbM8jI+dx7DsPc/rXqWmada6Xarb2MKxRD06k+pPc1bortp0Y09tz5zGZhVxb992XYKKKK1OEKranf2ul2E99qE8dvaQKXklkOAoqt4i1zTvDulTajrF0ltax9Wbqx7Ko6kn0FfJPxU+JOoeOb7yl32ujQtmC1zyx/vvjq3t0HbuT0YfDSrPyOXE4qNBefYt/Fv4oXvjO8eysWktdBjb5Ic4afHR5P5heg+vNebUUV7kIRpx5YngVKkqkuaT1CrGnX11pt7DeWFxLb3ULbo5Y22sp9jVeir3ITsfUfwl+Mdv4ieHSPEhjtdWbCxTj5Y7k+n+y59Oh7Y4Fex1+fNe8/Bz4yPatDonjC4L2xwlvqEhyY/RZD3X/a7d+OR5eJwVvfp/cevhMff3Kv3/wCZ9G0UiMrorIwZWGQQcgilrzD1QIBGDyK8+8X+BhKXvNEQK/V7YcA+6+n0/KvQaKipTjUVpHThcXUws+em/wDgnzrIjRuySKyOpwysMEH0NNr2fxZ4TttcQzRbYL8DiXHD+zf49a8j1PT7rS7t7a9iaKVfXoR6g9xXmVaMqb12Ps8DmNPGR00l1RUooorI7wooooAKKKKACiiigAooooAKKKKACitXRdA1HWXxZW7GPODK3yoPx/oOa9D0LwBY2e2XUnN5MOdnSMfh1P4/lWtOjOpscOKzGhhdJu77Lc850jRNQ1eTbYWzyKDgyHhF+pPFehaD8PrS12y6tJ9qlHPlrkRj+p/T6V20UaQxrHEipGowqqMAD2FOrtp4aMdXqfNYrOq9b3afury3+/8AyGQxRwxLHCixxqMKqjAA9hT6KK6Tx276sKKKhvLq3sraS4vJ4re3jGXllcIqj1JPAoAmorxvxr8d9F0rfb+HYW1a6HHmnKQKfr1b8AB714p4n+KXi3xCzi51WW1t2/5d7PMKY9OPmI+pNddLBVJ6vRHFVx9KnotX5H1j4g8Y+HvD2RrOsWdrIOfKZ90n/fAy36Vwmp/HvwhaMVtU1K+9GhgCqf8AvtlP6V8pMSzEsSSeST3orthl9NfE7nDPMqj+FJH158O/ixZeN9fk0uy0u7t3SBpzJI6kBQQOce7CvSq+eP2UtNJudf1Rl4VI7ZG9cksw/RPzr6Hrz8VCMKjjA9LCTnUpKU92FFFFc50nk/7TP/JN1/6/ov5PXyjX1d+0z/yTdf8Ar+i/k9fKNe1gP4XzPBzH+N8gooortOAKKKKACiiigAooooAKKKKACiiigAooooAK+9vDv/Iv6Z/16xf+gCvgmvvbw7/yL+mf9esX/oArzcx2ierle8vkaFFFFeUewFFFFABRRRQAUUUUAfnzRRRX058kFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH1D+yz/AMiLqf8A2En/APRUdey141+yz/yIup/9hJ//AEVHXsteBiv4sj6TCfwYhRRRXOdIUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV8mftDeLf+Eg8ZNp1rJusNKzCMHhpf8Alo34EBf+An1r6C+LPitfCHgq8vo3AvZR9ntB/wBNWBwf+AjLfhXxWzM7FnJZickk5JNell9G7dRnlZlWslSXzEooor1TxwooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACu2+D3iw+EPG1pdTPt0+4/0a7B6BGI+b/gJwfoCO9cTRUzipxcX1LhNwkpLofoMCCAQcg0V5l8APFv8AwkngqO0uZN2oaXi3kyeWjx+7b8gR9VPrXptfO1IOnJxfQ+np1FUiprqFFFFQWFFFFABRRRQB8zftRa8brxJp+iRN+6sYfOkAP/LSToD9FA/76NeJV0PxE1U63451zUC25ZbpxGf9hTtT/wAdArnq+ioQ5KaifMYip7SpKQUUUVqYhRRRQAUUUUAFFFFABRRRQAUUUUAFfU/7PfgSHQ/D8Wv38QbVdQjDxlh/qYTyoHuwwSfQgeufmrw1p41bxHpWnMSBd3UVuSOwZwv9a+8oo0iiSOJQkaAKqgYAA6CvOzCq4xUF1PTy2kpSc30HUUUV5J7QUUUUAFVdXvU03Sr2+lx5dtA8zZ9FUk/yq1XnH7QGuLo3w2volbE+oMtnGM9m5f8ADaGH4irpw55qPcirPkg5dj5BkdpHZ3OWYkk+ppKKK+kPlQooooAKKKKACiiigAooooAKKKKACiiigAooooA6j4W/8lH8N/8AX/D/AOhCvt6viH4W/wDJR/Df/X/D/wChCvt6vIzH416HtZZ8EvUKKKK889MKKKKACvNf2iP+SV6l/wBdYP8A0YtelV5r+0R/ySvUv+usH/oxa1ofxY+qMcT/AApejPkOiiivoj5gKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPuvwN/yJXh//sH2/wD6LWtusTwN/wAiV4f/AOwfb/8Aota26+an8TPq4fCgoooqSgooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKbI6xxs8jKiKCzMxwAB3JoAdXH/ABD+IGj+CLDffyeffyLmCyjYb39z/dX3P4ZPFed/E34429j5uneDWS5uuVe/I3RJ/wBcx/Gfc/L9a+ddQvbrUbyW7v7iW4upW3PLKxZmPuTXoYfBOfvVNEebicfGHu09Wbnjnxnq/jPVDeavP8i5ENunEcI9FHr6k8muboor1oxUVZHjSk5O8twooopkhRRRQAUUUUAeu/B34tT+GHi0jX3kuNDJ2xycs9r9PVPbt29D9SWdzBe2sVzaTRz28qh45I2DKynoQR1r8/q9I+EnxPvPBV2tnemS60GVsyQ9WhJ6vH/Veh9jzXn4rB8/vw3PSwmNcPcqbfkfX1FVNJ1Kz1fToL/TLiO5tJ13RyxnII/ofY8irdeQ1bRntp31QVm67otnrVp5F7Hkj7ki8Mh9Qa0qKTSasyoTlTkpQdmjw7xN4cvNBuMTDzLZj+7nUfKfY+h9qxK+iLiCK5geG4jWSJxhkYZBFeW+L/BMun77vSlaaz6tH1aP/Efr/OvPrYZx96Ox9Zl2cRrWp19Jd+j/AMmcTRRRXKe6FFFFABRRS0AJRXS6J4N1XVAshi+ywH/lpNkEj2Xqf5V3ui+B9K07a9wpvZx/FKPlH0Xp+ea2hh5zPNxOa4fD6N3fZHmuieHNS1lgbS3Ih7zSfKg/Hv8AhmvQ9C8BafY7ZL8m9nHOGGIx+Hf8fyrsFAVQqgAAYAHalrtp4aENXqz5zFZzXr6R91eW/wB42NFjRUjVURRgKowAKdRRXQeSFFFFABRWJ4s8VaP4U043mt3iQIc7I+skp9FXqf5Dvivmf4ifGXWvExls9JL6VpTZXbG376Uf7bjoP9kfiTXRRw0622xzV8VChvv2PZPiP8YdG8KNJZaeF1TVl4MUb4jiP+2/r/sjn1xXzZ4z8a654xvPO1q8Z4lOY7aP5Yo/91fX3OT71zdFevRw0KW2/c8Wvi6lbfRdgoooroOUKKKsabZzajqNrZWq7p7mVYYx6sxAH6mjYa1PrP8AZ50g6X8M7OV12y38r3TeuCdq/wDjqA/jXpdVNIsItL0qzsLf/U2sKQJ/uqoA/lVuvm6k+ebl3PqKUPZwUewUUUVBoeT/ALTP/JN1/wCv6L+T18o19XftM/8AJN1/6/ov5PXyjXtYD+F8zwcx/jfIKKKK7TgCiiigAooooAKKKKACiiigAooooAKKKKACvvbw7/yL+mf9esX/AKAK+Ca+9vDv/Iv6Z/16xf8AoArzcx2ierle8vkaFFFFeUewFFFFABRRRQAUUUUAfnzRRRX058kFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH1D+yz/yIup/9hJ//RUdey141+yz/wAiLqf/AGEn/wDRUdey14GK/iyPpMJ/BiFFFFc50hRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFcb8WvFg8H+Cry+icC+l/0e0H/AE0YHn/gIy34Y71UIuclFdSZzUIuT2R8/ftC+Lf+Eg8Ztp9rJusNKzAuDw0v/LRvzAX/AID715ZSsxZizElickk5JNJX0VOCpxUV0PmKtR1Jub6hRRRVmYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB23wf8AFh8IeNrS7mfbYXH+jXY7CNiPm/4CcH6AjvX2gCCAQcg9CK/Pmvrj9n/xb/wkfgqOzuZN2oaXi3kyeWjx+7b8gV+qn1rzMwo6KovmetltazdJ/I9Ooooryz1wooooAKzvEl7/AGb4d1S+BwbW1lnz6bUJ/pWjXJfFqZofhp4jZeps3T8G+U/zqoK8kiKj5YtnxNRRRX0p8qFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAbvgO4W08ceHriQgRxahbuxPYCRc/pX3TX58qSrAqSCOQR2r7X+Fvi+Dxl4Stb1ZFN9EoivI88pKBycejdR9fY15mYwekz1ssqJc0GdfRRRXlnrhRRRQAV8l/tB+L08SeLxYWUm/T9LDQqQeHlJ+dh7cBf+Ak969K+NvxXg0m0uNB8N3Cy6pIDHcXEZyLYdCAf7/bj7v1r5jr1MDh2v3kvkeRmGJT/dR+YUUUV6Z5IUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAdR8Lf+Sj+G/+v+H/ANCFfb1fEPwt/wCSj+G/+v8Ah/8AQhX29XkZj8a9D2ss+CXqFFFFeeemFFFFABXmv7RH/JK9S/66wf8Aoxa9KrzX9oj/AJJXqX/XWD/0Yta0P4sfVGOJ/hS9GfIdFFFfRHzAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAfdfgb/kSvD/AP2D7f8A9FrW3WJ4G/5Erw//ANg+3/8ARa1t181P4mfVw+FBRRRUlBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRXm3x8vde0zwK974evJLURSqt20Qw/lNxkN1XDFemDz1q6cOeSj3IqT9nFy7Gt48+I/h/wZEyX9z59/jK2VuQ0h9N3ZR7n8M18z/EP4n6740d4ZpPsWl5+WygY7T/AL7dXP149AK4aR3lkaSRmd2OWZjkk+pNNr2qOEhS13Z4NfG1K2myCiiiuo4wooooAKKKKACiiigAooooAKKKKAO3+GHxD1HwNqWYi1zpUzf6RZluD/tL6N/Poe2Prvwzr+neJdIh1LR7hZ7aQfRkburDsR6V8G10/gDxrqvgnVxeaY++B8C4tXPyTL7+hHY9R9Mg8WJwiq+9Hc78JjHR92Xw/kfb9Fc94H8XaX4y0ZdQ0mXkYWaB/wDWQt/dYfyPQ10NeNKLi7M92MlJXWwUUUUhnE+LfBEWoF7vStkN0eWi6JIfb0P6fzrzTUNNvNPkKXttLCw/vrwfoehr6BoIyMHkVzVMNGbutD2cJnVbDx5JrmX4/efOqI0jBY1ZmPYDJrXsPDOs3zAQ6fOAf4pF2D82xXuSIqDCKFHsMUtZrBrqzpqcQza9yCXq7/5HmulfDiRiG1W8VF/55wDJ/wC+j0/I12uk+HtL0oA2dpGsg/5aMNz/AJnp+FatFdEKMIbI8rEZhiMRpOWnZaIKKKK1OIKKKKACiivNPHnxi8PeGBJb2Ug1bUhx5Nu42If9uTkD6DJ9hVwpyqO0VcipUjTV5ux6Pczw2sEk9zLHDDGpZ5JGCqoHck8AV4t8Q/jrYackln4RVb+85U3bgiGP/dHVz+Q+teKeOfiFr/jOUjVLrZZhtyWcHyxL6ZHVj7nNcjXp0cAo61NTya+YuXu0tPMv63rGoa7qMl/q93Ld3cn3pJDk49AOgHsOBVCiivQStojzG23dhRRRTEFFFFABXqX7Onh86x8QI76RM22lxm4YnpvPyoPrklv+A15bX1x+z34aOg+AobudNt3qjfanyORHjEY/L5v+BVy4yp7Ok+70OzBUvaVV2Wp6dRRRXhH0IUUUUAeT/tM/8k3X/r+i/k9fKNfV37TP/JN1/wCv6L+T18o17WA/hfM8HMf43yCiiiu04AooooAKKKKACiiigAooooAKKKKACiiigAr728O/8i/pn/XrF/6AK+Ca+9vDv/Iv6Z/16xf+gCvNzHaJ6uV7y+RoUUUV5R7AUUUUAFFFFABRRRQB+fNFFFfTnyQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAfUP7LP8AyIup/wDYSf8A9FR17LXjX7LP/Ii6n/2En/8ARUdey14GK/iyPpMJ/BiFFFFc50hRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFfJX7Qfi3/hIfGbWFrJu0/SswJg8NL/AMtG/MBf+A+9fQXxb8Vjwh4KvL2Jwt9MPs9oO/mMD83/AAEZb8Pevi1mLMWYksTkk969LL6N26jPKzKtZKkvmJRRRXqnjhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV2vwg8WHwh42tLuZythP/AKPdjsI2I+b/AICcH6AjvXFUVM4qcXF9S4TcJKS3R+gwIIBByD0IorzD9n7xb/wkfgtLK6k3ahpe23kyeWjx+7b8gV+q+9en187Ug6cnF9D6enUVSCmuoUUUVBYVx/xfXd8MvEQ/6dWP6iuwrmPihD5/w68SoO2nzP8A98oT/SrpaTXqZ1dYS9GfEFFFFfSHywUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAVt+EPFGq+EtXTUdFuDFKOHQ8pKv91h3H6jtisSik0pKzKjJxd0fTfhz9oLRLqNE16wurCfozwgTRfXsw+mD9a6kfGbwGQCddI9jZz/APxFfHdFccsBSb0ujtjmNZKzsz6t1j48+EbOM/YBfajJ/CIofLX8S+CB+BryLxz8aPEPiSKS0sNukWDghkt3JlcejScHH0A9815fRV08JSpu6V/Uzq42rUVm7LyCiiiuo5AooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAOo+Fv8AyUfw3/1/w/8AoQr7er4h+Fv/ACUfw3/1/wAP/oQr7eryMx+Neh7WWfBL1CiiivPPTCiiigArzX9oj/klepf9dYP/AEYtelV5r+0R/wAkr1L/AK6wf+jFrWh/Fj6oxxP8KXoz5Dooor6I+YCiiigAooooAKKKKACiiigAooooAKKKKACiiigD7r8Df8iV4f8A+wfb/wDota26xPA3/IleH/8AsH2//ota26+an8TPq4fCgoooqSgooooAKKKKACiiigAooooAKKKKACiiigAqpq+n2+raVd6fepvtrqJoZF/2WGDj3q3RQnbUGr6M+DPE+jXHh7xBf6TeD9/aSmMnGNw/hYexGCPrWZX0b+034P8APs7fxTZR/vIMW94FHVCfkc/Qnaf94elfOVfQ0KvtYKR8ziKLo1HEKKKK2MAooooAKKKKACiiigAooooAKKKKACiiigDW8L+ItT8MatFqOjXLQXCcEdVkXurDuD/nmvqv4afFXR/GUcVrOy2GtYw1rI3yyH1jbv8ATqPfGa+PqVGZGDISrKcgg4INc9fDRrLXc6sPip0Hpqux+gtFfKngT44a5oMaWuuIdYslGFaR9s6D/f53f8C5969p8O/GDwdrUabtTGnznrFfL5eP+Bfc/WvJqYSpT6XR7NLGUqnWz8z0KioLK9tb+ETWNzBcxHo8MgdfzFT1zHVuFFFFABRSOyopZ2CqOSScAVz2reOPC+k5Goa9p0TjqgnV3/75XJ/SmouWyJlJR1bOiorybWfjz4SslYWAvtRk/h8qHy1P1L4I/I15v4i+P/iG93JotnaaZGejsPPkH4nC/wDjtdEMJVn0t6nNPG0Ydb+h9OXdzBZ27z3c8UECDLySuFVR6kngV5T4x+Onh3R98Oiq+sXY4zGdkIPu5HP/AAEEe9fNOv8AiLWPEE/na1qV1euDlRLISq/7q9B+ArKrtpZfFazdzhq5lJ6U1Y7bxp8TvE3izfFe3ptrFuPslrmOMj0bnLfiSK4miiu+MIwVoqx505ym7ydwoooqiAooooAKKKKACiiigDpvht4Zfxd4x0/SgG+zs/mXDD+GJeW+meg9yK+3oo0ijSONQiIAqqowAB0AryL9nHwcdE8Mtrl7HtvtUAMYYcpAPu/99H5vptr1+vExtb2lSy2R7+Ao+zp8z3YUUUVxncFFFFAHk/7TP/JN1/6/ov5PXyjX1d+0z/yTdf8Ar+i/k9fKNe1gP4XzPBzH+N8gooortOAKKKKACiiigAooooAKKKKACiiigAooooAK+9vDv/Iv6Z/16xf+gCvgmvvbw7/yL+mf9esX/oArzcx2ierle8vkaFFFFeUewFFFFABRRRQAUUUUAfnzRRRX058kFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH1D+yz/AMiLqf8A2En/APRUdey141+yz/yIup/9hJ//AEVHXsteBiv4sj6TCfwYhRRRXOdIUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFcX8XfFg8IeCry8icLfTf6PaDv5jA/N/wEZb8B61UIuclFdSZzUIuT2R8+/tBeLf+Ei8aPY2sm7T9K3QJg8NLn9435gL/AMB968voYlmJYkk8knvRX0VOCpxUV0PmKtR1Jub6hRRRVmYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHafCHxYfCHjazvJXK2E/wDo92O3lsR83/AThvwI719pAhgCCCDyCK/Pmvrf9n7xb/wkfgtLK6k3ahpW23fJ5aPH7tvyBX/gPvXmZhRulUXzPWy2tZuk/ken0UUV5Z64VQ1+0+36FqVnjP2i2khx67lI/rV+imnZ3E1dWPz5orb8cacdI8Y61YbdqwXkqL/u7jtP5YrEr6VO6uj5WS5W0wooopkhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAdR8Lf+Sj+G/wDr/h/9CFfb1fEPwt/5KP4b/wCv+H/0IV9vV5GY/GvQ9rLPgl6hRRRXnnphRRRQAV5r+0R/ySvUv+usH/oxa9KrzX9oj/klepf9dYP/AEYta0P4sfVGOJ/hS9GfIdFFFfRHzAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAfdfgb/kSvD/8A2D7f/wBFrW3WJ4G/5Erw/wD9g+3/APRa1t181P4mfVw+FBRRRUlBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQBW1Oxt9T065sb2MS21zG0UiHupGDXxH4+8L3Pg/xRd6TdZZYzvglIx5sR+639D7givuWvOPjf4FHjDw0Z7GMHWbAGS3wOZV/ij/HqPce5rrwdf2U7PZnFjcP7aF47o+QKKVlKsVYEMDgg9qSvcPnwooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAJbW5ntJRLazywSjo8blSPxFb1v468V267YvEmrhfQ3btj8zXOUVLinuilKUdmdT/wsLxf/wBDJqv/AIEt/jVafxr4pnBEviTWWB7fbZMflmufopezj2K9pN9WWrzUb2+Ob28ubg/9NpWf+ZqrRRV2sQ3cKKKKBBRRRQAUUUUAFFFFABRRRQAUUUUAFdx8IPBr+M/F0NvMjf2bbYnvG/2AeEz6sePpk9q4y1t5ru5it7aN5Z5XEccaDJZicAAeua+z/hT4Ni8FeFILJgrahNia8kHO6Qj7oPovQfie9cuLr+yhpuzsweH9tPXZHYxosaKkaqqKAFVRgADsKWiivCPoQooooAKKKKAPJ/2mf+Sbr/1/RfyevlGvq79pn/km6/8AX9F/J6+Ua9rAfwvmeDmP8b5BRRRXacAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV97eHf+Rf0z/r1i/9AFfBNfe3h3/kX9M/69Yv/QBXm5jtE9XK95fI0KKKK8o9gKKKKACiiigAooooA/Pmiiivpz5IKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPqH9ln/AJEXU/8AsJP/AOio69lrxr9ln/kRdT/7CT/+io69lrwMV/FkfSYT+DEKKKK5zpCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAr5J/aB8W/wDCR+NHsbaTdp+lbrdMHhpM/vG/MBf+A+9fQXxe8WDwh4JvLyJwt/P/AKPaDv5jA/N/wEZb8AO9fFpJYkkkk8kmvSy+jduo/keVmVayVJfMKKKK9U8cKKKKACiiigAooooAKKKKACiiigAooooAKKKt6Tp9xq2qWmn2Sb7m6lWGNfVmOB+FJuw0r6I90/Zm8HQ3MN/4i1O2jmjP+i2qyoGB6F3wfwAP+9Xu/wDYmk/9Ayx/8B0/wqPwvotv4d8PWGk2Y/c2kQjBxjcerMfckk/jWpXz9es6k3I+lw9FUqaiZ/8AYmk/9Ayx/wDAdP8ACj+xNJ/6Blj/AOA6f4VoUVlzPubcq7Gf/Ymk/wDQMsf/AAHT/Cj+xNJ/6Blj/wCA6f4VoUUcz7hyrsZ/9iaT/wBAyx/8B0/wo/sTSf8AoGWP/gOn+FaFFHM+4cq7Gf8A2JpP/QMsf/AdP8KP7E0n/oGWP/gOn+FaFFHM+4cq7Gf/AGJpP/QMsf8AwHT/AAo/sTSf+gZY/wDgOn+FaFFHM+4cq7Gf/Ymk/wDQMsf/AAHT/Cj+xNJ/6Blj/wCA6f4VoUUcz7hyrsZ/9iaT/wBAyx/8B0/wo/sTSf8AoGWP/gOn+FaFFHM+4cq7Gf8A2JpP/QMsf/AdP8KP7E0n/oGWP/gOn+FaFFHM+4cq7HgH7S3gyCPTbLxFpdrFCLci2uliQKNrH5HIHoxIz/tD0r54r7413S7bWtGvdMvl3W11E0TjuAR1HuOo9xXwx4i0i50HXb7Sr0YuLSVom44bHRh7EYI9jXr4CtzR5HujxMxo8k+dbMzqKKK7zzgooooAKKKKACiiigAooooAKKKKACiiigArtPhF4sPhDxrZ3krlbGf/AEe7Hby2I+b/AICcN+B9a4uipnFTi4vqXCbhJSW6P0GUhlBUgg8gjvRXl/7Pvi3/AISLwWljdSbtQ0rED5PLR4/dt+QK/wDAfevUK+dqQdOTi+h9PSqKpBTXUKKKKgs+Uf2ldGOnfEH7ei4i1K3SXPbeo2MPyVT+NeT19X/tIeHTq/gQahCm650qTzuBz5TfK4/9Bb/gNfKFe7g6nPSXlofPY6nyVn56hRRRXUcYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHUfC3/AJKP4b/6/wCH/wBCFfb1fEPwt/5KP4b/AOv+H/0IV9vV5GY/GvQ9rLPgl6hRRRXnnphRRRQAV5r+0R/ySvUv+usH/oxa9KrzX9oj/klepf8AXWD/ANGLWtD+LH1Rjif4UvRnyHRRRX0R8wFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH3X4G/wCRK8P/APYPt/8A0WtbdYngb/kSvD//AGD7f/0WtbdfNT+Jn1cPhQUUUVJQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHzV+0R8PTp15J4p0iL/Qrh/wDTY1H+qkP/AC0+jHr/ALX148Or9Aby2gvbWa2u4kmt5kKSRuMqykYIIr5A+MHw8n8Eaz5lsry6JdMTbSnnYevlsfUdj3H449fBYnmXs5bni4/C8j9pDbqee0UUV6B5gUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUV658CvhqfE98mtazERols/wAkbD/j6kHb/cB6+vT1xnUqRpx5pGlKlKrJRidl+zv8OjZxR+KtahxcSr/oETjlEPWUj1I4Hsc9xj3igAKAAAAOABRXgVarqy5mfSUaMaMFCIUUUVmahRRRQAUUUUAeT/tM/wDJN1/6/ov5PXyjX1d+0z/yTdf+v6L+T18o17WA/hfM8HMf43yCiiiu04AooooAKKKKACiiigAooooAKKKKACiiigAr728O/wDIv6Z/16xf+gCvgmvvbw7/AMi/pn/XrF/6AK83Mdonq5XvL5GhRRRXlHsBRRRQAUUUUAFFFFAH580UUV9OfJBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB9Q/ss/8AIi6n/wBhJ/8A0VHXsteNfss/8iLqf/YSf/0VHXsteBiv4sj6TCfwYhRRRXOdIUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUVxXxf8WDwh4Ju7uFwt/P/AKPaDuJGB+b/AICMt9QB3qoRc5KK6kzmoRcnsj59/aB8W/8ACR+NHsrWTdp+l7rePB4aTP7xvzAX6L715hQSSSSck9SaK+ipwVOKiuh8xUqOpNzfUKKKKszCiiigAooooAKKKKACiiigAooooAKKKKACvcf2YvCv2zWbvxJdR5gsgYLckdZWHzEf7qnH/A68StYJbq5it7eNpJ5XEcaL1ZicAD8a+4vAPhyLwp4S07SItpeCPMzj+OQ8ufzJx7Yrix1Xkp8q3Z35fR56nM9kdBRRRXinvBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFfPH7UHhTZLZeJ7SPh8Wt3gd/wCBz+GVz7LX0PWV4q0S38R+Hb/SLwfubuIx7sZ2N1Vh7ggH8K2oVfZTUjDEUvbU3E+DqKtatp9xpWp3en3qeXc20rQyL6MpwfwqrX0Cdz5pq2jCiiimIKKKKACiiigAooooAKKKKACiiigAooooA7P4R+Kz4Q8a2d7K5WxmP2e7Hby2I+b/AICcN+HvX2kpDKGUgqRkEd6/PqvrX9nzxb/wkXgxLC6k3ahpWIHyeWix+7b8gV/4D715uYUbpVF8z1ctrWbpP5HqNFFFeUewQ3ltDe2c9rdRiS3njaKRD0ZWGCD+Br4e8eeG5/Cfiu/0ifcVhfMLn/lpGeUb8uvvkV9z15H+0N4IPiHw8us6fEW1PTVJZVGTLB1YfVfvD/gXrXZgq3s58r2Zw4+h7WnzLdHyrRRRXtngBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABWroWg3mtQ6lNaeWsOn2r3c8khIUKvYYB+Yk4ArKr6Dm8Jt4M/Z31qW5TZqupLBLcAjBRWlQLH+Ck59yaxrVeSy6t2N6NL2l30SufPlFFFbGAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB1Hwt/5KP4b/AOv+H/0IV9vV8Q/C3/ko/hv/AK/4f/QhX29XkZj8a9D2ss+CXqFFFFeeemFFFFABXmv7RH/JK9S/66wf+jFr0qvNf2iP+SV6l/11g/8ARi1rQ/ix9UY4n+FL0Z8h0UUV9EfMBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB91+Bv+RK8P/wDYPt//AEWtbdYngb/kSvD/AP2D7f8A9FrW3XzU/iZ9XD4UFFFFSUFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAVneIdFsfEGj3OmarAJrS4XaynqPQg9iDyDWjRTTad0JpNWZ8U/EvwJqHgbWjb3IaawmJNrdAcSL6H0Ydx+PSuPr7z8S6Dp/iTR59M1e3We1lHI6FT2ZT2I9a+Rfid8OdT8DX+ZA1zpMrYgvFHH+6/8Adb9D27gezhcUqq5Zb/meFi8G6T5ofD+Rw1FFFdpwBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUV6Z8JfhZfeM7hL7UBJaaCjfNLjDT4PKx/wAi3Qe5qJ1I0480jSnTlUlyxWpB8IPhtc+NtTFxdq8GhW7fv5uhlP8AzzT39T2Hvivrqws7fT7KC0soUgtoUCRxoMKqjoBTNL0+00rT4LHTreO3tIFCRxIMBR/nv3q1Xh4jEOtK/Q+gw2GjQjbqFFFFc50hRRRQAUUUUAFFFFAHk/7TP/JN1/6/ov5PXyjX1d+0z/yTdf8Ar+i/k9fKNe1gP4XzPBzH+N8gooortOAKKKKACiiigAooooAKKKKACiiigAooooAK+9vDv/Iv6Z/16xf+gCvgmvvbw7/yL+mf9esX/oArzcx2ierle8vkaFFFFeUewFFFFABRRRQAUUUUAfnzRRRX058kFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH1D+yz/AMiLqf8A2En/APRUdey141+yz/yIup/9hJ//AEVHXsteBiv4sj6TCfwYhRRRXOdIUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV8j/ALQHi3/hI/GslnbSbtP0vNvHg8NJn9435gL9FHrX0F8YPFg8IeCbu7hfbf3H+jWg7iRgfm/4CMn6gDvXxeSSSSck9Sa9PL6OrqP5HlZlWslSXzCiiivUPHCiiigAooooAKKKKACiiigAooooAKKKKACiigAsQFBJPAAoA9e/Zu8K/wBseLn1i5TNnpQDJkcNM2Qv5DLexC19UVyHwo8Ljwj4IsNPdAt44+0XR7mVgMj8Bhf+A119eBiqvtajfQ+kwlH2VJJ7hRRRXOdIUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB81/tO+FPsmr2niS1jxDeAQXJA6SqPlJ+qjH/AAD3rw2vunxz4eh8VeFNR0ifaDcRny3I+5IOUb8CB+Ga+HLy2msrye1uozHcQSNFIjdVZTgg/iK9rA1eeHK90eDmFHkqcy2ZDRRRXacAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV2Xwk8WHwf41s76VyLGb/R7sf9M2I+b/AICcN+GO9cbRUzipxcX1LhNwkpLdH6CqwZQykFSMgjoRS15b+z14t/4SHwYun3Um6/0rEDZPLRf8s2/IFf8AgPvXqVfO1IOnJxfQ+mpVFUgprqFFFFQaHyt8ePhu3hrUX1vR4SdFunzIiji2kJ6eyk9PQ8emfIq+/wC+tLe/s5rS9hSe2mQpJG4yrKeoIr5Q+MHwtuvB1y+o6WslxoEjcN1a2J/hf29G/A89fXwmK51yT3PFxuD5H7SG35Hl9FFFegeYFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRXovwj+Gt5421Fbm7WS30GFv30/Qykf8ALNPU+p7fXAMTnGnHmlsXTpyqS5Y7m9+z/wDDx9d1WPxDqsP/ABKbN8wK44uJR047qp5PqQBzzXsfx7iMvwn10KMlRC35TIT+ma7jT7K206xgs7GFILWBBHHGgwFUdBWD8TrT7b8PPEcAGT9hlcD1KqWH6ivFlXdWspva570cOqVCUFu0z4fooor3T54KKKKACiiigAooooAKKKKACiiigAooooA6j4W/8lH8N/8AX/D/AOhCvt6viH4W/wDJR/Df/X/D/wChCvt6vIzH416HtZZ8EvUKKKK889MKKKKACvNf2iP+SV6l/wBdYP8A0YtelV5r+0R/ySvUv+usH/oxa1ofxY+qMcT/AApejPkOiiivoj5gKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPuvwN/yJXh//sH2/wD6LWtusTwN/wAiV4f/AOwfb/8Aota26+an8TPq4fCgoooqSgooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAqtqVha6nYzWWoW8dzazLtkikXKsKs0UbA1fc+Vvix8Hrzw002qeH1kvNF5Z4/vS2w9/wC8v+11Hf1PkVfoNXi3xR+CdrrLS6l4UEVlqBy0lqflhmPqv9xv0Ptya9TD477NX7zyMVl/2qX3f5HzFRV3WdJv9F1CWx1a0mtLuP70cq4P1HqPccGqVeknfVHlNNaMKKKKYgooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKBycDrWn4d0DVPEepJY6LZy3Vy3ZBwo9WPRR7mvp34X/B7TvCpi1HWTHqOsr8ynGYoD/sA9T/ALR/ACsK2IhRWu/Y6aGGnXem3c4H4S/BebUTDq/jCF4LLhobFsq8vu/dV9up9h1+kYIYreCOG3jSKGNQqIihVUDoAB0FPorxa1aVZ3ke9QoQoxtEKKKKxNgooooAKKKKACiiigAooooA8n/aZ/5Juv8A1/RfyevlGvq79pn/AJJuv/X9F/J6+Ua9rAfwvmeDmP8AG+QUUUV2nAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFfe3h3/kX9M/69Yv8A0AV8E197eHf+Rf0z/r1i/wDQBXm5jtE9XK95fI0KKKK8o9gKKKKACiiigAooooA/Pmiiivpz5IKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPqH9ln/kRdT/7CT/+io69lrxr9ln/AJEXU/8AsJP/AOio69lrwMV/FkfSYT+DEKKKK5zpCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKyPFw1VvDd+nh5EbVZIiluXfYEY8bs+wJI9wKaV3YTdlc+Xfj/4t/4STxrJaW0m7T9Lzbx4PDSZ/eN+YA+ij1rzKvUj8C/GhJJhsST/ANPIo/4UX40/54WP/gSP8K92nVo04qKktD56pRr1Jubi9Ty2ivUv+FF+NP8AnhY/+BI/wo/4UX40/wCeFj/4Ej/Cr+sUv5kZ/Vq38rPLaK9S/wCFF+NP+eFj/wCBI/wo/wCFF+NP+eFj/wCBI/wo+sUv5kH1at/Kzy2ivUv+FF+NP+eFj/4Ej/Cj/hRfjT/nhY/+BI/wo+sUv5kH1at/Kzy2ivUv+FF+NP8AnhY/+BI/wo/4UX40/wCeFj/4Ej/Cj6xS/mQfVq38rPLaK9S/4UX40/54WP8A4Ej/AAo/4UX40/54WP8A4Ej/AAo+sUv5kH1at/Kzy2ivUv8AhRfjT/nhY/8AgSP8KP8AhRfjT/nhY/8AgSP8KPrFL+ZB9Wrfys8tor1L/hRfjT/nhY/+BI/wo/4UX40/54WP/gSP8KPrFL+ZB9Wrfys8tr0v4AeFf+Ej8cw3NxHusNLxcy5HBfP7tf8AvoZ+imp/+FF+NP8AnhY/+BI/wr3r4O+DG8FeEltLsRnUriQzXTIcjPRVB9AAPxJrnxOKgqbUHds6cLhJuonNWSO6ooorxj3QooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK+Xv2lvCn9l+JodetY8WupjEuBws6jn/vpcH6hq+oa5n4k+GE8X+D7/AEo7RcMvmWzt/BKvKn2B6H2JrfDVfZVE+hz4qj7am49eh8P0V6l/wovxp/zwsf8AwJH+FH/Ci/Gn/PCx/wDAkf4V7X1il/Mjwfq1b+VnltFepf8ACi/Gn/PCx/8AAkf4Uf8ACi/Gn/PCx/8AAkf4UfWKX8yD6tW/lZ5bRXqX/Ci/Gn/PCx/8CR/hR/wovxp/zwsf/Akf4UfWKX8yD6tW/lZ5bRXqX/Ci/Gn/ADwsf/Akf4Uf8KL8af8APCx/8CR/hR9YpfzIPq1b+VnltFepf8KL8af88LH/AMCR/hR/wovxp/zwsf8AwJH+FH1il/Mg+rVv5WeW0V6l/wAKL8af88LH/wACR/hR/wAKL8af88LH/wACR/hR9YpfzIPq1b+VnltFepf8KL8af88LH/wJH+FH/Ci/Gn/PCx/8CR/hR9YpfzIPq1b+VnltFepf8KL8af8APCx/8CR/hR/wovxp/wA8LH/wJH+FH1il/Mg+rVv5Wc98JvFZ8IeNbO+kciylP2e7H/TJiMn/AICcN+FfaisHUMpDKRkEHIIr5M/4UX40/wCeFj/4Ej/Cvon4YWWuaZ4Os9O8TJGL2z/co8cgcPEPuEn1A+X/AIDnvXnY5052nB6np5eqkLwmmkdXRRRXnnphTJ4YriCSG4jSWGRSro6hlYHqCD1FPooA+evih8DmDS6n4KTIOWk05m6epiJ/9BP4HoK8Cubea1uJILqKSGeNirxyKVZSOoIPQ1+gVcr428BaB4xgK6vZgXIGEu4cJMn/AALuPY5FehQxzj7tTVHm4jL1P3qejPiOivV/GvwQ8RaIzz6MBrNkOR5IxMo907/8BJ+gry26tp7Od4LuGWCZDho5UKsp9wea9OFWFRXi7nkVKU6btNWIqKKK0MwooooAKKKKACiiigAooooAKByeK7zwd8KfFPicpJFYmxsm/wCXm8zGpHqq43N+Ax7ivoT4f/CPQPCRiupU/tLVVwftM6/Kh/2E6L9Tk+9c1bF06XW7Oujg6lXW1keS/Cr4L3mtSRal4qilstLGGS2Pyy3H17ov6ntjrX0zY2dvp9nDaWUEcFtCoSOKNdqqB2AqeivHrV5VneR7dDDwoK0QqDULZbywubV/uzRNGfoQR/Wp6KxN9z8+nUo7KwwynBHoaSvYNd+CHiy41zUZrKGyNrJcSPETcAEoWJXjtxiqP/Ci/Gn/ADwsf/Akf4V9AsTSa+JHzTwtVP4WeW0V6l/wovxp/wA8LH/wJH+FH/Ci/Gn/ADwsf/Akf4U/rFL+ZC+rVv5WeW0V6l/wovxp/wA8LH/wJH+FH/Ci/Gn/ADwsf/Akf4UfWKX8yD6tW/lZ5bRXqX/Ci/Gn/PCx/wDAkf4Uf8KL8af88LH/AMCR/hR9YpfzIPq1b+VnltFepf8ACi/Gn/PCx/8AAkf4Uf8ACi/Gn/PCx/8AAkf4UfWKX8yD6tW/lZ5bRXqX/Ci/Gn/PCx/8CR/hR/wovxp/zwsf/Akf4UfWKX8yD6tW/lZ5bRXqX/Ci/Gn/ADwsf/Akf4Uf8KL8af8APCx/8CR/hR9YpfzIPq1b+VnK/C3/AJKP4b/6/wCH/wBCFfb1fM/gf4O+LNH8Y6NqN7DZi2tbqOaQrcAnaGBOBX0xXmY6cZyTi7nrZfTlTg1JW1CiiiuE9AKKKKACvNf2iP8Aklepf9dYP/Ri16VXH/Fnw5e+K/BF5pOlmEXUrxspmYquFcE8gHsK1otKpFvuZV05U5Jdj4por1r/AIUH4v8A+eulf+BDf/EUf8KD8X/89dK/8CG/+Ir2/rNL+ZHz/wBVrfys8lor1r/hQfi//nrpX/gQ3/xFH/Cg/F//AD10r/wIb/4ij6zS/mQfVa38rPJaK9a/4UH4v/566V/4EN/8RR/woPxf/wA9dK/8CG/+Io+s0v5kH1Wt/KzyWivWv+FB+L/+eulf+BDf/EUf8KD8X/8APXSv/Ahv/iKPrNL+ZB9Vrfys8lor1r/hQfi//nrpX/gQ3/xFH/Cg/F//AD10r/wIb/4ij6zS/mQfVa38rPJaK9a/4UH4v/566V/4EN/8RR/woPxf/wA9dK/8CG/+Io+s0v5kH1Wt/KzyWivWv+FB+L/+eulf+BDf/EUf8KD8X/8APXSv/Ahv/iKPrNL+ZB9Vrfys8lor1r/hQfi//nrpX/gQ3/xFH/Cg/F//AD10r/wIb/4ij6zS/mQfVa38rPpHwN/yJXh//sH2/wD6LWtus7w1ZS6b4c0qxuNpmtrSKF9pyNyoAce2RWjXgy1kz6OCtFIKKKKkoKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDC8W+E9G8Waf9k1uzSdRny5RxJEfVW6j+R7g184+PvgjregmS60Hfq+njnai/v4x7oPvfVfyFfVdFb0cTOjtsc9fC063xLXufn06sjsjqVdTgqRgg+lJX2v41+HXhzxgjPqdkI70jAvLfCSj6no3/AAIGvA/F/wAC/EekNJNorR6xaDkCP5JgPdDwf+Akn2r1KWNp1NHozx62BqU9VqjySipry0ubG5e3vbea3uEOGimQoy/UHkVDXYcYUUUUCCiiigAooooAKKKKACiiigAooooAKKKKACirel6Zfatdra6ZZ3F3cN0jgjLt9cDtXr3g34B6xqBSfxNcpplueTBERJMw/wDQV/X6VnUrQpr3ma06M6rtBHjMEMtxMkMEbyyudqoilmY+gA617N8PvgXqWq+VeeKnfTbM/MLZcee49+yfjk+wr3fwd4F8P+EYsaNYIk5GGuZPnmb6seg9hge1dNXm1se5aU9D1aGXRjrU18jL8OeH9K8N6ctjollFaW46hBy59WY8sfc1qUUV57bbuz0kklZBRRRSGFFFFABRRRQAUUUUAFFFFABRRRQB5P8AtM/8k3X/AK/ov5PXyjX2Z8ZfCuoeMPB40zSWgW5FykuZnKrtAbPIB9RXhv8AwoPxf/z10r/wIb/4ivWwdaEKdpOx42OoVJ1bxV1Y8lor1r/hQfi//nrpX/gQ3/xFH/Cg/F//AD10r/wIb/4iur6zS/mRx/Va38rPJaK9a/4UH4v/AOeulf8AgQ3/AMRR/wAKD8X/APPXSv8AwIb/AOIo+s0v5kH1Wt/KzyWivWv+FB+L/wDnrpX/AIEN/wDEUf8ACg/F/wDz10r/AMCG/wDiKPrNL+ZB9Vrfys8lor1r/hQfi/8A566V/wCBDf8AxFH/AAoPxf8A89dK/wDAhv8A4ij6zS/mQfVa38rPJaK9a/4UH4v/AOeulf8AgQ3/AMRR/wAKD8X/APPXSv8AwIb/AOIo+s0v5kH1Wt/KzyWivWv+FB+L/wDnrpX/AIEN/wDEUf8ACg/F/wDz10r/AMCG/wDiKPrNL+ZB9Vrfys8lor1r/hQfi/8A566V/wCBDf8AxFH/AAoPxf8A89dK/wDAhv8A4ij6zS/mQfVa38rPJa+9vDv/ACL+mf8AXrF/6AK+Y/8AhQfi/wD566V/4EN/8RX1FpNu9ppVlby48yGFI2x0yFANcGOqwmo8ruejl9KdNy51YtUUUV5x6gUUUUAFFFFABRRRQB+fNFetf8KD8X/89dK/8CG/+Io/4UH4v/566V/4EN/8RX0H1ml/Mj5r6rW/lZ5LRXrX/Cg/F/8Az10r/wACG/8AiKP+FB+L/wDnrpX/AIEN/wDEUfWaX8yD6rW/lZ5LRXrX/Cg/F/8Az10r/wACG/8AiKP+FB+L/wDnrpX/AIEN/wDEUfWaX8yD6rW/lZ5LRXrX/Cg/F/8Az10r/wACG/8AiKP+FB+L/wDnrpX/AIEN/wDEUfWaX8yD6rW/lZ5LRXrX/Cg/F/8Az10r/wACG/8AiKP+FB+L/wDnrpX/AIEN/wDEUfWaX8yD6rW/lZ5LRXrX/Cg/F/8Az10r/wACG/8AiKP+FB+L/wDnrpX/AIEN/wDEUfWaX8yD6rW/lZ5LRXrX/Cg/F/8Az10r/wACG/8AiKP+FB+L/wDnrpX/AIEN/wDEUfWaX8yD6rW/lZ5LRXrX/Cg/F/8Az10r/wACG/8AiKP+FB+L/wDnrpX/AIEN/wDEUfWaX8yD6rW/lZ6P+yz/AMiLqf8A2En/APRUdey1578EvB+peC/DN5Yaw1u081406+Q5YbSiL1IHOVNehV4uIkpVZNHvYaLjSinuFFFFYm4UUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAVleIPDmj+Irfydb022vUAwplTLL/ut1X8CK1aKabTuhNJqzPHdc+AHhq8Zn0u7vtOY9E3CaMfg3zf+PVwmsfs96/b7m0rU7C9QdBIGhc/h8w/Wvp2iuiOMqx63OWeCoz6W9D4zvfhL43syfM0GeQDvDJHJn/vliaxbjwV4ptyRN4c1hcd/sUhH54xX3NRW6zGfVIweWQ6NnwkPCviEnA0HVif+vOT/Cp4vBPimUgR+G9aOe/2GXH57a+5qKf9oy/lJ/suP8x8XWfwr8bXZAi8PXS5/wCerJH/AOhEV0+mfAPxZdFTeTabZL3DzF2H4KCP1r6qoqJZhUeySNI5bSW7bPCtF/Z306JlfWtbubkdTHbRCIfTJLZ/IV6X4Z+H3hfw0yyaVpFulwvSeXMsgPqGbJH4YrqqK554ipP4mdNPDUqfwxCiiisTcKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAyvEHh3R/ENv5Gt6dbXqD7plTLL/ALrdV/A15Z4j/Z+0K8LSaHf3WmyHpHJ+/jHtzhh/30a9oorWnWnT+FmVShTqfGrnyP4g+CPjDSyzWttBqcI53Wso3Y/3Wwc/TNef6po+p6VIU1TT7yzcHGJ4Wj/mK++KR1V1KuoZTwQRkGuuGYTXxK5xTyyD+F2Pz6or7i1XwJ4W1XJvtA013PV1gVHP/Alwf1rlNQ+B3gq6z5Npd2ef+eFyx/8AQ91dEcwpvdM5pZZUXwtM+SKK+mbr9nfQmP8Aous6nGPSQRv/ACAqjJ+znaH/AFfiOdf960B/9mFaLG0e5k8BX7fifOlFfQjfs4DPy+KSB76fn/2rTof2cYw/77xO7r6JYhT+fmGn9do/zfgxfUa/8v4o+eaK+nLX9nnw+mPtWrarL/1zMafzU1tWPwM8FWzAzW17dgdprlhn/vjbUPH0kWsurPsfJNaWj6Dq2tSBNJ028vWzj9xCzgfUgYFfZmlfD/wnpTBrLw/p6uvR5IhIw+hbJrp0RUQKihVAwABgCsZZivsxN4ZY/tyPk7QPgZ4u1Iq19Ha6XCeSbiUM+PZUzz7EivT/AAz8AvD2nssut3Vzqso/g/1MX5Kd3/j1ex0VyzxlWfW3oddPA0YdL+pR0fR9N0W1FtpFjbWUH9yCMID7nHU+5q9RRXM3fVnWklogooopDCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAwte8UWGh3SW96s+903gogIIyR6+1Zv8AwsHRfS7/AO/Y/wAaofFqz32NleKOY5DEx9mGR/6D+teY1w1q84TcUfTZfleGxNCNSV79dT13/hYOi+l3/wB+x/jR/wALB0X0u/8Av2P8a8iorP63UOz+wsL5/efRaMHRWU5VhkH1FLWN4Nu/tvhjT5ScsIxG31X5f6Vs16MXzJM+Rq03TnKD6OwUUUUzMKKKKAMLXfFOnaJdpbXnnGVkD4jXOBkj19qzf+Fg6L6Xf/fsf415/wCN7z7d4nvpAcoj+Uv0Xj+YJrCrz54qak0tj6zD5JQlSjKpe7Wup67/AMLB0X0u/wDv2P8AGnJ8QNFd1X/SRk4yYxgfrXkFFT9bqG39hYXz+8+jKKzPDF5/aHh+wuScs0QDH/aHB/UGtOvRTurnyFSDpycHutAooopkBRRRQBz2teLtM0e+a0u/PMyqGOxAQM/jVH/hYOi+l3/37H+Neb+Krv7d4i1CcHKmUqp/2V+UfoBWVXnSxU1J2PrqGR4eVOLne9lfU9d/4WDovpd/9+x/jTovH2jyypGi3ZdyFA8sck/jXkFb/gWz+2+KbFSMpG3nN/wEZH64ojiakmkFbJsJSpyqO+ivue20UUV6J8iVNW1CHS9PlvLrf5MWN2wZPJA/rXN/8LB0X0u/+/Y/xq98Qf8AkT9Q+if+jFrxSuTEV5U5Wie/lWW0cXRc6l7p2/BHrv8AwsHRfS7/AO/Y/wAaP+Fg6L6Xf/fsf415FRWH1uoep/YWF8/vPdtA16z11JmsRKBEQG8xcdfx9q1q8++EX/HrqX++n8jXoNd1GTnBSZ8xj6EcPiJUobL/ACCiiitDjCsXX/EljoUsUd6Ji0qll8tc8D8a2q8y+Ln/AB/6f/1yb+dZVpuEHJHdl2HhicQqc9nf8je/4WDovpd/9+x/jR/wsHRfS7/79j/GvIqK4vrdQ+l/sLC+f3nrv/CwdF9Lv/v2P8a6iwuo72yguod3lTIHXcMHBr56r3fwp/yLWl/9e6fyrfD1pVG1I8nNsuo4SnGVO+rNWiiius8IKKKKACiiigAooooAKgvrqOysp7qbd5UKF22jJwBmp6y/FX/Itap/17P/AOgmlJ2TZpSip1IxfVoxP+Fg6L6Xf/fsf40f8LB0X0u/+/Y/xryKivO+t1D6/wDsLC+f3nrv/CwdF9Lv/v2P8aP+Fg6L6Xf/AH7H+NeRUUfW6gf2FhfP7z13/hYOi+l3/wB+x/jR/wALB0X0u/8Av2P8a8ioo+t1A/sLC+f3nrv/AAsHRfS7/wC/Y/xo/wCFg6L6Xf8A37H+NeRUUfW6gf2FhfP7z13/AIWDovpd/wDfsf41JbePNIuLiKGMXW+Rwi5jGMk49a8eq7ov/IYsP+u8f/oQoWKm2RPI8NGLav8Aee/0E4BOM+1FFekfHnJSeP8AR43ZHS8V1JBBiGQfzpv/AAsHRfS7/wC/Y/xrmPidov2PUl1GBcQXRw+P4ZP/AK45/A1xNefUxFSEnFn1eFyrB4ilGrG+vmeu/wDCwdF9Lv8A79j/ABoHxB0XPS6H/bMf415FRU/W6hv/AGFhfP7z6KjdZY1kjYMjAMrDoQe9Ori/hjrH2zSmsJmzNa/dz3jPT8jx+VdpXfCanFSR8piqEsPVlSl0CiiirMAooooAK5a88daPa3UsDm4domKFkQEEj0Oat+NdY/sbQpZI2xcy/uofUE9/wHP5V4lXLiK7pu0T3cqyuGKi6lW9uh65/wALB0X0u/8Av2P8aP8AhYOi+l3/AN+x/jXkVFc/1uoet/YWF8/vPXf+Fg6L6Xf/AH7H+NdVaTi5tYp1R0WRQ4VxhgD6ivG/Ami/2xraeaubW3xJLnofRfxP6A17TXVh5zmuaR4Oa4ahhpqnSvfqFFFFdB5QUUUUAFFFFABRRRQBHczLb28s0mdkal2x1wBmuU/4WDovpd/9+x/jXR61/wAge/8A+uEn/oJr5/rlxFaVNrlPbynL6WLjJ1L6Hrv/AAsHRfS7/wC/Y/xo/wCFg6L6Xf8A37H+NeRUVz/W6h7H9hYXz+89d/4WDovpd/8Afsf40f8ACwdF9Lv/AL9j/GvIqKPrdQP7Cwvn9566PiDovpdD/tmP8ami8eaE5+aeWP8A3om/pmvHKKPrcxPIcK+/3/8AAPc7bxRolyQItStwT/z0bZ/6FiteKWOZA8Tq6HoynIr51qe1u7i0k32s8sL/AN6Nyp/SrjjH1RzVOHoP+HP7/wCkfQtFeSaR4+1SzKrehLyIf3vlf8x/UGu/0DxRputAJby+Xcd4ZeG/D1/CumnXhPRHjYrLMRhtZK67o3KKKK2PPCiiigAooooAKzNe1q10O2jnvRIUd9g8tcnOCf6Vp1xHxZ/5Adp/18j/ANBas6snGDkjqwVGNevGnPZlj/hYOi+l3/37H+NH/CwdF9Lv/v2P8a8iorh+t1D6n+wsL5/eeu/8LB0X0u/+/Y/xrodF1S31ixF3ab/KLFfnGDkV4DXsPwy/5FWP/rq/862oV5VJWZ5uaZZRwtH2lO97nV0UUV2HzwUUUUAFFRXdzDaW0lxcyLFDGMszHgCvLvE/jq6vXeDSS1ta9PMHEj/j/CPpzWdSrGmtTsweBq4uVqa06voeiaprmm6WD9uvIo3/ALmdzf8AfI5rmLz4j6fGSLS0uJ8d2IQH+Z/SvLWZnYsxLMTkknJNJXFLFze2h9JRyGhBfvG5P7l/XzPQJfiVck/utOhUf7Uhb+gqIfEi/wA82Vrj6t/jXCUVn9YqdzrWVYRfY/P/ADPRIPiW4I8/TFI9Umx/MVrWXxD0mYgXEdzbn1K7l/Tn9K8loprE1F1Mp5LhJ7Rt6N/rc9+07V9P1ED7FeQzH+6rfN+XWr1fOgJUgqSCOhFdDpPjDWNN2qLk3EQ/5Zz/AD/r1H51vDGL7SPMr8PyWtGV/J/5ntVFYXhHxB/wkFnLL9leBomCsd25WOOx/wA9RW7XZGSkro8CrSnRm6c1Zoz9d1e20WzW6vPM8suEGxcnJBP9KwP+Fg6L6Xf/AH7H+NN+Kv8AyLUX/Xyv/oLV5JXJXryhKyPeyzK6GKoe0qXvc9d/4WDovpd/9+x/jR/wsHRfS7/79j/GvIqKx+t1D0f7Cwvn9567/wALB0X0u/8Av2P8aP8AhYOi+l3/AN+x/jXkVFH1uoH9hYXz+89d/wCFg6L6Xf8A37H+NH/CwdF9Lv8A79j/ABryKij63UD+wsL5/eeu/wDCwdF9Lv8A79j/ABo/4WDovpd/9+x/jXkVFH1uoH9hYXz+89d/4WDovpd/9+x/jR/wsHRfS7/79j/GvIqKPrdQP7Cwvn9567/wsHRfS7/79j/GrGn+N9Kv72G1gFz5szBF3RgDJ/GvGq2PCH/Iz6Z/13X+dOOKm2kZVskw0KcpK+ifU90ooor0T5EK5W68d6RbXM0Egut8TlGxGMZBwe9dVXgWvf8AIc1H/r5k/wDQjXPiKsqaXKevlOCp4uUlU6Hp3/CwdF9Lv/v2P8aP+Fg6L6Xf/fsf415FRXL9bqHuf2FhfP7z13/hYOi+l3/37H+NH/CwdF9Lv/v2P8a8ioo+t1A/sLC+f3nrw+IOinr9qH1j/wDr1PF460F/vXMkf+9E39Aa8aoo+tzJeQ4Z9X9//APdbXxLo1yQItStsnoHfYf1xWsjrIoaNlZT0KnINfOlWbK/u7F99nczQN/0zcrn61pHGP7SOarw9H/l3P7z6Dory3RPiFeQMserRC5i6GRAFcfh0P6V6NpWp2mq2ouLGZZU7gdVPoR2NdNOtGpseJisBXwv8Rad1sXKKKK1OIKKKKACq+o3kWn2M13Pu8qJdzbRk4qxWN4y/wCRW1L/AK4mpk7Js1owU6kYvZtGT/wsHRfS7/79j/Gj/hYOi+l3/wB+x/jXkVFef9bqH139hYXz+89d/wCFg6L6Xf8A37H+Na3h/wAR2OuvOtiJgYQC3mLjrn39q8Mr0P4Q/wDHxqf+7H/Nq0o4ic5qLOPH5Th8Ph5VYXurdfM9JoooruPmAooooAKKKKACikdlRSzkKoGSScACuD8SeP4rdnt9GVZ5BwZ2+4PoO/16fWonUjBXkdGGwlXEy5aSud1PNFbxGSeRIox1Z2Cgfia5vUPHOiWhKpPJcsO0CZH5nArybUtSvNSm82+uZJn7bjwPoOg/Cqdcc8Y/so+iocPwSvWld+X9f5HpNx8SkBIttNYj1klx+gH9apN8Sb4n5bG2A92Y1wdFYvEVH1PQjlGEj9j8X/md6nxJvAf3lhbsP9liP8avW3xKgJH2nTpEHcxyhv0IFeaUULEVF1FLKMJL7H4v/M9nsPG+h3ZANy1ux7TIV/UZH610NvPDcxCS3ljljPRkYMD+Ir53qxZ3lzZSiWznlgk/vRsRW0cY/tI4K3D9N60pNeup9CUV5doXxAv45I4NRgF4rEKGQBZM/wAj+leojp6V106saivE8DF4KrhJKNTrsNkcRxs7dFBJxXJf8LB0X0u/+/Y/xrqb3/jzn/65t/KvnmscRVlTtynflGApYtTdS+lv1PXf+Fg6L6Xf/fsf40f8LB0X0u/+/Y/xryKiuf63UPZ/sLC+f3nrv/CwdF9Lv/v2P8aP+Fg6L6Xf/fsf415FRR9bqB/YWF8/vPXf+Fg6L6Xf/fsf40f8LB0X0u/+/Y/xryKij63UD+wsL5/eeu/8LB0X0u/+/Y/xo/4WDovpd/8Afsf415FRR9bqB/YWF8/vPXf+Fg6L6Xf/AH7H+NH/AAsHRfS7/wC/Y/xryKij63UD+wsL5/eeu/8ACwdF9Lv/AL9j/Gj/AIWDovpd/wDfsf415FRR9bqB/YWF8/vPoaxuY72zguYd3lzIHXcMHBGamrL8Lf8AIt6X/wBe0f8A6CK1K9GLukz5CrFQnKK6MKKKKZmFFFFABRRRQAUUUUAFFYXiTxPY6Em2ZvNuiMrAh+b6n0FeYa74s1TVyyvMYLc/8sYTtGPc9TWFSvGnp1PSweVVsV7y0j3f6Hqmp+JdI00lbm9j8wf8s4/nb8h0/Gucu/iRZISLSyuJvd2Cf415dRXJLFze2h79LIsPD47y/D8v8zv5PiVdE/utPhUf7UhP+FRj4kX+ebK1I9i3+NcJRUfWKnc6llWEX2PzPR7b4lDIFzppA7tHL/Qj+tdDpnjXRb9gpuDbSH+G4G39en614vRVRxVRb6mFXJMLNe6nH0f+Z9FqwdQykMpGQQcg0teGaB4j1DRJB9llLQZ+aB+UP+B9xXrfhvxBaa9a+ZbnZMn+shY/Mv8AiPeuylXjU06nz2OyurhPe3j3/wAzYooorc8wKKKKACiiigAooooAKy9d12w0SJXvpcM/3Y0GWb3x6e9Y/i7xhb6OHtrPbPf9COqx/wC97+1eT315cX109xdytLM5yWY/54rlrYhQ0jue3l2USxH7yrpH8Weq/wDCwdF9Lv8A79j/ABo/4WDovpd/9+x/jXkVFc/1uoex/YWF8/vPZdP8baVf30NrALnzZWCrujAGfzrp68M8H/8AI0aZ/wBdlr3OurD1HUi3I8HNsHTwlSMaezQUUUV0HlBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAGL4zs/t3hm/iAyyx+Yv1X5v6Yrw2votlDKVYAqRgg96+f9VtTY6ndWrdYZWT6gHg1wYyOqkfUcPVrxnSfqVKKKK4z6M9S+E135mlXloTzDKHH0Yf4qfzruq8k+F135HiNoCfluImUD3HzD9Aa9br1MNLmpo+Izml7PFS89f6+YUUUVueWFVtTulsdOurpsYhjZ+e+BnFWa5P4m3n2bwy0SnDXMix/gPmP8sfjUVJcsWzfC0vbVo0+7PIXZndnc5Zjkk9zTaKK8c/RAooooA9U+FF55uj3Noxy0Eu4f7rD/ABBruK8j+F959n8R+Qx+W5iZMf7Q+YfyP5165XqYaXNTXkfEZxR9lipeev8AXzCiiitzywqnrF39h0q8us4MUTOPqBx+tXK5P4m3f2fww8QOGuJFj/AfMf8A0H9aipLli2dGFpe2rQp92jyAnJyetJRRXjn6GFeh/CSzzPf3rD7qrCp+vJ/kteeV7N8OrP7J4Wt2Iw87NMfxOB+gFdGFjepfseTndX2eFcf5nb9TpqKKK9M+KOe+IP8AyJ+ofRP/AEYteKV7X8Qf+RP1D6J/6MWvFK87GfGvQ+v4f/3eX+L9EFFFFcp7h6X8Iv8Aj11L/fT+Rr0GvPvhF/x66l/vp/I16DXq4f8Aho+Gzf8A3yfy/JBRRRWx5oV5l8XP+P8A0/8A65N/OvTa8y+Ln/H/AKf/ANcm/nXPif4bPVyX/e4/P8jgKKKK8w+2Cvd/Cn/ItaX/ANe6fyrwivd/Cn/ItaX/ANe6fyrrwfxM+f4h/hQ9f0NWiiivQPlAooooAKKKKACiiigArL8Vf8i1qn/Xs/8A6Ca1Ky/FX/Itap/17P8A+gmpn8LNsP8AxY+q/M8Hooorxj9FCiitPRNEvdalljsERmjAZtzBeKEm3ZEznGnFym7IzKK6r/hA9d/54w/9/RR/wgeu/wDPGH/v6K09jPsc31/Df8/F95ytFdV/wgeu/wDPGH/v6KP+ED13/njD/wB/RR7GfYPr+G/5+L7zlau6L/yGLD/rvH/6EK3f+ED13/njD/39FWdN8Ea1BqNrNJDEEjlR2IlHQEE040p32IqY/DODSqL7z1miiivWPgihr2mR6vpVxZy4HmL8rf3WHQ/nXg91BJa3MsE6lJY2KMp7EV9D15n8UtF8uePVoF+STEc2Ozdj+I4/AetcmKp3XOuh7+RYz2dR0JbS29f+Cef0UUV559YanhrVH0fWbe8XOxTtkUfxIeo/r9RXu0UiSxJJGwZHAZWHQg9DXzrXq/ww1j7Zpb6fM2ZrX7me8Z6fkePyrswlSz5GfP59hOeCxEd1o/Q7Wiiiu8+UCiiuf8cax/Y+hSvG2Lmb91F6gnqfwH64qZSUVdmlGlKtNU47s86+IOsf2rrjxxNm2tcxJjoT/Efz4+gFcxRRXjzk5NyZ+hUKMaFNU47IKUAkgAZJ6AUldf8ADfRf7R1f7ZMuba0Ibnoz9h+HX8qcIOclFCxFeOHpSqy2R6B4M0YaLokUTri5l/eTH/aPb8Bx+dbtFFexGKirI/PqtWVabqT3YUUUUzMKKKKACiiigAooooAp61/yB7//AK4Sf+gmvn+voDWv+QPf/wDXCT/0E18/1wYzdH1PD3wT9UFFFFcZ9EFFaGi6Rd6zdPb2Kq0qoZCGYLxkD+ora/4QPXf+eMP/AH9FVGnKSukYVMXRpS5ZzSfqcrRXVHwHruP9RCf+2oqvP4M16EEmwLj/AGJFb9Ac0/ZTXRkLHYZ6KovvRztFWLuzubN9l3bzQN6SIV/nVeotY6U1JXQUqsUYMpKsDkEHBFJRQM9C8IeOXRks9bcsh4S5PVf971Hv+dekqwZQykFSMgjoa+dK734eeKGtpY9L1CTNu52wSMfuH+6fY/pXbh8Q/hmfOZrlKs61Beq/yPT6KKK7j5cKKKKACuI+LP8AyA7T/r5H/oLV29cR8Wf+QHaf9fI/9Basa/8ADZ35X/vdP1PKqKKK8o+8CvYfhl/yKsf/AF1f+dePV7D8Mv8AkVY/+ur/AM66cJ8Z4uff7qvVfqdXRRRXpHxwUUVzvj7UjpvhucxttmnIhQjtnqfyBqZSUU2zWjSdapGnHds8/wDHniNtYv2t7Z/9AgbC4/5aN3Y/0/8Ar1ytFFeROTm+Zn6DQoQoU1TgtEFFFWbCyudQuVt7KF5pm6Ko/U+g96lK+xpKSirvYrUV3Vl8OL6VA13dwQE/wqC5H16CrbfDNgPk1UE+9vj/ANmrZYeo+h58s2wcXZz/AAf+R51RXa3fw71SIE289tOPTcVJ/MY/Wud1LQdU03JvLKaNB1cDcv8A30OKiVKcd0dFLG4etpCaZmUoGTgcmkrpPAGl/wBp+Iod65gt/wB8/px0H54/WpjFyaSNa9VUacqktkeo+FNM/sjQbW1IxLt3y/755P5dPwrXoor2YpRVkfndSpKpNzluzjvir/yLUX/Xyv8A6C1eSV7P4/0y71bREt9Pi82YTq5XcF4Ab1I9RXnn/CE+IP8Anw/8jR//ABVcGJhKU7pH1WTYmjTw3LOaTu92jm6K6T/hCfEH/Ph/5Gj/APiqP+EJ8Qf8+H/kaP8A+Krn9lPsz1fruG/5+R+9HN0V0n/CE+IP+fD/AMjR/wDxVZOraVeaRcLBqEPkysu8LuVsjJGeCfQ0nCUdWi6eJo1Hywmm/Joo0UUVJsFFFdBB4O12eGOWKx3RyKHU+dGMgjI/ipxi5bIzqVqdLWpJL1djn6K6T/hCfEH/AD4f+Ro//iqP+EJ8Qf8APh/5Gj/+KqvZT7My+u4b/n5H70c3Wx4Q/wCRn0z/AK7r/Orn/CE+IP8Anw/8jR//ABVaPhzwlrdnrtjcXNlshilVnbzUOB9AaqFOaktGY4jGYd0pJVFs+q7Hq9FFFesfBhXgWvf8hzUf+vmT/wBCNe+14Fr3/Ic1H/r5k/8AQjXHjNkfRcPfxJ+iKFFFFcB9SFFWNPs5b+9itbYAzSnaoJwM10X/AAgeu/8APGH/AL+iqjCUtUjGriaNF2qSSfmzlaK6d/AuvKOLVG+ky/1NZ154c1izUtcadcBR1ZV3gfiM03Tmt0TDF0Ju0Zp/NGTRS9OtJUHQFX9F1a60e9W5spCrDhlP3XHoRVCihNp3RM4RnFxkrpnvmg6tBrWmx3dtwG4dD1Ru4NaFeQfDfVmsNdW1dv8AR7v92R6P/Cf6fjXr9etRqe0jfqfC5lg/qlZwWz1QUUUVqcAVjeMv+RW1L/ria2axvGX/ACK2pf8AXE1M/hZvhf40PVfmeGUUUV4x+iBXofwh/wCPjU/92P8Am1eeV6H8If8Aj41P/dj/AJtW2H/iI87N/wDc5/L80ek0UUV6p8KFFFFABTJ5o7eF5pnVIkBZmY4AA70+vLfiT4iN1dNpVo/+jwn98QfvuO30H8/pWdWoqcbs7MFhJYuqqcdur7IoeMvFs2sytbWjNFp6ngdDL7t7e1cpRRXlTm5u7PuqFCGHgqdNWQUUUoBJAAJJ6AVJqJRXTaX4K1m/UOYFtoz/ABTnafy6/pW7F8NJSo87U0U+iwlv/ZhWsaFSWyOGpmWFpO0pr8/yPPKK9Bn+Gs4H7jUonP8AtxFf5E1h6j4J1uyBYW63KDvA279OD+lEqFSO6HTzLC1HaM1+X5nNUU6RHidkkVkdeCrDBFNrI7Tqvhxpn2/xCkzrmG0Hmn/e/hH58/hXsVcr8N9M+weHkmdcTXZ80/7v8I/Ln8a6qvUw8OSC8z4fNsT7fEu20dP6+ZDe/wDHnP8A9c2/lXzzX0RdKXtpUUZZkIA98V43/wAIT4g/58P/ACNH/wDFVli4SlayO/Iq9Kkp+0kle27t3OborpP+EJ8Qf8+H/kaP/wCKo/4QnxB/z4f+Ro//AIquP2U+zPoPruG/5+R+9HN0V0n/AAhPiD/nw/8AI0f/AMVVTU/DOraXaG5vrTyoAQC3mI3J6cAk0OnNatMccXQk+WM02/NGNRRRUHQFFFaukeH9T1eB5tPtvOjRtjHzFXBxnuR600nJ2RM6kKa5puy8zKorpP8AhCfEH/Ph/wCRo/8A4qj/AIQnxB/z4f8AkaP/AOKqvZT7Mw+u4b/n5H70c3RXSf8ACE+IP+fD/wAjR/8AxVH/AAhPiD/nw/8AI0f/AMVR7KfZh9dw3/PyP3o9U8Lf8i3pf/XtH/6CK1KoaBby2miWFvcLsmigRHXIOCAM9Kv160fhR8FXadSTXdhRRRVGQUUUUAFFFFABXCeM/GosnlsNJIa5UlZJiMiM9wPU/oK7uuF+Ifhf7ZG+p6fH/pKDM0aj/WKO49x+orGvz8nuHoZYqDrpYjbp2v5nmEsjzStJK7PIxyzMckn3NMooryj7tKwUUVuaT4V1fVFD29qyQnpJKdin6Z5P4CnGLk7JEVKsKS5qjSXmYdFegW/w1uWX/SNRhjPokZf+ZFFz8NbhUJttRikb0kiKD8wTWv1ep2OH+1sHe3P+D/yPP6K0dZ0a+0ecRX8Bjz91xyrfQ1nVi007M74TjOPNF3QVc0nUbjS7+K7tH2yIenZh3B9jVOihO2qHKKmnGSume/aLqUOraZBeW/3ZByvdW7g1erzH4UakY725052+SVfNQejDg/mP5V6dXr0Z+0gmfA4/C/Va8qa26egUUUVocYUUVW1G+ttOtHub2VYoV6k9/Yep9qG7ascYuTstyw7KilnIVQMkk4AFeceMPHJbfZ6I5C9HuR1Psn+P5etYni3xdc62zQW+6CwB4TPzP7t/h/OuWrgrYm/uwPqcuyZQtVxCu+3+YpJYkkkk8kmkoorjPoQooooA2fB//I0aZ/12Wvc68M8H/wDI0aZ/12Wvc69DB/Cz5PiD+ND0/UKKKK6zwAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAryD4m2f2bxK0wGFuY1k/EfKf5Z/GvX64T4s2fmaZZ3ijmGQxn6MP8AFf1rnxMeam/I9XJq3s8VFd9P6+Z5dRRRXmH2xoeH7v7Drdjck4WOZS3+7nB/TNe+V851734du/t2hWNyTlnhXcf9oDB/UGu3By3ifNcQ0vgq/L/L9TRoooruPmQry/4s3vmanZ2aniGMu31Y/wCCj869Qrwrxbe/b/Ed/ODlfNKKf9lflH8q5cXK0Ldz28io8+Ic39lfnp/mZFFFLXnH2AUlbPi3T/7N1prfGAIosf8AfAB/UGsanJcrsyKVRVYKcdnqXNHuzYaraXQ/5Yyq59wDyPyr6AUhgCDkHkGvnOvc/B159u8NWExOWEflt9V+X+ma7MHLVxPn+IaN4wqr0/r8TZoooruPlwrzP4t3e69sbMH/AFcbSsP944H/AKCfzr0yvEvHV39s8U3zA5WNvKHttGD+ua5sVK0Ldz2cipc+J5v5V/wDAooorzT7IkgiaeeOKMZeRgqj3JxX0HZwLa2kFvH9yJFjX6AYrxrwDZ/bPFNmCMpCTM3ttHH64r2qu/Bx0cj5biCrepCkuiv9/wDwwUUUV2Hzpz3xB/5E/UPon/oxa8Ur2v4g/wDIn6h9E/8ARi14pXnYz416H1/D/wDu8v8AF+iCiiiuU9w9L+EX/HrqX++n8jXoNeffCL/j11L/AH0/ka9Br1cP/DR8Nm/++T+X5IKKKK2PNCvMvi5/x/6f/wBcm/nXpteZfFz/AI/9P/65N/OufE/w2erkv+9x+f5HAUUUV5h9sFe7+FP+Ra0v/r3T+VeEV7v4U/5FrS/+vdP5V14P4mfP8Q/woev6GrRRRXoHygUUUUAFFFFABRRRQAVl+Kv+Ra1T/r2f/wBBNalZfir/AJFrVP8Ar2f/ANBNTP4WbYf+LH1X5ng9FFFeMfooV33wj/5CGof9cl/nXA133wj/AOQhqH/XJf51th/4iPPzX/dJ/wBdUenUUUV6p8IFFFFABRRRQAUUUUAFVtTsotR0+e0uBmOZSp9vQ/UHmrNFDV9Bxk4tSW6PnzUrOXT7+e0uBiWFip9/f6HrVavS/inou+KPVoF+ZMRz49P4W/Pj8RXmleRVp+zk4n3+BxSxVFVOvX1CtPw5qj6PrFveLkopxIo/iQ9R/nvWZRWabTujpnCNSLhLZn0VFIk0SSRMGjdQysOhB6GnVxPww1j7Xpj6fM2ZrXlM94z/AIHj8RXbV7FOanFSR+fYrDyw9WVKXQK8Y8fax/a2uusTZtrbMUeOhP8AE34n9AK9F8dax/ZGhSGNsXM/7qLHUZ6t+A/XFeK1yYup9hHu5DhN8RL0X6/5feFFFFcR9MPhieaZIolLyOwVVHUk9BXu3hrSk0bR4LRcFwN0jD+Jz1P9PoK4L4XaL9ovH1Sdf3UHyRZ7v3P4D+ftXqFd+Ep2XO+p8pnuM55qhHZb+v8AwAooorsPnwooooAKKKKACiiigAooooAp61/yB7//AK4Sf+gmvn+voDWv+QPf/wDXCT/0E18/1wYzdH1PD3wT9UFFFFcZ9Edt8J/+Rhuf+vVv/Q0r1avKfhP/AMjDc/8AXq3/AKGlerV6WF/hnxeef72/RBRRRXSeQR3EEVxE0VxEksbdVdQwP4GuG8TeAYZke40T91MOTAx+VvoT0P6fSu9oqJ04zVpI6cNi6uGlzU3b8j52mikgleKZGSRCVZWGCD6UyvVPiT4eW7s21S1TFzAP3oA++nr9R/L6V5XXl1abpysz7fBYyOLpKpHfqvMKKKKzOs9m8A64dY0cLO2bu2wkhPVh2b8f5g101eLeAtTOm+I7fc2Ibg+S/wCPQ/nj9a9pr1MPU54a7o+HzbCrDYh8u0tUFFFFbnmBXEfFn/kB2n/XyP8A0Fq7euI+LP8AyA7T/r5H/oLVjX/hs78r/wB7p+p5VRRRXlH3gV7D8Mv+RVj/AOur/wA68er2H4Zf8irH/wBdX/nXThPjPFz7/dV6r9Tq6KKK9I+OCvOPi7Od2m24PGHkI/ID+tej15f8Wwf7TsT28kj/AMerDEv92z1MmSeLjfz/ACODoooryz7cK9q8DaPFpWhwNtH2m4USyt355C/gP614rX0Do86XOlWc0ZBR4UYY+grrwaTk2eBxBUlGlGK2b1LdFFFegfJhRRRQBhat4U0jU9xmtVilP/LSH5G/wP4il8K+HIfD0VykUrTNM4JdlwQoHA/n+dblFR7ON+a2p0PFVnT9k5Pl7BRRRVnOFFFFABRRRQAV5T8Wf+Q/a/8AXqP/AENq9Wryn4s/8h+1/wCvUf8AobVz4r+Gevkf+9r0ZxNFFFeYfaBXv+if8gWw/wCveP8A9BFeAV7/AKJ/yBbD/r3j/wDQRXZg92fO8Q/BD1ZdooorvPlgooooAKKKKACvAte/5Dmo/wDXzJ/6Ea99rwLXv+Q5qP8A18yf+hGuPGbI+i4e/iT9EUKKKK4D6k2/BX/I1ab/ANdf6Gvca8O8Ff8AI1ab/wBdf6Gvca9DB/Cz5PiD+PH0/VhRRRXWeAYPiTwvYa3C5aNYbvHyzoMHP+16ivGb+0msLya1uV2zRMVYf57V9CV5P8VbdYvEEMyjBmgBb3IJH8sVx4qmrc6Posjxk/aewk7q2nkcXRRRXAfUj4ZGhmSWM4dGDKfQivoS0mFzawzr92VFcfQjNfPFe8eFXL+GtMJ5/wBHQfkAK7MG9Wj53iGC5IT82alFFFd58sFY3jL/AJFbUv8Aria2axvGX/Iral/1xNTP4Wb4X+ND1X5nhlFFFeMfogV6H8If+PjU/wDdj/m1eeV6H8If+PjU/wDdj/m1bYf+Ijzs3/3Ofy/NHpNFFFeqfChRRRQBieMtX/sbQpp0OLh/3cP+8e/4DJ/CvDySxJJJJ5JNdn8UtRNzrcdmh/d2qcj/AG25P6Y/WuLrzMTPmnbsfa5NhlRw6k95a/5BRRRXOesTWltLd3MdvbIZJpG2qo7mvYPCfhO10SJJplWe/I+aQjIT2X/HrWT8MNDEFm2q3CfvpsrDn+FO5/E/oPeu8r0MNRSXPLc+TzjMZTm6FN+6t/N/5BRRRXWeAFFFFAFLU9JsNTj2X9rFNxgMw+YfQ9RXF6h8OYjdRvp90VgLjfHLyQuecEe3Y/nXoNFZzpQn8SOvD46vh9KctO3QbGixxqkahUUBVA7AU6iitDkCiiigAooooAK5X4mf8irL/wBdU/nXVVyvxM/5FWX/AK6p/Os63wM68B/vNP1R47RRRXkH6AFeqfCX/kC3n/Xx/wCyivK69U+Ev/IFvP8Ar4/9lFdGF/iHk53/ALo/VHcUUUV6Z8UFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAeX/EPwv8AZJH1TT4/9Hc5mjUf6sn+Iex/SuS0bSbzWLoQWMRdv4mPCoPUntXvciLJGySKGRgQykZBB7VX03T7TTLYQWMCwxA5wvc+pPeuSeFUp3Wx7uHzydKh7Nq8ls/8zA8N+DLDSQstwou7sc73Hyqf9kf1PP0rqaKK6YwUFaJ5FavUry56juwoooqjEpa1psGradNaXKgq44bHKN2Ye4rwW5he2uZYJRiSJyjD3Bwa+h68L8XgDxPqe3p57H8c81xYyKspH0nD1WXNOl03MeiiiuE+nNzwTMYPFWmsD1l2f99Aj+te4V4X4QQv4n0wD/nup/I5r3SvQwfws+T4gS9tF+X6hRRRXWeAY/iPxDZ6Fbb7lt87D93Cp+Zv8B714/r+uXmuXfnXj/KPuRL91B7D+tdd8S/D0izNrFrueNsCdSc7D0DD2/lXntebiak3Llex9hk2FoRpKtDWT38vIKKKnsbSe+ukt7SJpZnOFVRXMlc9ptRV2MghkuJkhgRpJXO1VUZJNT6pYy6bfSWlxt86PG4KcgEgHH61614O8Kw6HEJ59suoOPmfsg9F/wAa818atu8Vakf+muP0FbzounBSe55uGzGOKxEqdP4Ut+7v+RiUUUVgembPg/8A5GjTP+uy17nXhng//kaNM/67LXudehg/hZ8nxB/Gh6fqFFFFdZ4AUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAVkeL7P7f4b1CEDLeUXX6r8w/lWvQQCCCMg0pLmVi6U3Tmpro7nznRV3WbQ2GrXlqekUrKPpnj9MVSrxWrOx+jxkpRUlswr1v4WXfn+Hntyfmt5SAP9k8j9Sa8kruvhPd+Xq13ak4E0Qce5U/4Ma3w0uWojzc4pe0wsvLX+vkepUUUV6h8OUdcvP7P0e8us4MUTMv+9jj9cV4EeTk9a9Z+KV55Hh9LZT81zKAR/sryf1215LXnYuV5Jdj67IKPLQdR/af5f0wrQ8PW32zXLC3xkPMgb6Z5/TNZ9db8MrXz/FCSEcW8Tyfifl/9mrCnHmkkeri6nsqE59kzQ+LVrs1KxugOJYjGfqpz/7NXBV6z8VLXzvD8U4HzQTAk/7JBH88V5NWmJjaozjyap7TCR8roK9O+Et5vsL2zY8xSCVR7MMH/wBB/WvMa6r4bXv2XxPFGThLhGiP16j9Rj8amhLlqI0zSj7XCzXbX7j2KiiivWPhCK7nW2tZp5PuRIzt9AM189zSNNNJLIcu7FmPuTmvZ/iBd/ZPCt3g4abEK/ief0zXitefjJe8on1fD9K1OdTu7fd/w4UUUVyH0B6L8JLP5r+9YdAsKn9W/wDZa9HrnPh9Z/Y/C1rkYefMzfieP0Aro69ahHlppHwWZVfa4qcvO33aBRRRWpwnPfEH/kT9Q+if+jFrxSva/iD/AMifqH0T/wBGLXiledjPjXofX8P/AO7y/wAX6IKKKK5T3D0v4Rf8eupf76fyNeg1598Iv+PXUv8AfT+Rr0GvVw/8NHw2b/75P5fkgooorY80K8y+Ln/H/p//AFyb+dem15l8XP8Aj/0//rk38658T/DZ6uS/73H5/kcBRRRXmH2wV7v4U/5FrS/+vdP5V4RXu/hT/kWtL/690/lXXg/iZ8/xD/Ch6/oatFFFegfKBRRRQAUUUUAFFFFABWX4q/5FrVP+vZ//AEE1qVl+Kv8AkWtU/wCvZ/8A0E1M/hZth/4sfVfmeD0UUV4x+ihXffCP/kIah/1yX+dcDXQ+D/EK+Hrm4le3afzUC4D7cYOfQ1pRkozTZx5hSnWw04QV2/8AM9rorz3/AIWXF/0DH/7/AA/wo/4WXF/0DH/7/D/CvQ+sU+58l/ZGM/k/Ff5noVFee/8ACy4v+gY//f4f4Uf8LLi/6Bj/APf4f4UfWKfcP7Ixn8n4r/M9Corz3/hZcX/QMf8A7/D/AAro/CfiNfEMdyyWzQeSVGC+7Oc+w9KqNaEnZMyrZdiaEHUqRsl5r/M36KKK1OIKKKKAIrq3juraW3nUNFKpRge4NeD65psmk6rcWc2SY2+Vv7y9j+Ve+1xHxP0X7Xpy6lAuZrYYkx3j/wDrHn8TXNiafNG63R7OS4z2Fb2ctpfn0/yPKqKKK80+yNPw7qj6PrFveJkqjYkUfxIeor3eGRJokliYNG6hlYdCD0NfOtdnpfi5rTwbcWBY/bEPlQN6I2cn8OfzFdWGrKF09jxM3y+WJcZ01rs/T/gFDx5rH9r67J5TZtrfMUWOh9W/E/oBXN0UVzSk5Ntnr0aUaNNU47IKsWFrLfXkNrbrullYIo+tV69I+Fmi4WTVp15OY4M/+PN/T86qlD2klExxuKWFouo9+nqdxpGnxaXptvZwfciXGf7x7n8TzVyiivXSsrI+AlJzblLdhRRRTJCiiigAooooAKKKKACiiigCnrX/ACB7/wD64Sf+gmvn+voDWv8AkD3/AP1wk/8AQTXz/XBjN0fU8PfBP1QUUUVxn0R23wn/AORhuf8Ar1b/ANDSvVq8p+E//Iw3P/Xq3/oaV6tXpYX+GfF55/vb9EFFFFdJ5AUUUUAI6q6MrgMrDBB6EV4L4h086XrV5Z87Y5Dsz/dPK/oRXvdeU/Fe2EWuW9wowJoQD7lSR/IiuXFxvC/Y9zIazhXdPpJfiv6ZxNFFFecfXiqSrAqcEcgivf8AR7v7fpVpdd5olc/Ujn9a+f69l+G8/neFLZScmJnj/wDHif6114OVpNHgcQU70Yz7P8/+GOnooor0D5MK4j4s/wDIDtP+vkf+gtXb1xHxZ/5Adp/18j/0Fqxr/wANnflf+90/U8qoooryj7wK9h+GX/Iqx/8AXV/5149XsPwy/wCRVj/66v8Azrpwnxni59/uq9V+p1dFFFekfHBXAfFu1LWdhdqOI3aNj/vAEf8AoJrv6zvEWmLq+jXNm2AzrlCezDkH86zqw54OJ14GusPiIVHsn/wDwSipJ4pIJpIZlKSRsVZT1BHUVHXkH6AnfVBXbeBPFq6WosNRJ+xk5jk6+UT1B9v5VxNFVCbg7owxOGp4mm6dRaH0TDLHPEssLrJGwyrKcgj2NPrwfRNe1DRpN1jOVQnLRNyjfUf1HNejaD4+sL3bFqK/Y5zxuJzGfx7fj+dehTxMZ6PRnyWLyavQ96HvR8t/uOyopsbpKivGyujDIZTkEU6uk8gKKKKACiiigAooooAKKKKACvKfiz/yH7X/AK9R/wChtXq1eU/Fn/kP2v8A16j/ANDaufFfwz18j/3tejOJooorzD7QK9/0T/kC2H/XvH/6CK8Ar3/RP+QLYf8AXvH/AOgiuzB7s+d4h+CHqy7RRRXefLBRRRQAUUUUAFeBa9/yHNR/6+ZP/QjXvteBa9/yHNR/6+ZP/QjXHjNkfRcPfxJ+iKFFFFcB9Sbfgr/katN/66/0Ne414d4K/wCRq03/AK6/0Ne416GD+FnyfEH8ePp+rCiiius8AK8n+KtwsviCGFTkwwAN7Ekn+WK9B8Ra/Z6HatJcOGnI/dwg/M5/oPevE9RvJtQvp7u5bdLKxZv8B7Vx4uorci3Pociws3UdeS0W3mVqKKK4D6oK978OQmDw/psTcMtvHn67RmvFNA09tU1i0s1BxI4DY7KOWP5Zr3wAAAAYA4AFduDjvI+a4hqr3Kfz/r8QoooruPmQrG8Zf8itqX/XE1s1jeMv+RW1L/riamfws3wv8aHqvzPDKKKK8Y/RAr0P4Q/8fGp/7sf82rzyvQ/hD/x8an/ux/zatsP/ABEedm/+5z+X5o9Jooor1T4UKGIUEk4A5JorO8ST/ZvD+oyg4ZYHwffBA/Wk3ZXLhHnkorqeH6rdm+1O6umzmaVn+gJ4FVKKK8Vu+p+jxiopRXQKsafave31vax/fmkWMe2Tiq9dR8N7YXHiq3YjIhR5P0wP1IqoR5pJGWJq+xpSqdkz2C2gjtraKCEbY4lCKPQAYFSUUV7J+dttu7CiiigQUUUUAFFFFABRRRQAUUUUAFFFFABXK/Ez/kVZf+uqfzrqq5X4mf8AIqy/9dU/nWdb4GdeA/3mn6o8doooryD9ACvVPhL/AMgW8/6+P/ZRXldeqfCX/kC3n/Xx/wCyiujC/wAQ8nO/90fqjuKKKK9M+KCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAGyusUbySMFRAWYnsBXz9qVyb3Ubq6PBmlaTHpk5r1D4l62LLTP7Phb/SbofNj+GPv+fT868mrz8XO7UV0PrMhwzhTlWl9rb0QUUUVyHvnV/DS1Nx4oikx8tvG0h/LaP/Qq9hrivhdpZtdIkvZVxJdt8uf7i5x+Zz+ldrXqYaHLT9T4jOK6rYp22jp/XzCiiitzyxsiLLG0cihkYFWUjIIPavGvG3hxtDv98IJsZjmNuu0/3T/T2/GvZ6q6pYW+p2MtpeJvhkGD6g9iPesa1JVI+Z6GXY6WDqX+y90eJaBod5rl35NmnyD/AFkrfdQe/wDhXsHhzQLPQrby7Zd0zD95Mw+Z/wDAe1XtOsbbTrRLaziWKFOgHf3PqferNKjQVPV7muYZpPFvljpDt39Qrwrxcc+J9TP/AE3YfrXuteD+KTnxJqn/AF8yf+hGssZ8KOvh7+LP0/Uy6KKK4D6s2fB//I0aZ/12Wvc68M8H/wDI0aZ/12Wvc69DB/Cz5PiD+ND0/UKKKK6zwAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA8j+KFn9n8RicD5bmJXz/tD5T+gH51x9eqfFez83SLW7UZaCXaf91h/iBXldeViI8tRn3WU1fa4WPlp93/AAArZ8H3f2LxNp8xOFMojb6N8v8AWsalVirBlOCDkGsovlaZ3VaaqQcH1Vj6Loqtpl0L3TrW6XGJolk/MZqzXtJ31PziUXFtM8p+Kt552uQWqnK28WSPRm5P6Ba4mtHxFef2hrt9dA5WSVtp/wBkcD9AKzq8erLmm2foOCo+xoQp9l/w4V6X8I7TFvf3hH3mWJT9Bk/zFeaV7b4Es/sXhayUjDyr5zf8C5H6YrbCxvO/Y4M8q8mG5f5nb9S34otPt3h7ULcDLNCSo9WHI/UCvB6+jK8C16z/ALP1m9tcYWKVgv8Au54/TFaYyO0ji4eq6TpfP9H+hQqxp9y1nfW9yn3oZFkH4HNV6K4k7H0jSkrM+iopFliSRDlHAYH1Bp1YHgS9+2+F7JicvEvkt7beB+mK369mMuZJn51WpulUlTfR2PPPi5d4i0+zB6s0zD6cD+bV5tXUfEi7+1eKZ0BysCLEPyyf1Jrl68uvLmqM+3yul7LCwXdX+/UKltoWubmKCMZeVwi/UnAqKuk+Htn9s8U2uRlIMzN+A4/UiohHmkkdVer7GlKo+iueyW0K29tFBGMJGgRfoBgVJRRXsn503d3YUUUUCOe+IP8AyJ+ofRP/AEYteKV7X8Qf+RP1D6J/6MWvFK87GfGvQ+v4f/3eX+L9EFFFFcp7h6X8Iv8Aj11L/fT+Rr0GvPvhF/x66l/vp/I16DXq4f8Aho+Gzf8A3yfy/JBRRRWx5oV5l8XP+P8A0/8A65N/OvTa8y+Ln/H/AKf/ANcm/nXPif4bPVyX/e4/P8jgKKKK8w+2Cvd/Cn/ItaX/ANe6fyrwivd/Cn/ItaX/ANe6fyrrwfxM+f4h/hQ9f0NWiiivQPlAooooAKKKKACiiigArL8Vf8i1qn/Xs/8A6Ca1Ky/FX/Itap/17P8A+gmpn8LNsP8AxY+q/M8Hooorxj9FCiiigAooooAKKKKACvS/hF/x76n/AL8f8mrzSvS/hF/x76n/AL8f8mrfDfxEeXnP+5z+X5o9Booor1D4gKKKKACmyIssbRyKGRgVZT0IPanUUAeE+KdJbRdZntTnys74mPdD0/w/CsmvYPiNov8AaWjG5hXNzaZcY6sn8Q/r+HvXj9eTXp+zlbofeZbi/rVBSfxLR/15hRRRWR3hRRRQBe0XTpdV1S3s4PvStgt/dXufwFe8WVtFZ2kNtbrtiiUIo9hXG/DDRfstg+pTria5G2PPaP1/E/yFdxXpYanyx5nuz43OsZ7et7OO0fz6/wCQUUUV0njBRRRQAUUUUAFFFFABRRRQAUUUUAU9a/5A9/8A9cJP/QTXz/X0BrX/ACB7/wD64Sf+gmvn+uDGbo+p4e+CfqgooorjPojtvhP/AMjDc/8AXq3/AKGlerV5T8J/+Rhuf+vVv/Q0r1avSwv8M+Lzz/e36IKKKK6TyAooooAK88+LyAxaXJ3DSL+e3/CvQ64D4un/AEPTh38x/wCQrHEfw2ellDtjIfP8meZUUUV5R9yFer/Cd8+H7hT/AA3Lf+grXlFeq/CYf8SO7P8A08n/ANBWujC/xDyM7/3R+qO3ooor0z4sK4j4s/8AIDtP+vkf+gtXb1xHxZ/5Adp/18j/ANBasa/8Nnflf+90/U8qoooryj7wK9h+GX/Iqx/9dX/nXj1ew/DL/kVY/wDrq/8AOunCfGeLn3+6r1X6nV0UUV6R8cFFFFAHBfETwu12G1TT4906j9/Go5cD+Ie4rzCvoyuI8W+B4tQZ7vStsN0eXiPCSH29D+lcVfD3fNA+jyvNlTSo13p0f6M8qoqxfWdxY3DQXkLwyr1Vxj/9YqvXC1Y+nTUldBRRRQM1NF17UdHkzY3DKmcmJuUb8P6jmvSPDvjqx1ErDfgWdyeAWP7tj7Ht+P515HRWtOtKntscGLy2hileSs+63/4J9GdelFePeFPGN1o7JBdFriw6bCfmjH+yf6fyr1mwvLe/tI7m0lWWFxlWH+etejSrRqLTc+RxuX1cHL3tV0ZYooorU4QooooAKKKKACvKfiz/AMh+1/69R/6G1erV5T8Wf+Q/a/8AXqP/AENq58V/DPXyP/e16M4miiivMPtAr3/RP+QLYf8AXvH/AOgivAK9/wBE/wCQLYf9e8f/AKCK7MHuz53iH4IerLtFFFd58sFFFFABRRRQAV4Fr3/Ic1H/AK+ZP/QjXvteBa9/yHNR/wCvmT/0I1x4zZH0XD38SfoihRRRXAfUlvSb59N1GC8iVXeFtwVuhrr/APhZGof8+Vp/49/jXC0VcakoK0Wc1fB0MQ+arG7O4f4j6mR8lpZqfcMf/ZqzL3xtrl0pUXQgU9oUC/r1/WuaoputN9SIZdhYO6pofLLJNI0kztJIxyWY5J+pplFFZnYlbYKKUAkgAEk8ACvQ/Bfgpy8d9rUe1R80dsw5Pu3+H51dOnKo7I5sVi6eFhz1H/wTR+GugNY2jaldptuLhcRqRyqev1P8vrXb0UV6sIKEeVHwmJxEsTVdWfUKKKKswCsbxl/yK2pf9cTWzWN4y/5FbUv+uJqZ/CzfC/xoeq/M8Mooorxj9ECvQ/hD/wAfGp/7sf8ANq88r0P4Q/8AHxqf+7H/ADatsP8AxEedm/8Auc/l+aPSaKKK9U+FCuf8fvs8I6gR3CD83UV0Fc38RQf+EQvvrH/6GtRV+B+h04JXxFP/ABL8zxeiiivHP0IK7r4Sx51i9k/uwbfzYf4Vwtd/8I8fbtR9fLX+ZrXD/wARHn5q7YSf9dT02iiivWPhAooooAKKKKACiiigAooooAKKKKACiiigArlfiZ/yKsv/AF1T+ddVXK/Ez/kVZf8Arqn86zrfAzrwH+80/VHjtFFFeQfoAV6p8Jf+QLef9fH/ALKK8rr1T4S/8gW8/wCvj/2UV0YX+IeTnf8Auj9UdxRRRXpnxQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABWb4g1i30TTnurk5PSOMHl29BU2rajbaVYyXd4+yJPzY9gPevFPEet3Gu6g1xcHbGOIogeEX/H1NYV6ypqy3PUyzLpYufNL4Fv5+RU1S+n1K/mu7pt0shyfQegHsKq0UV5bd9WfbRiopRjsgrX8MaPJrerRWqZEQ+aVx/Cg6/j2FZtrby3VxHBbo0k0jbVVepNe2eEtBj0HTBFw1zJhppB3PoPYVtQpe0lrsedmeOWEpWj8T2/zNiGJIIUiiUJGihVUdAB0FPoor1T4Zu+rCiiigAooooAKKKKACvBvE3/Ix6p/19S/+hGvea8G8Tf8AIx6p/wBfUv8A6Ea48Z8KPoeHv4s/QzKKKK4D6o2fB/8AyNGmf9dlr3OvDPB//I0aZ/12Wvc69DB/Cz5PiD+ND0/UKKKK6zwAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAyvFNn9v8PX9uBlmiLKP9peR+oFeEV9GV4Fr1n/Z+tXtrjCxSsF/3c8fpiuHGR2kfT8PVdJ0n6/o/wBChRRRXEfSHsnw3uvtPhWBSctA7RH88j9GFavie9/s/QL+5BwyxEKf9o8D9SK434R3X/IRtCf7sqj8wf8A2WtD4rXXlaFBbg/NPMM+6qM/zxXpRqfuebyPja2FvmXsujd/luzyiiiivNPsixYWzXl9b2yfemkWMficV9BRRrFEkcYwiAKB6AV498N7P7V4ohcjKW6NKfr0H6kflXsdehg42i5HynEFbmqxprovz/4YK8m+Kdn5Gvx3Kj5bmIEn/aXg/ptr1muK+Ktn52hw3SjLW8vJ9Fbg/rtrTEx5qbOLKK3ssVHz0+//AIJ5RRRRXln3B6T8JLzMV/ZMfussyj68H+S16E7BFLMcKBkn0FePfDS6+z+KYkJwJ43jP5bh/wCg16X4uuvsfhrUZgcHyigPu3yj+delh5/ur9j47NsP/tvKvtW/yPE9SuTe6hc3TdZpGk/M5qtRRXmt31PsIpRSSCvSPhJZ/Jf3rDqVhU/q3/steb17X4Bs/sfhazBGHmBmb33HI/TFdGFjed+x5GeVfZ4bl/mdv1Ohooor0z4wKKKKAOe+IP8AyJ+ofRP/AEYteKV7X8Qf+RP1D6J/6MWvFK87GfGvQ+v4f/3eX+L9EFFFFcp7h6X8Iv8Aj11L/fT+Rr0GvPvhF/x66l/vp/I16DXq4f8Aho+Gzf8A3yfy/JBRRRWx5oV5l8XP+P8A0/8A65N/OvTa8y+Ln/H/AKf/ANcm/nXPif4bPVyX/e4/P8jgKKKK8w+2Cvd/Cn/ItaX/ANe6fyrwivd/Cn/ItaX/ANe6fyrrwfxM+f4h/hQ9f0NWiiivQPlAooooAKKKKACiiigArL8Vf8i1qn/Xs/8A6Ca1Ky/FX/Itap/17P8A+gmpn8LNsP8AxY+q/M8Hooorxj9FCtvwv4fl8QTzxQTxwmJQxLgnOT7ViV33wj/5CGof9cl/nWlGKlNJnJj60qGHlUhuv8xP+FbXn/P/AG//AHy1H/Ctrz/n/t/++Wr0+iu/6rT7Hyn9tYv+b8EeYf8ACtrz/n/t/wDvlqP+FbXn/P8A2/8A3y1en0UfVafYP7axf834I8w/4Vtef8/9v/3y1dV4K8OzeH4rtZ545jMVI2AjGM+v1rpaKqFCEHdGVfM8RiIOnUej8gooorY88KKKKACiiigAIyMHpXiXjXRv7G1uSONcW0v7yH0APUfgePyr22uS+J1pFN4aed1/e27qUb0yQCPpz+grnxMOaF+x6uT4p0MQo9Jaf5HkFFFFeYfbBWt4X0l9a1mC0GRFnfKw/hQdf8PxrJr0/wCEkMY0++n2jzTKELd8AZx+taUYc80mcWY4h4bDyqR3/wAzu4o0ijSONQqIAqqOgA6CnUUV658DuFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAU9a/wCQPf8A/XCT/wBBNfP9fQGtf8ge/wD+uEn/AKCa+f64MZuj6nh74J+qCiiiuM+iO2+E/wDyMNz/ANerf+hpXq1eU/Cf/kYbn/r1b/0NK9Wr0sL/AAz4vPP97fogooorpPICiiigArzf4uzAy6ZCDyBI5H12gfyNekV498S7wXXieSNTlbeNYuPX7x/VsfhXPinanY9fJKfPilLsm/0/U5SiiivMPtAr134Wx7PDLN/z0uHb9FH9K8ir3DwRbG18K6chGC0fmH/gRLf1rqwivO54mfT5cOo92blFFFeifHhXEfFn/kB2n/XyP/QWrt64j4s/8gO0/wCvkf8AoLVjX/hs78r/AN7p+p5VRRRXlH3gV7D8Mv8AkVY/+ur/AM68er2H4Zf8irH/ANdX/nXThPjPFz7/AHVeq/U6uiiivSPjgooooAKKKKAKeqaXZarB5N/bpMnYkcr9D1Fefa78PJ4t0ujzecnXyZSAw+h6H8cV6bRWdSlGpujswuPr4V/u3p26Hzzd2s9nO0N1DJDKvVXXBqGvoDU9Ms9Ug8m/t0mTtuHK/Q9R+Fed+I/AE9sHn0d2uIhyYW++Poe/8/rXDUwso6x1R9LhM6o1vdq+6/wODopWUoxVgVYHBBGCDSVzHtBXSeCfET6JqISVibGYgSr/AHf9ofT+X4VzdFOMnF3RnWowrwdOa0Z9GKQygqQQeQR3orl/hzqRv/DkccjZltW8k57qOV/Q4/Cuor2IS5oqSPz6vRdCpKnLowoooqjEKKKKACvKfiz/AMh+1/69R/6G1erV5T8Wf+Q/a/8AXqP/AENq58V/DPXyP/e16M4miiivMPtAr3/RP+QLYf8AXvH/AOgivAK9/wBE/wCQLYf9e8f/AKCK7MHuz53iH4IerLtFFFd58sFFFFABRRRQAV4Fr3/Ic1H/AK+ZP/QjXvteBa9/yHNR/wCvmT/0I1x4zZH0XD38SfoihRRRXAfUhRWhoNiupaxa2cjsiTPtLL1Fegf8K2sv+f65/wC+VrSFGVRXiceJzChhZKNV2b8jy+ivS7v4bwLaym1vZmnCkorgYJ7A15tIjRyMkilXUlWUjkEdqU6UqfxFYbG0cVf2TvYbSrjcNxIGeSBmkoqDqPZ/CXh3SLK1gvbIfaZJFDLcScnn0H8P866WvLvhp4g+y3P9lXT/ALiY5hJP3X9Pof5/WvUa9WhKMoe6fCZnSq0q7VV37PyCiiitjzwooooAKxvGX/Iral/1xNbNY3jL/kVtS/64mpn8LN8L/Gh6r8zwyiiivGP0QK9D+EP/AB8an/ux/wA2rzyvQ/hD/wAfGp/7sf8ANq2w/wDER52b/wC5z+X5o9Jooor1T4UKwPHqGTwjqIHZVb8nU/0rfrO8SQG58P6jEOWa3fH1wSKmavFo3w0uStCXZr8zwSiiivGP0QK7r4SyY1m8j/vW+78mH+NcLXT/AA4uRb+K7dScCZXj/TI/UCtKLtURxZjDnwtRLt+Wp7LRRRXrnwIUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAVyvxM/wCRVl/66p/OuqrlfiZ/yKsv/XVP51nW+BnXgP8Aeafqjx2iiivIP0AK9U+Ev/IFvP8Ar4/9lFeV16p8Jf8AkC3n/Xx/7KK6ML/EPJzv/dH6o7iiiivTPigooooAKKKKACiiigAooooAKKKKACiiigAooooAKralfW+m2cl1eSCOGMZJPf2HqaXUL230+zkuruQRwxjJJ/kPU14x4r8RXGv3m5sx2kZ/dRZ6e59TWNasqa8z0cuy+eMn2it3+iG+KfEFxr195kmUtkyIos8KPU+5rEoory5Scndn29KlGlBQgrJBT4o3mlSOJGeRyFVVGST6ClgiknmSKFGkkc7VVRkk1634K8Jx6NGLq9Cyagw+oiHoPf1P+TpSpOo7I5cdjoYOHNLVvZDvBHhZNFgFzdhW1CQc9xEP7o9/U/5PV0UV6kIKCsj4evXniJupUd2woooqjEKKKKACiiigAooooAK8G8Tf8jHqn/X1L/6Ea95rwbxN/wAjHqn/AF9S/wDoRrjxnwo+h4e/iz9DMooorgPqjZ8H/wDI0aZ/12Wvc68M8H/8jRpn/XZa9zr0MH8LPk+IP40PT9QooorrPACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAryb4p2fkeII7lR8tzECT/tLwf0216zXFfFWz87RILpRlreXBPorDB/ULWGJjzU2enk9X2WKj56f18zyiiiivLPuDq/hnc+R4pijzgTxvH+m7/wBlrR+LVzv1SytgeIoS/wCLHH/sorlfDdx9l1/T5s4Czpn6E4P6Vo/EG4+0eLL3Byse2Mfgoz+ua3U/3Lj5nlzw98wjU/uv/L9TnKKKKwPUPTfhLZ7LK+vWHMjiJT7KMn+Y/Ku/rE8F2f2HwxYRkYZo/Nb6t839QK269ejHlgkfAZhW9tiZz8/y0Cs7xFZ/2hod9agZaSJto/2hyP1ArRoq2rqxywm4SUluj5zorT8TWf8AZ+v39sBhUlJUf7J5H6EVmV4rVnY/R6c1UiprZ6l/Qbn7HrdjcZwI5kJ+mef0r0v4qXPleHooQeZpwCPYAn+eK8lrtviPqH2y30MZ+/beef8AgYH+BrenO1OSPMxmH58XRn6/hqjiaKKKwPVJrOBrq7gt4/vyusa/UnFfQcESwQxxRjCIoVR6ADFeO/Dqz+1+KbdiMpArTN+AwP1Ir2Wu/BxtFyPlOIKvNVjTXRX+/wD4YKKKK7D58KKKKAOe+IP/ACJ+ofRP/Ri14pXtfxB/5E/UPon/AKMWvFK87GfGvQ+v4f8A93l/i/RBRRRXKe4el/CL/j11L/fT+Rr0GvPvhF/x66l/vp/I16DXq4f+Gj4bN/8AfJ/L8kFFFFbHmhXmXxc/4/8AT/8Ark3869NrzL4uf8f+n/8AXJv51z4n+Gz1cl/3uPz/ACOAooorzD7YK938Kf8AItaX/wBe6fyrwivd/Cn/ACLWl/8AXun8q68H8TPn+If4UPX9DVooor0D5QKKKKACiiigAooooAKy/FX/ACLWqf8AXs//AKCa1Ky/FX/Itap/17P/AOgmpn8LNsP/ABY+q/M8Hooorxj9FCu++Ef/ACENQ/65L/OuBrvvhH/yENQ/65L/ADrbD/xEefmv+6T/AK6o9Oooor1T4QKKKKACiiigAooooAKKKKACiiigArmfiP8A8ijef70f/oYrpq5n4j/8ijef70f/AKGKzq/A/Q6sD/vNP/EvzPGaKKK8g/QQr1P4S/8AIGvP+vj/ANlFeWV6n8Jf+QNef9fH/sorowv8Q8nO/wDdH6r8zuaKKK9M+KCiiigAooooAKKKKACiiigAooooAKKKKAKetf8AIHv/APrhJ/6Ca+f6+gNa/wCQPf8A/XCT/wBBNfP9cGM3R9Tw98E/VBRRRXGfRHbfCf8A5GG5/wCvVv8A0NK9Wryn4T/8jDc/9erf+hpXq1elhf4Z8Xnn+9v0QUUUV0nkBRRTZHSONnkZURRlmY4AHqaAKur38Wl6bcXk5+SJScZ+8ew/E8V4JdTvdXMs8xzJK5dj6knJrqPHnib+2rkW1mx+wQnIPTzG/vfT0rkq8zE1eeVlsj7TJ8C8NTc5r3pfggooornPXLOnWr31/b2sX35pFQe2T1r6BhjWGFIoxhEUKo9AK8v+FmlG41KXUZF/dW42IT3cj+g/mK9Sr0MJC0ebufI59iFUrKkvs/mwooorrPCCuI+LP/IDtP8Ar5H/AKC1dvXEfFn/AJAdp/18j/0Fqxr/AMNnflf+90/U8qoooryj7wK9h+GX/Iqx/wDXV/5149XsPwy/5FWP/rq/866cJ8Z4uff7qvVfqdXRRRXpHxwUUU1JY3Z1R1ZkOGAOSp9D6UBYdRRRQAUUUUAFFFFAHEfEXw3FdWUuqWiBbqEbpQo/1ijqT7j19PwryqvoTUdn9n3XmY2eU27Ppg5r57rzsXBRkmup9dkNedSlKEteXYKKKK5T3T0H4RzkXeowZ4ZEf8iR/WvS68t+Eqk6xet2EGP/AB4f4V6lXp4b+Gj4nOkli5W8vyCiiiug8oKKKKACvKfiz/yH7X/r1H/obV6tXlPxZ/5D9r/16j/0Nq58V/DPXyP/AHtejOJooorzD7QK9/0T/kC2H/XvH/6CK8Ar3/RP+QLYf9e8f/oIrswe7PneIfgh6su0UUV3nywUUUUAFFFFABXgWvf8hzUf+vmT/wBCNe+14Fr3/Ic1H/r5k/8AQjXHjNkfRcPfxJ+iKFFFFcB9Sbfgr/katN/66/0Ne414d4K/5GrTf+uv9DXuNehg/hZ8nxB/Hj6fqwrzH4naD5FwNWtk/dynbOAOjdm/H+f1r06ob61ivbOa2uV3wyqVYe1b1aaqRseXgcXLCVlUW3X0PnmitDXtLl0fVJrOfkocq399T0NZ9eQ007M++hOM4qUXoxVJVgVJBHII7V7R4H18a3pYEzD7bBhZR/e9G/H+deLVpeHtWm0XVIruHJC8SJn76nqP8962oVfZy8jhzLBLF0rL4lt/l8z3qioLG6hvrSK5tnDwyqGU+1T16u58K04uzCiiigQVjeMv+RW1L/ria2axvGX/ACK2pf8AXE1M/hZvhf40PVfmeGUUUV4x+iBXofwh/wCPjU/92P8Am1eeV6H8If8Aj41P/dj/AJtW2H/iI87N/wDc5/L80ek0UUV6p8KFIyhlKsMgjBFLRQB8+ajbNZahc2r/AHoZGjP4HFVq6/4m6ebTxD9pUYju0D/8CHBH8j+NchXjVI8snE/RMLWVejGouqCrGn3T2V9b3Uf34ZFkHvg5qvRUp2NmlJWZ9EW08dzbRTwndHKodT6gjIqSuB+GGurLbHSbl8SxZaAk/eXqV+o/l9K76vYpzU4qSPz7F4aWGqunLp+QUUUVZzBRRRQAUUUUAFFFFABRRRQAUUUUAFcr8TP+RVl/66p/OuqrlfiZ/wAirL/11T+dZ1vgZ14D/eafqjx2iiivIP0AK9U+Ev8AyBbz/r4/9lFeV16p8Jf+QLef9fH/ALKK6ML/ABDyc7/3R+qO4ooor0z4oKKKKACiiigAooooAKKKKACiiigAooooAKr395Bp9pJc3cgjhjGWY/y+tLf3kFhaSXN3II4YxlmP+eteM+LfEk+v3feOzjP7qLP/AI8ff+VY1qyprzPRy/L54yfaK3f6CeLPEc+v3mTmOzjP7qLP6n3/AJVg0UV5cpOTuz7alShRgoQVkgqa0tpry5jt7WNpZpDhVXqafp9lcahdx21nG0kznAUfzPoK9j8JeGbfQbbcdst64/eS46f7K+g/nWtGi6j8jjzDMIYOPeT2X9dCDwd4Vh0OITz7ZdQcfM/ZB6L/AI109FFenGKgrI+Jr1515upUd2woooqjIKKKKACiiigAooooAKKKKACvBvE3/Ix6p/19S/8AoRr3mvBvE3/Ix6p/19S/+hGuPGfCj6Hh7+LP0MyiiiuA+qNnwf8A8jRpn/XZa9zrwzwf/wAjRpn/AF2Wvc69DB/Cz5PiD+ND0/UKKKK6zwAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKzfEln/aGg31sBlniO0f7Q5H6gVpUUmrqxUJuElNbo+c6K0vEln/AGfr19bAYVJW2j/ZPI/Qis2vFas7H6PCanFTWzFUlWDKcEHINWdVuje6nd3R486VpMemTmqtFF+g+VX5uoVa0u1N9qVrar1mlVPoCetVa634ZWf2nxKsxGVto2k/E/KP5k/hVU480kjHFVfY0ZVOyPXlUIoVQAoGAB2paKK9k/OwooooA8r+K1n5Os290owtxFgn1ZT/AIFa4evXPijZ/aPDq3Cj5raUMT/sn5T+pFeR15eJjy1GfcZPW9rhY+Wn9fIKuaheNdpaBs/uIBCPoCT/AFqnRWFz0nFNpvoFFFFAz0r4SWeIL+9YfeZYVP05P81r0KsHwLZ/YvC9ipGHkXzm/wCBcj9MVvV61GPLBI+BzGr7bEzl52+7QKKKK1OIKKKKAOe+IP8AyJ+ofRP/AEYteKV7X8Qf+RP1D6J/6MWvFK87GfGvQ+v4f/3eX+L9EFFFFcp7h6X8Iv8Aj11L/fT+Rr0GvPvhF/x66l/vp/I16DXq4f8Aho+Gzf8A3yfy/JBRRRWx5oV5l8XP+P8A0/8A65N/OvTa8y+Ln/H/AKf/ANcm/nXPif4bPVyX/e4/P8jgKKKK8w+2Cvd/Cn/ItaX/ANe6fyrwirCXt0ihUuZ1UDAAkIArajV9k27HnZjgXjYKKlazPoSivn37fef8/dx/38P+NH2+8/5+7j/v4f8AGuj64ux5H+rsv+fn4f8ABPoKivn37fef8/dx/wB/D/jR9vvP+fu4/wC/h/xo+uLsH+rsv+fn4f8ABPoKivn37fef8/dx/wB/D/jR9vvP+fu4/wC/h/xo+uLsH+rsv+fn4f8ABPoKisHwJI8vhOweR2dyHyzHJPztW9XXF8yTPArU/ZVJU+za+4Ky/FX/ACLWqf8AXs//AKCa1Ky/FX/Itap/17P/AOgmifwsrD/xY+q/M8Hooorxj9FCu++Ef/IQ1D/rkv8AOuBqSGeWAkwyvGT1KMRn8qunPkkpHPi6H1ijKkna59EUV8+/b7z/AJ+7j/v4f8aPt95/z93H/fw/411/XF2Pn/8AV2X/AD8/D/gn0FRXz79vvP8An7uP+/h/xo+33n/P3cf9/D/jR9cXYP8AV2X/AD8/D/gn0FRXz79vvP8An7uP+/h/xq3o99dtq9iGupyDOgIMh5+YU1jE3awpcPyim/afh/wT3eiiiuw+dCiiigAooooAK5n4j/8AIo3n+9H/AOhiumrmfiP/AMijef70f/oYrOr8D9DqwP8AvNP/ABL8zxmiiivIP0EK9T+Ev/IGvP8Ar4/9lFeWV6n8Jf8AkDXn/Xx/7KK6ML/EPJzv/dH6r8zuaKKK9M+KCiiigAooooAKKKKACiiigAooooAKKKKAKetf8ge//wCuEn/oJr5/r6A1r/kD3/8A1wk/9BNfP9cGM3R9Tw98E/VBRRRXGfRHbfCf/kYbn/r1b/0NK9Wr53hmlhYtDI8bEYyjEHFTfb7z/n7uP+/h/wAa6qWIVOPLY8TH5RLF1vaqdvkfQVQ3N1b2q7rmeKFfWRwo/WvAWvbpvvXM5+shqAkk5Jyat4zsjkjw7/NU/D/gnseq+ONHsVYQytdyjosI4/76PH5ZrzvxJ4qv9cJjkIgtM5EMZ4P+8e/8vauforCpiJz0ex6uFyrD4Z8yV33YUUUVieiFWdPs5tQvYbW1TfNK21R/U+1RQQyXEyRQI0krnaqqMkmvYPBHhhdDtvPuQrahKPmI5EY/uj+prWjSdR+RwZhjoYOnd/E9l/XQ2dC0yLSNLgs4ORGPmb+8x6mr9FFeqkkrI+FnNzk5S3YUUUUyQriPiz/yA7T/AK+R/wCgtXb1xHxZ/wCQHaf9fI/9Basa/wDDZ35X/vdP1PKqKKK8o+8CvYfhl/yKsf8A11f+dePV7D8Mv+RVj/66v/OunCfGeLn3+6r1X6nV0UUV6R8cFeM+Lry5svGeoS2k8kMgcfMjEH7or2avEfHX/I2aj/vj/wBBFcmLdor1PdyBKVeSf8v6o29I+Il7BtTU4Euk/vp8j/4H9K7PS/GGjagAFuxBIf4J/kP59P1rxOiueGJnHfU9jEZLhq2sVyvy/wAj6LRldQyMGU9CDkGlr58tL67s23WlzNAf+mblf5VsW/jLXoAAt+zgdnRW/UjNbrGR6o8qpw9VX8Oafrp/me10V47/AMJ5ruMefF9fKWs6/wDE+s3ylLi/m2HgqmEB/wC+cZqni4dERDIMQ370kl8/8ju/iF4mgt7CbTLORZLqYbJSpyI17g+56YryuiiuKrUdR3Z9HgsHDB0/Zx17sKKKkgiknmSKFS8jsFVR1JPQVmdbdtWekfCS0K2l/dsOJHWJf+Agk/8AoQ/KvQKzvDumrpGjW1muC0a/Ow7seSfzrRr16UOSCR+f46usRiJ1Fs3/AMAKKKK0OQKKKKACvKfiz/yH7X/r1H/obV6tXlPxZ/5D9r/16j/0Nq58V/DPXyP/AHtejOJooorzD7QK9/0T/kC2H/XvH/6CK8Ar3/RP+QLYf9e8f/oIrswe7PneIfgh6su0UUV3nywUUUUAFFFFABXgWvf8hzUf+vmT/wBCNe+14Fr3/Ic1H/r5k/8AQjXHjNkfRcPfxJ+iKFFFFcB9Sbfgr/katN/66/0Ne414d4K/5GrTf+uv9DXuNehg/hZ8nxB/Hj6fqwooorrPAOU+IWg/2rpf2m3TN5agsuOrp3X+o/8Ar149X0ZXj/xC0H+ydU+0W6Ys7kllx0Ru6/1H/wBauHFUvto+myLG/wDMNN+n+X6nJ0UUVxH0p3Pw18QfY7r+y7p8W87ZiJ/gf0+h/n9a9Tr50BIIIOCO9ey+BNfGtaWI52/023AWTPVx2b/H3ruwtW/uM+XzzA8r+swWj3/zOmooortPnArG8Zf8itqX/XE1s1jeMv8AkVtS/wCuJqZ/CzfC/wAaHqvzPDKKKK8Y/RAr0P4Q/wDHxqf+7H/Nq88r0P4Q/wDHxqf+7H/Nq2w/8RHnZv8A7nP5fmj0miiivVPhQooooA5vx9pB1bQZDEu65t/3seOp9R+I/UCvF6+jK8i+IXh1tLv2vbZP9CuGzgD/AFbnqPoeo/KuLF0r++j6TIsalfDzfp/kchRRRXCfTkkE0lvMk0LskqEMrKcEEd69S8L+Ora8jS31dlt7oceaeEf3/wBk/p/KvKaK0p1ZU3dHHjMDSxcbVN1s+p9FoyuoZGDKRkEHINLXgFhql/p//HleTwjrtRyAfw6Vrx+NtfQAfbQwH96JD/SuxYyPVHz9Th+sn7kk153X+Z7RRXi8njbX3GPt20f7MSD+lZ11r2rXQIn1G6ZT1XzCB+Q4oeMj0QocP138Ukvv/wCAe3X2pWVgpN5dwQ+zuAT+HWuZ1L4g6VbZW0Wa7cdCo2L+Z5/SvJSSSSTknuaSsZYuT2Vj0KOQUY61JOX4f1957d4N1yXX9Onupoki2TmNVQk8BVPJ9ea3q4r4T/8AIvXP/X03/oCV2tdtJuUE2fOY+nGliJwgrJMKKKK0OQKKKKACuV+Jn/Iqy/8AXVP511Vcr8TP+RVl/wCuqfzrOt8DOvAf7zT9UeO0UUV5B+gBXqnwl/5At5/18f8AsoryuvVPhL/yBbz/AK+P/ZRXRhf4h5Od/wC6P1R3FFFFemfFBRRRQAUUUUAFFFFABRRRQAUUUUAFQX13BY2slzdSLHDGMsxqevG/HuuXOpaxcWjnZa2srRpGDwSDgsff+VZVqvs43O7L8E8ZV5L2S3K/i7xJPr13gbo7KM/uos/+PN7/AMq5+iivKlJyd2fc0aUKMFCCskFWtMsZ9TvorS0UNNKcAE4HqSfwqrSgkHIJB9qS8y5XafLue4eF/DttoNptjxJcuP3sxHLew9BW3Xzt5j/32/OjzH/vt+ddkcWoqyifPVcinVk5zq3b8v8Agn0TRXzt5j/32/OjzH/vt+dV9c/umf8Aq6/+fn4f8E+iaK+dvMf++350eY/99vzo+uf3Q/1df/Pz8P8Agn0TRXzt5j/32/OvWvhaS3hpyxJP2h+v0WtKWI9pLlsceOyj6pS9rz317f8ABOvooorpPGCiiigAooooAK8G8Tf8jHqn/X1L/wChGvea8G8Tf8jHqn/X1L/6Ea48Z8KPoeHv4s/QzKKKK4D6o2fB/wDyNGmf9dlr3OvDPB//ACNGmf8AXZa9zr0MH8LPk+IP40PT9QooorrPACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA8p+Ktn5OuQXSjC3EXJ9WXg/oVria9Z+Kdn5+gR3Kj5raUEn/AGW4P67a8mry8THlqM+4yer7XCx8tP6+QUUUVgemFeo/Caz8vTLy8YczSBB9FH+LH8q8ur3XwlZ/YPDdhARhvKDsPdvmP866cJG879jxc9rcmHUP5n+Wv+Rr0UUV6R8cFFFFAFLWrMX+kXlrjJliZR9ccfrivASCCQeCK+i68L8XWf2DxJfwAYXzS6j2b5h/OuLGR0Uj6Th6trOk/X/P9DHooorhPpwqxYWzXl9b2yfemkWMficVXrqfhvZ/avFELkZS3RpT/IfqR+VVCPNJIxxNX2NKVTsj2GJFijSNBhEAUD0Ap1FFeyfnW4UUUUAFFFFAHPfEH/kT9Q+if+jFrxSva/iD/wAifqH0T/0YteKV52M+Neh9fw//ALvL/F+iCiiiuU9w9L+EX/HrqX++n8jXoNeffCL/AI9dS/30/ka9Br1cP/DR8Nm/++T+X5IKKKK2PNCvMvi5/wAf+n/9cm/nXpteZfFz/j/0/wD65N/OufE/w2erkv8Avcfn+RwFFFFeYfbBRRRQAUUUUAFFFFABRRRQB7Z4A/5FDT/o/wD6G1dBXP8AgD/kUNP+j/8AobV0FexS+Beh+e4z/eKn+J/mFZfir/kWtU/69n/9BNalZfir/kWtU/69n/8AQTTn8LIw/wDFj6r8zweiiivGP0UKKKKACiiigAooooAKu6L/AMhiw/67x/8AoQqlV3Rf+QxYf9d4/wD0IU47oir8D9D3+iiivaPzcKKKKACiiigArmfiP/yKN5/vR/8AoYrpq5n4j/8AIo3n+9H/AOhis6vwP0OrA/7zT/xL8zxmiiivIP0EK9T+Ev8AyBrz/r4/9lFeWV6n8Jf+QNef9fH/ALKK6ML/ABDyc7/3R+q/M7miiivTPigooooAKKKKACiiigAooooAKKKKACiiigCnrX/IHv8A/rhJ/wCgmvn+voDWv+QPf/8AXCT/ANBNfP8AXBjN0fU8PfBP1QUUUVxn0QUUUUAFFFFABRV200rULsj7LZXMoPdYyR+ddBp/gLWbogzrFaoe8j5P5DP64qo05S2RhVxdGj8c0vmclWroeg3+tTbLKElAcNK3CL9T/Qc16No/gDTLMq96z3sg7N8qf98j+prr4Yo4Y1jhRY41GFVRgD6CuqnhG9Zni4rPoRXLh1d93sYPhfwvZ6DHvX99eMMNMw6eyjsK6Ciiu2MVFWR8zVrTrSc6ju2FFFFUZhRRRQAVxHxZ/wCQHaf9fI/9Bau3riPiz/yA7T/r5H/oLVjX/hs78r/3un6nlVFFFeUfeBXsPwy/5FWP/rq/868er2H4Zf8AIqx/9dX/AJ104T4zxc+/3Veq/U6uiiivSPjgrxHx1/yNmo/74/8AQRXt1cV4q8DjVbya9srry7mTlklGUJxjgjkdPeufEwlONonrZPiaeGrOVV2TVvxR5RRWzqfhnV9NLG4spDGP+WkY3r+Y6fjWPXmuLjoz7KnVhUXNBpryEooopFhRRRQAUUVu6P4V1bVSphtmihP/AC1m+Rfw7n8BTjFydkRUqwpLmqOyMMAkgAEk8ACvUvAHhRrDbqWpJi6I/dRH/lmD3Pv/AC/lp+GfB9jopWeT/Sbwf8tHHCf7o7fXrXTV3UMNyvmlufL5lnHtk6VDbq+//ACiiiuw+fCiiigAooooAK8p+LP/ACH7X/r1H/obV6tXlPxZ/wCQ/a/9eo/9DaufFfwz18j/AN7XoziaKKK8w+0Cvf8ARP8AkC2H/XvH/wCgivAK9/0T/kC2H/XvH/6CK7MHuz53iH4IerLtFFFd58sFFFFABRRRQAV4Fr3/ACHNR/6+ZP8A0I177XgWvf8AIc1H/r5k/wDQjXHjNkfRcPfxJ+iKFFFFcB9Sbfgr/katN/66/wBDXuNeHeCv+Rq03/rr/Q17jXoYP4WfJ8Qfx4+n6sKKKK6zwArP17S4tY0uazn43jKN/cYdDWhRSaTVmVCcoSUovVHz1e2stldzW1wuyaJirD3qCvTvifoPnQDVrZP3kQCzgDqvZvw/l9K8xryatN05WPvsDi44uiqi36+oVoaDqk2janDeW/JU4dc8Op6g1n0Vmm07o6ZwjOLjJXTPoTT7yHULKG6tW3QyruU/0PvVivKPhx4h/s+9/s66fFrcN8hJ4R/8D/h716vXrUqiqRufB4/BywlVwe3T0Csbxl/yK2pf9cTWzWN4y/5FbUv+uJq5/CzHC/xoeq/M8Mooorxj9ECvQ/hD/wAfGp/7sf8ANq88r0P4Q/8AHxqf+7H/ADatsP8AxEedm/8Auc/l+aPSaKKK9U+FCiiigAqG9tYL61ltrqMSQyDaympqKNxpuLujxbxb4WudCnMiBprBj8kuPu+zeh/nXOV9FSxpLG0cqK6MMMrDII9xXB+IPh9DOzTaNIIHPJgk5Q/Q9R+v4VwVcK1rA+pwGdxklDEaPv8A5nmNFaOqaLqOlsRfWksSj+PGVP8AwIcVnVxtNaM9+E4zXNF3QUUUUFBRRRQAUUqqWYKoJY9AB1rd0zwlrOoEGOzeKM/xz/IP15P4CnGLlsjOpWp0lepJL1O5+E//ACL1z/19N/6AldrWF4O0N9A0t7aWZZneQykquAMgDHv0rdr1qUXGCTPg8fUjVxE5wd02FFFFaHIFFFFABXK/Ez/kVZf+uqfzrqq5X4mf8irL/wBdU/nWdb4GdeA/3mn6o8doooryD9ACvVPhL/yBbz/r4/8AZRXldeqfCX/kC3n/AF8f+yiujC/xDyc7/wB0fqjuKKKK9M+KCiiigAooooAKKKKACiiigAooooAK8G8T/wDIx6p/19S/+hGvea8G8T/8jHqn/X1L/wChGuPGfCj6Hh7+LP0MyiiiuA+qCiiigAooooAKKKKACiiigAr1z4Wf8iy//Xw/8lryOvXPhZ/yLL/9fD/yWunC/wAQ8fPf91+aOwooor0j4wKKKKACiiigArwbxN/yMeqf9fUv/oRr3mvBvE3/ACMeqf8AX1L/AOhGuPGfCj6Hh7+LP0MyiiiuA+qNnwf/AMjRpn/XZa9zrwzwf/yNGmf9dlr3OvQwfws+T4g/jQ9P1Ciiius8AKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigCO4hiuIWiuIklib7yOoZT9Qapf2FpH/QKsP8AwHT/AArRopNJ7lxqTjpFtGd/YWkf9Aqw/wDAdP8ACj+wtI/6BVh/4Dp/hWjRS5Y9ivb1P5n95nf2FpH/AECrD/wHT/CtEDAwOlFFNJLYiU5T+J3CiiimSFFFFABVO60vT7uXzbqxtZ5cY3yQqxx9SKuUUmk9yoycXeLsZ39haR/0CrD/AMB0/wAKP7C0j/oFWH/gOn+FaNFLlj2L9vU/mf3md/YWkf8AQKsP/AdP8KntNOsrJmazs7a3ZhgmKJUJHvgVaop8qXQTqzkrOT+8KKKKZmFFFFABRRRQBHcQQ3MLQ3MUcsTfeSRQynvyDVL+wtI/6BVh/wCA6f4Vo0Umk9y41JxVotozv7C0j/oFWH/gOn+FH9haR/0CrD/wHT/CtGilyx7Fe3qfzP7yvZ2NpZBhZ2sFuG5YRRhM/XFWKKKpKxm5OTuwooooEFVrzT7K9ZWvLS3uGUYUyxK5H0yKs0UNX3HGTi7p2M7+wtI/6BVh/wCA6f4Uf2FpH/QKsP8AwHT/AArRoqeWPY09vU/mf3md/YWkf9Aqw/8AAdP8KP7C0j/oFWH/AIDp/hWjRRyx7B7ep/M/vM7+wtI/6BVh/wCA6f4Uf2FpH/QKsP8AwHT/AArRoo5Y9g9vU/mf3md/YWkf9Aqw/wDAdP8ACj+wtI/6BVh/4Dp/hWjRRyx7B7ep/M/vM7+wtI/6BVh/4Dp/hR/YWkf9Aqw/8B0/wrRoo5Y9g9vU/mf3kdvBFbQrFbxRxRL91I1CqPoBUlFFUZttu7CmyxpNE0cyLJG4wysMgj0Ip1FAk7Gd/YWkf9Aqw/8AAdP8KP7C0j/oFWH/AIDp/hWjRU8sexr7ep/M/vM7+wtI/wCgVYf+A6f4Uf2FpH/QKsP/AAHT/CtGijlj2D29T+Z/eZ39haR/0CrD/wAB0/wo/sLSP+gVYf8AgOn+FaNFHLHsHt6n8z+8zv7C0j/oFWH/AIDp/hR/YWkf9Aqw/wDAdP8ACtGijlj2D29T+Z/eZ39haR/0CrD/AMB0/wAKVNE0qN1dNMsVdTkMLdAQfXpWhRRyx7B7ap/M/vCiiiqMgooooAKKKKACo7m3huoTFcwxzRN1SRQyn8DUlFA02ndGd/YWkf8AQKsP/AdP8KP7C0j/AKBVh/4Dp/hWjRU8sexp7ep/M/vM7+wtI/6BVh/4Dp/hVq0s7azRks7eG3RjkrEgQE+vFT0U1FLZEyqzkrSbYUUUUyAooooAKKKKACiiigAooooAKKKKACiiigBHRZEZHUMjDBUjII9Kz/7C0j/oFWH/AIDp/hWjRSaT3LjUlD4XYzv7C0j/AKBVh/4Dp/hR/YWkf9Aqw/8AAdP8K0aKXLHsV7ep/M/vM7+wtI/6BVh/4Dp/hR/YWkf9Aqw/8B0/wrRoo5Y9g9vU/mf3lBdF0tfu6bZD6QJ/hVmG0t4P9TBFH/uIB/KpqKaSRLqTlu2FFFFMgKKKKACiiigAooooAKKKKACoLuztrxAl5bw3CA5CyoHAPrzU9FG403F3Rnf2FpH/AECrD/wHT/Cj+wtI/wCgVYf+A6f4Vo0VPLHsae3qfzP7zO/sLSP+gVYf+A6f4VctbaC0iEVrDFDEDnZGgUZ+gqWimopbEyqTkrSbYUUUUyAooooAKp3mlWF6Sbuyt5mP8Txgn8+tXKKTSe5UZSi7xdjm7jwToM3IszGfVJWH6ZxVN/h7ozHh7tfpIP6iuwoqHRg+h0xx+JjtUf3nHL8O9HHWW9P1kX/4mrUHgXQoiC1tJL/vyt/TFdPRQqMF0HLMMVLeo/vKFjo2m2BBtLG3iYfxBBu/PrV+iirSS2OWU5Td5O7CiiimSFFFFABRRRQAUUUUAFVbvTbG8kEl5ZW07gbQ0sSsQPTJFWqKTV9xxk4u8XYzv7C0j/oFWH/gOn+FH9haR/0CrD/wHT/CtGilyx7Gnt6n8z+8zv7C0j/oFWH/AIDp/hWgiLGipGoVFGFVRgAegpaKaSWxMqkp/E7hRRRTICiiigAooooAKoSaLpUjs8mmWTOxJZmgQkk9zxV+ik0nuVGcofC7Gd/YWkf9Aqw/8B0/wo/sLSP+gVYf+A6f4Vo0UuWPYv29T+Z/eUYNH0yCVZYNOs45VOVdIFBB9iBV6iimklsRKcpaydwooopkhRRRQAkiLIjJIoZGBDKwyCPQ1n/2FpH/AECrD/wHT/CtGik0nuXGpKHwuxnf2FpH/QKsP/AdP8KP7C0j/oFWH/gOn+FaNFLlj2K9vU/mf3md/YWkf9Auw/8AAdP8K0QMDA6UUU0ktiJTlP4ncKZNFHPE0U8aSRsMMjgEEe4NPopkp21Rnf2FpH/QKsP/AAHT/Cj+wtI/6BVh/wCA6f4Vo0VPLHsa+3qfzP7zO/sLSP8AoFWH/gOn+FWLOws7IsbO0t7cv97yo1TP1wKs0U1FLoJ1ZyVnJhRRRTMwooooAKKKKACiiigAIBBBGQexrJvPDej3hJn063LHqUXYT+K4rWopOKe5cKk6bvBtehyk3gHQ5D8kc8Xskp/rmoP+Fd6Pn/XXv/fxf/ia7Kis/Y0+x1LMcUv+Xj+85GP4faKp+Y3T/wC9IP6Cr1v4N0GAgiwVz6yOzfoTiugopqlBdCZY7Ey3qP7ytaWFpZjFpawQD/pnGF/lVmiitErHK5OTu2FFFFAgooooAKKKKACorq2gu4jFdQxTRE5KSIGH5GpaKBptO6M7+wtI/wCgVYf+A6f4Uf2FpH/QKsP/AAHT/CtGip5Y9jT29T+Z/eZ39haR/wBAqw/8B0/wq1aWdtZoUs7eG3RjkrEgQE+vFT0U1FLZEyqzkrSbYUUUUyAooooAKKKKACiiigAooooAKKKKACqEujaXLI8kum2TyOSzM0CkknqScVfopNJ7lRnKPwuxnf2FpH/QKsP/AAHT/Cj+wtI/6BVh/wCA6f4Vo0UuWPYv29T+Z/eZ39haR/0CrD/wHT/Cj+wtI/6BVh/4Dp/hWjRRyx7B7ep/M/vM7+wtI/6BVh/4Dp/hR/YWkf8AQKsP/AdP8K0aKOWPYPb1P5n95nf2FpH/AECrD/wHT/Cj+wtI/wCgVYf+A6f4Vo0Ucsewe3qfzP7zO/sLSP8AoFWH/gOn+FH9haR/0CrD/wAB0/wrRoo5Y9g9vU/mf3md/YWkf9Aqw/8AAdP8Kt2trb2cXl2kEUEec7YkCjPrgVNRTUUtiZVJyVpNsKKKKZAUUUUAFFFFABVCXRtLlkeSXTbJ5HJZmaBSST1JOKv0Umk9yozlH4XYzv7C0j/oFWH/AIDp/hR/YWkf9Aqw/wDAdP8ACtGilyx7F+3qfzP7yjDo+mQSrLDp1nHIpyrpAoIPsQKvUUU0ktiJTlLWTuFFFFMkKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiuf8AiBrs3hnwfqWsW0Uc01qisscmdrZYDnH1pxTk0kKUlFOT6HQUV4le/GLU4fC326DTtPnvVv5LU+VIzQvGkIkZ1PXjIFWdT+LGqrq89jpthYPm+srSB5mcAi4jZstj0IHTtW/1ap2Of63T7nslFedxfEC5n+DzeMo7KFbpYy32dmJTcJvLPPXHGa5Y/GHVofDy6tcaXYta/ariy86JnKPIsO+IrnszZB+nFSsPOV7LrYqWJpxtd7q57bRXGeL/ABTqHh3RPDdxJa27Xmo31tZXMZJ2xmRWLFeexXjNcZpPxN8Tao/hr7NpujqmtTTQJvkkBRom+bOO20rjrznpRGhKSuhyxEIvle57NRXjUvxc1BZfFqjT7TbpUbzWZLN++RbjySW5988V0fgTx9N4o03xHeCC2Eem/wCpaMtiT92W5z7jFEqE4q7Qo4inJ8qZ6FRXhafGPWpdE0+5gstGe5uxdzFVkkIiS3i8xkYdQ5Gcc4wV9eNCz+Ll/eeMtN0uHTbQ2141iNm9vPC3EKyM47EJnnp2qnhai6ErF0n1PZKK8v8Aib8SL7wfrNzZQWVtOo05LuAuWy8huFjKHB6bST+VYn/C4dSe4Bh06za2eaWJGJbJ2QCT19SBSjh6klzJDliacZcrep7XRXk0/wATdS8nwUY7fS4G16J5JXupHWOIqRwCM8noM9yK1vAXjfVPEfijUNIu7G3g/s2ORbx493EwmZFUZPQqu6k6E0rsaxEJPlX9dT0OiiisTcKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigArD8b6B/wlHhXUNG+0/ZftaBfO8vfswwb7uRnp61uUU03F3QpRUk0zz3xp8NIvEtno1qmpGwg063ni2wQY81pIwgY4YYAIyRzuBIyM5rAHwauEZJYfEgW5jnsrhJGsNwDW0RQZHmc5yD7YxzXsNFaxxFSKsmYyw1OTu0cJH8PUi+FbeC49SbDIVN40OeTL5hOzd68YzWTb/CfZ4en0+fWvNnn1SPUpJ/sgVcqPuBN/GfXP4V6jRSVea6+Y3Qpu110t8jmfH/AIXbxVpVpbxXn2O5s7yO9glMfmKJEzgMuRkfMe9c/onwxTSl8IhNUZzoUtxM5MH/AB8NLjOPm+QDHvXo1FJVZxXKnoVKjCUuZrU8bT4JMsV6P+EkkaS8tpLeVmtCR80wlyo8zgZA47nJrr/CXgRfDtp4ggS/Ey6qcjEGwQ/IV6bjnrntXa0VUq9SSs2THD04O6R5Rf8Awg83w9oWn2msrBc6bDc273BtMidJ1KsSu/hgpwDk1Ivwiji1a3vINYZY4LnTp0ja2ycWkRj2lt4+/wBc449DXqdFH1ip3F9Wpdv62OE8dfDyHxb4l0fVZb8262Aw8Hk7/OG4MBncMcj0Nc3p/wAFxZ6RY2X9vF2tri5naU2eN/mxLHjG/jbsz1Oc9q9foojXqRXKnoOWHpyfM1qeVWnws1O2Hhxl8URNNoZlW3ZtMUgxuFG0qZMZGG+Y5+8PSux8NeFxoniHxHqguhN/bE0c3l+Vt8rapGM5O7Oc9BXSUVMq05aN/wBbjjRhB3S/q1vyCiiiszUKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//Z" alt="Aaron Wiley — District 21" />
  </div>

  <!-- LEGAL -->
  <div class="legal-footer">
    <p>Paid for by Utah for Wiley &nbsp;·&nbsp; <a href="https://wileyfor21.com">wileyfor21.com</a><br>
    You're receiving this because you participated as a delegate in the Salt Lake County Democratic Convention.<br>
    <a href="#">Unsubscribe</a> &nbsp;·&nbsp; <a href="#">Update Preferences</a></p>
  </div>

</div>
</body>
</html>`;
}

function generatePostConventionNomineeTextMessage(firstName) {
  return `${firstName} — I'm still riding the wave from Saturday's convention, and I had to reach out.\n\nI am humbled and honored to be your Democratic nominee for Utah House District 21.\n\nBefore anything else — I want to recognize the other candidates who ran alongside me. They brought real passion and real ideas, and our party is stronger for it. I'm proud to call them friends.\n\nNow the real work begins. We're heading into the general election with energy, momentum, and a growing coalition — and I need you in this fight.\n\nWill you join the team?\n\n👉 wileyfor21.com/join\n\nWith deep gratitude and West Side pride,\n— Aaron Wiley | Democratic Nominee, HD 21`;
}

function DelegateConventionThankYouSection({ delegates }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [copyState, setCopyState] = useState("idle");
  const [showDeferred, setShowDeferred] = useState(false);
  const [mode, setMode] = useState("email");

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
  const emailHTML = selected ? generateConventionEmailHTML(firstName) : null;
  const textMsg = selected ? generateConventionTextMessage(firstName) : "";

  const SUBJECT = "Today Is The Day. Thank You for Standing With Me. ⭐";

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
          <h2 className="font-bold text-navy text-lg mb-0.5">Convention Thank-You — April 11, 2026</h2>
          <p className="text-xs text-gray-400">Personalized convention day thank-you with endorsements, snack notice &amp; voting reminder.</p>
        </div>
        <div className="flex items-center gap-2">
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
                <div className="text-3xl mb-3">{mode === "email" ? "⭐" : "💬"}</div>
                <p className="text-sm text-gray-400 font-medium">Select a delegate to preview their {mode === "email" ? "convention thank-you email" : "text message"}</p>
              </div>
            </div>
          ) : mode === "email" ? (
            <div>
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
                  title="Convention thank-you email preview"
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
              <div className="bg-gray-100 rounded-2xl p-6 min-h-[200px]">
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-blue-500 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-3 leading-relaxed shadow-sm whitespace-pre-line">
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

// ─── Post-Convention Nominee Section ─────────────────────────────────────────

function PostConventionNomineeSection({ delegates }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [copyState, setCopyState] = useState("idle");
  const [mode, setMode] = useState("email");

  const inviteable = delegates
    .filter((d) => (mode === "email" ? d.email : d.phone) && !d.isVacant && !d.isOpposingCandidate)
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
  const emailHTML = selected ? generatePostConventionNomineeEmailHTML(firstName) : null;
  const textMsg = selected ? generatePostConventionNomineeTextMessage(firstName) : "";

  const SUBJECT = "14 Days Later — We're Still Just Getting Started ⚡";

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
          <h2 className="font-bold text-navy text-lg mb-0.5">Post-Convention Nominee Thank-You</h2>
          <p className="text-xs text-gray-400">Personalized thank-you sent after winning the nomination — honors fellow candidates, accepts the nomination, and calls delegates to join the general election fight.</p>
        </div>
        <div className="flex items-center gap-2">
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
          <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-3 py-1.5 rounded-full border border-blue-100">
            {inviteable.length} delegates with {mode === "email" ? "email" : "phone"}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: delegate list */}
        <div className="lg:w-72 flex-shrink-0">
          <input
            type="text"
            placeholder="Search delegates…"
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
                <div className="font-semibold leading-snug">{d.name}</div>
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
                <div className="text-3xl mb-3">{mode === "email" ? "⭐" : "💬"}</div>
                <p className="text-sm text-gray-400 font-medium">Select a delegate to preview their {mode === "email" ? "nominee thank-you email" : "text message"}</p>
              </div>
            </div>
          ) : mode === "email" ? (
            <div>
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
                  title="Post-convention nominee email preview"
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
              <div className="bg-gray-100 rounded-2xl p-6 min-h-[200px]">
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-blue-500 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-3 leading-relaxed shadow-sm whitespace-pre-line">
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

        {/* Convention Thank-You Email Tool */}
        <DelegateConventionThankYouSection delegates={delegates} />

        {/* Post-Convention Nominee Thank-You */}
        <PostConventionNomineeSection delegates={delegates} />
      </main>
    </div>
  );
}

