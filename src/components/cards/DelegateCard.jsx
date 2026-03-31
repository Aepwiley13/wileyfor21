import { useState, useRef } from "react";
import { daysSince, calculateNextContactDate } from "@/lib/utils";
import StageBadge from "@/components/ui/StageBadge";
import ConflictWarningCard from "./ConflictWarningCard";
import { CALL_SCRIPTS, TEXT_TEMPLATES, MESSAGE_TOPICS } from "@/lib/scripts";
import { callScripts, stageCoaching } from "@/data/surveyQuestions";
import { OUTCOMES, CANDIDATES, ISSUES, STAGES, NEXT_ACTIONS, ACTIVE_CANDIDATES } from "@/lib/constants";
import { db, useMock } from "@/lib/firebase";

const SURVEY_BASE_URL = "https://wileyfor21.com/delegate/survey";

// ── helpers ──────────────────────────────────────────────────────────────────

function getInitialTopicId(stage, wasOrdSupporter) {
  if (wasOrdSupporter) return "ord";
  return null; // stage-based default message
}

function personalMessage(delegate, story, volunteerName) {
  const name = delegate.firstName || delegate.name?.split(" ")[0] || delegate.name;
  if (story?.polishedMessage) {
    return story.polishedMessage.replace(/\[DELEGATE_NAME\]/g, name);
  }
  const vol = volunteerName || "your volunteer";
  let msg = `Hi ${name}, this is ${vol} — a neighbor and volunteer for Aaron Wiley's campaign for House District 21.`;
  if (story?.whySupporting) msg += ` I'm supporting Aaron because ${story.whySupporting}.`;
  if (story?.issues) msg += ` The issues that matter most to me: ${story.issues}.`;
  if (story?.aboutMe) msg += ` ${story.aboutMe}.`;
  msg += `\n\nThe convention is April 11 and I'd love for you to support him. wileyfor21.com`;
  return msg;
}

function stageBasedMessage(delegate, volunteerName) {
  const name = delegate.firstName || delegate.name?.split(" ")[0] || delegate.name;
  const vol = volunteerName || "your volunteer";
  const stage = delegate.stage;
  let t;
  if (stage === "leaning" || stage === "engaged") t = TEXT_TEMPLATES.followUp;
  else if (stage === "committed" || stage === "locked") t = TEXT_TEMPLATES.finalPush;
  else t = TEXT_TEMPLATES.firstOutreach;
  return t.replace(/\[NAME\]/g, name).replace(/\[YOUR NAME\]/g, vol);
}

function topicMessage(topic, delegate, volunteerName) {
  const name = delegate.firstName || delegate.name?.split(" ")[0] || delegate.name;
  const vol = volunteerName || "your volunteer";
  return topic.text.replace(/\[NAME\]/g, name).replace(/\[YOUR NAME\]/g, vol);
}

function buildMapsUrl(delegate) {
  const parts = [delegate.address, delegate.city, delegate.state, delegate.zip].filter(Boolean);
  if (!parts.length) return null;
  return `https://maps.google.com/?q=${encodeURIComponent(parts.join(", "))}`;
}

function buildCalendarUrl(delegate) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const end = new Date(tomorrow.getTime() + 30 * 60 * 1000);
  const fmt = (d) =>
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0") +
    "T" +
    String(d.getHours()).padStart(2, "0") +
    String(d.getMinutes()).padStart(2, "0") +
    "00";
  const text = encodeURIComponent(`Follow up with ${delegate.name} — Aaron Wiley HD21`);
  const details = encodeURIComponent(
    `Outreach for Aaron Wiley HD21.\nDelegate: ${delegate.name} | ${delegate.precinct} | ${delegate.role}`
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(tomorrow)}/${fmt(end)}&details=${details}`;
}

// ── sub-components ────────────────────────────────────────────────────────────

function ScriptLine({ line }) {
  // Highlight [PLACEHOLDER] parts in amber
  const parts = line.split(/(\[[^\]]+\])/g);
  return (
    <p className={`text-sm leading-snug ${line.startsWith("[") && !line.includes("]") ? "text-gray-400 italic" : "text-gray-700"}`}>
      {parts.map((part, i) =>
        /^\[.+\]$/.test(part) ? (
          <span key={i} className="bg-amber-100 text-amber-800 font-semibold px-0.5 rounded">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </p>
  );
}

function aaronRankLabel(rankings) {
  const rank = rankings?.["Aaron Wiley"];
  if (!rank) return { text: "Not ranked", cls: "text-amber-600 font-semibold" };
  if (rank === 1) return { text: "#1 — Top choice", cls: "text-green-700 font-bold" };
  if (rank === 2) return { text: "#2 — Strong pickup", cls: "text-blue-700 font-semibold" };
  return { text: `#${rank}`, cls: "text-gray-600 font-semibold" };
}

function IntelStrip({ delegate }) {
  const rankInfo = aaronRankLabel(delegate.candidateRankings);

  const days = delegate.lastContactedAt ? daysSince(delegate.lastContactedAt) : null;
  const lastContactColor = days === null ? "text-amber-600 font-bold" :
    days > 14 ? "text-red-600 font-bold" :
    days > 7 ? "text-amber-600 font-semibold" : "text-gray-700";
  const lastContactText = days === null ? "Never" : `${days}d ago`;

  const priority = delegate.isPLEO
    ? { label: "HIGH — PLEO x3", cls: "text-amber-700 font-bold" }
    : delegate.wasOrdSupporter
    ? { label: "HIGH — Ord lead", cls: "text-purple-700 font-bold" }
    : delegate.stage === "leaning" || delegate.stage === "committed" || delegate.stage === "locked"
    ? { label: "HIGH", cls: "text-navy font-bold" }
    : { label: "Standard", cls: "text-gray-500" };

  return (
    <div className="grid grid-cols-4 gap-1 py-2 px-0 border-t border-b border-gray-100 my-2 text-xs">
      <div>
        <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Aaron's Rank</p>
        <p className={rankInfo.cls}>{rankInfo.text}</p>
      </div>
      <div>
        <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Last Contact</p>
        <p className={lastContactColor}>{lastContactText}</p>
      </div>
      <div>
        <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Issues Raised</p>
        {delegate.issuesRaised?.length ? (
          <div className="flex flex-wrap gap-0.5">
            {delegate.issuesRaised.slice(0, 3).map((issue) => (
              <span key={issue} className="bg-navy/10 text-navy text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                {issue}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 italic">None yet</p>
        )}
      </div>
      <div>
        <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Priority</p>
        <p className={priority.cls}>{priority.label}</p>
      </div>
    </div>
  );
}

// ── Ranking editor ────────────────────────────────────────────────────────────

function RankingEditor({ rankings, onChange }) {
  // rankings = { "Aaron Wiley": 1, "Darin Mann": 2, ... }
  function setRank(candidate, rank) {
    const next = { ...rankings };
    // Clear whoever currently holds this rank
    Object.keys(next).forEach((c) => { if (next[c] === rank) delete next[c]; });
    // Toggle off if same rank clicked again
    if (rankings[candidate] === rank) {
      delete next[candidate];
    } else {
      next[candidate] = rank;
    }
    onChange(next);
  }

  return (
    <div className="space-y-1.5">
      {ACTIVE_CANDIDATES.map((candidate) => {
        const currentRank = rankings?.[candidate];
        const isAaron = candidate === "Aaron Wiley";
        return (
          <div key={candidate} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${isAaron ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}>
            <span className={`text-xs flex-1 truncate ${isAaron ? "font-bold text-green-800" : "text-gray-700"}`}>
              {isAaron ? "★ " : ""}{candidate}
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((rank) => (
                <button
                  key={rank}
                  type="button"
                  onClick={() => setRank(candidate, rank)}
                  className={`w-6 h-6 rounded text-[11px] font-bold transition-colors ${
                    currentRank === rank
                      ? isAaron
                        ? "bg-green-600 text-white"
                        : "bg-navy text-white"
                      : "bg-white border border-gray-300 text-gray-500 hover:border-navy/40"
                  }`}
                >
                  {rank}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Survey helpers ─────────────────────────────────────────────────────────────

function getSurveyStatus(delegate) {
  if (delegate.survey?.completed) return "completed";
  if (delegate.survey?.startedAt) return "started";
  if (delegate.surveySentAt) return "sent";
  return "not_sent";
}

const SURVEY_STATUS_STYLES = {
  completed: { label: "Survey ✓", cls: "bg-green-100 text-green-700" },
  started: { label: "Survey in progress", cls: "bg-yellow-100 text-yellow-700" },
  sent: { label: "Survey sent", cls: "bg-blue-100 text-blue-700" },
  not_sent: { label: "Survey not sent", cls: "bg-gray-100 text-gray-500" },
};

const LIVED_FLAG_TALKING_POINTS = {
  "housing-affected": "Housing is personal — they or someone in their household has been directly affected by affordability or displacement.",
  "crime-affected": "Crime and safety hit close to home for them — ask what's been happening in their neighborhood specifically.",
  "disability-affected": "Disability services matter to their household — lead with Aaron's progressive tax / disability funding position.",
  "dv-affected": "Domestic violence has touched their household — be sensitive, lead with Aaron's DV shelter funding stance.",
  "senior-affected": "Senior care is personal — mention Aaron's property tax deferral expansion and Medicaid protection.",
  "environment-affected": "Air or water quality has affected their health — lead with the Inland Port or Great Salt Lake position.",
  "nonprofit-reliant": "They rely on a Westside nonprofit — ask which one and mention Aaron's sustained multi-year funding plan.",
  "immigration-affected": "Immigration is personal to them — lead with Aaron's opposition to expanded ICE enforcement.",
};

function SurveyPanel({ delegate, onSurveySent }) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const status = getSurveyStatus(delegate);
  const { label, cls } = SURVEY_STATUS_STYLES[status];

  const surveyUrl = `${SURVEY_BASE_URL}?delegate=${delegate.id}`;

  async function handleSendSurvey() {
    setSending(true);
    try {
      await navigator.clipboard.writeText(surveyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);

      // Write surveySentAt to Firestore
      if (!useMock && db) {
        const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        await setDoc(
          doc(db, "delegates", delegate.id),
          { surveySentAt: serverTimestamp() },
          { merge: true }
        );
        onSurveySent?.();
      }
    } finally {
      setSending(false);
    }
  }

  const talkingPoint = delegate.livedExperienceFlags?.length
    ? LIVED_FLAG_TALKING_POINTS[delegate.livedExperienceFlags[0]]
    : null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
            {label}
          </span>
          {/* Issue tags from Cloud Function enrichment */}
          {delegate.issueTags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-navy/10 text-navy"
            >
              {tag}
            </span>
          ))}
          {delegate.engagementTier === "volunteer" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-coral/10 text-coral">
              Wants to volunteer
            </span>
          )}
        </div>
        {status !== "completed" && (
          <button
            onClick={handleSendSurvey}
            disabled={sending}
            className="text-xs font-medium text-navy border border-navy/20 px-2.5 py-1 rounded-lg hover:bg-navy/5 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {copied ? "Copied ✓" : sending ? "…" : "Copy survey link"}
          </button>
        )}
      </div>

      {/* Talking point — only shown after survey is completed */}
      {talkingPoint && (
        <div className="mt-1 pt-2 border-t border-gray-200">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
            Talking point
          </p>
          <p className="text-xs text-gray-600 leading-snug">{talkingPoint}</p>
        </div>
      )}
    </div>
  );
}

// ── Calling All Delegates HTML template row ───────────────────────────────────

const CAD_SUBJECT = "Aaron Wiley for HD 21 — Calling All Delegates";

function CallAllDelegatesRow({ email, firstName, onLogged }) {
  const [status, setStatus] = useState("idle"); // idle | copying | done | error

  async function handleCopy() {
    setStatus("copying");
    try {
      const res = await fetch("/emails/calling-all-delegates.html");
      let html = await res.text();
      if (firstName) html = html.replace(/\[First Name\]/g, firstName);

      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }) }),
      ]);

      setStatus("done");
      onLogged?.();

      // Open Gmail compose addressed to this delegate
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(CAD_SUBJECT)}`;
      window.open(gmailUrl, "_blank", "noopener");

      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <div className="mb-3 bg-white border border-green-200 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-navy truncate">Calling All Delegates</p>
          <p className="text-xs text-gray-400 truncate">Subject: {CAD_SUBJECT}</p>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          <a
            href="/emails/calling-all-delegates.html"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-coral font-semibold hover:underline"
          >
            Preview ↗
          </a>
          {email && (
            <button
              onClick={handleCopy}
              disabled={status === "copying"}
              className="text-xs font-bold text-white px-3 py-1 rounded-lg transition-colors disabled:opacity-60"
              style={{ backgroundColor: status === "done" ? "#034A76" : status === "error" ? "#e63946" : "#15803d" }}
            >
              {status === "copying" && "Copying…"}
              {status === "done" && "Copied! ✓"}
              {status === "error" && "Try again"}
              {status === "idle" && "Copy & Open Gmail →"}
            </button>
          )}
        </div>
      </div>
      {status === "done" && (
        <p className="text-xs text-green-700 mt-1.5">
          HTML copied — paste it into the Gmail compose window that just opened.
        </p>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function DelegateCard({ delegate, onOpenLog, onOpenBriefing, volunteerName, onSurveySent, onCallScriptSave }) {
  const [expandedAction, setExpandedAction] = useState(null); // 'text' | 'email' | null
  const [topicId, setTopicId] = useState(() => getInitialTopicId(delegate.stage, delegate.wasOrdSupporter));
  const textareaRef = useRef(null);

  // ── Volunteer story (persisted to localStorage) ──
  const STORY_KEY = "wileyfor21_volunteer_story";
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [volunteerStory, setVolunteerStory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORY_KEY)) || null; } catch { return null; }
  });
  const [storyDraft, setStoryDraft] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORY_KEY)) || { whySupporting: "", issues: "", aboutMe: "" }; } catch { return { whySupporting: "", issues: "", aboutMe: "" }; }
  });
  const [improving, setImproving] = useState(false);
  const [polishedMessage, setPolishedMessage] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORY_KEY))?.polishedMessage || ""; } catch { return ""; }
  });
  const [showPolished, setShowPolished] = useState(() => {
    try { return !!JSON.parse(localStorage.getItem(STORY_KEY))?.polishedMessage; } catch { return false; }
  });

  // ── Inline call script wizard state ──
  const wizardSteps = callScripts.connect ?? [];
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardNotes, setWizardNotes] = useState({});
  const [wizardReviewing, setWizardReviewing] = useState(false);
  const [wizardSaved, setWizardSaved] = useState(false);

  // ── Social links state ──
  const [socialOpen, setSocialOpen] = useState(false);
  const [socialForm, setSocialForm] = useState({
    facebook: delegate.facebook || "",
    twitter: delegate.twitter || "",
    instagram: delegate.instagram || "",
  });
  const [socialSaving, setSocialSaving] = useState(false);

  async function saveSocials() {
    setSocialSaving(true);
    if (!useMock && db) {
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "delegates", delegate.id), {
        facebook: socialForm.facebook || null,
        twitter: socialForm.twitter || null,
        instagram: socialForm.instagram || null,
      });
    }
    setSocialSaving(false);
    setSocialOpen(false);
  }

  // ── Ranking state ──
  const [rankings, setRankings] = useState(delegate.candidateRankings || {});
  const [rankingOpen, setRankingOpen] = useState(false);
  const [rankingSaving, setRankingSaving] = useState(false);

  async function saveRankings(next) {
    setRankings(next);
    setRankingSaving(true);
    if (!useMock && db) {
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "delegates", delegate.id), { candidateRankings: next });
    }
    setRankingSaving(false);
  }

  // ── Inline contact log state ──
  const [logOpen, setLogOpen] = useState(false);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logSaved, setLogSaved] = useState(false);
  const [logForm, setLogForm] = useState({
    outcome: "",
    issuesRaised: [],
    exactWords: "",
    mentionedOtherCandidate: false,
    otherCandidateNamed: "",
    nextAction: "",
    candidateRankings: delegate.candidateRankings || {},
  });
  function setLog(key, val) { setLogForm((f) => ({ ...f, [key]: val })); }
  function toggleLogIssue(issue) {
    setLogForm((f) => ({
      ...f,
      issuesRaised: f.issuesRaised.includes(issue)
        ? f.issuesRaised.filter((i) => i !== issue)
        : [...f.issuesRaised, issue],
    }));
  }
  async function submitLog() {
    if (!logForm.outcome) return;
    setLogSubmitting(true);
    const stageOrder = STAGES;
    const currentIdx = stageOrder.indexOf(delegate.stage);
    let stageAfter = delegate.stage;
    if (logForm.outcome === "hostile") stageAfter = "not_winnable";
    else if (stageAfter === "unknown" && logForm.outcome !== "no_answer") stageAfter = "identified";

    const logEntry = {
      delegateId: delegate.id,
      delegateName: delegate.name,
      method: wizardActive || wizardSaved ? "call" : "call",
      outcome: logForm.outcome,
      stageBeforeContact: delegate.stage,
      stageAfterContact: stageAfter,
      leaningToward: logForm.leaningToward,
      issuesRaised: logForm.issuesRaised,
      exactWords: logForm.exactWords,
      mentionedOtherCandidate: logForm.mentionedOtherCandidate,
      otherCandidateNamed: logForm.otherCandidateNamed || "",
      nextAction: logForm.nextAction,
      nextContactDate: calculateNextContactDate(logForm.nextAction),
      timestamp: new Date().toISOString(),
    };
    if (!useMock && db) {
      const { collection, addDoc, doc, updateDoc, arrayUnion, serverTimestamp } = await import("firebase/firestore");
      logEntry.timestamp = serverTimestamp();
      await addDoc(collection(db, "contactLogs"), logEntry);
      const delegateUpdates = {
        lastContactedAt: new Date().toISOString(),
        stage: stageAfter,
        contactHistory: arrayUnion({ date: new Date().toISOString(), method: "call", outcome: logForm.outcome }),
      };
      if (logForm.issuesRaised.length) delegateUpdates.issuesRaised = arrayUnion(...logForm.issuesRaised);
      if (logForm.exactWords) delegateUpdates.exactWordsLogged = arrayUnion({ text: logForm.exactWords, date: new Date().toISOString() });
      if (logForm.candidateRankings) delegateUpdates.candidateRankings = logForm.candidateRankings;
      await updateDoc(doc(db, "delegates", delegate.id), delegateUpdates);
    }
    onCallScriptSave?.(delegate.id);
    setLogSubmitting(false);
    setLogSaved(true);
  }

  function wizardNext() {
    if (wizardStep === wizardSteps.length - 1) setWizardReviewing(true);
    else setWizardStep((s) => s + 1);
  }
  function wizardBack() {
    if (wizardReviewing) setWizardReviewing(false);
    else setWizardStep((s) => Math.max(0, s - 1));
  }
  async function wizardSave() {
    const payload = {
      type: "call_script",
      stage: "connect",
      method: "call",
      notes: wizardNotes,
      delegateId: delegate.id,
      delegateName: delegate.name,
      submittedAt: new Date().toISOString(),
    };
    if (!useMock && db) {
      const { collection, addDoc, doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      payload.submittedAt = serverTimestamp();
      await addDoc(collection(db, "callScriptLogs"), payload);
      await updateDoc(doc(db, "delegates", delegate.id), {
        lastContactedAt: new Date().toISOString(),
      });
    }
    onCallScriptSave?.(delegate.id);
    setWizardSaved(true);
    setLogOpen(true);
  }
  function wizardReset() {
    setWizardActive(false);
    setWizardStep(0);
    setWizardNotes({});
    setWizardReviewing(false);
    setWizardSaved(false);
  }

  if (delegate.isOpposingCandidate) return <ConflictWarningCard delegate={delegate} />;

  const phone = delegate.phone;
  const email = delegate.email;
  const mapsUrl = buildMapsUrl(delegate);
  const calendarUrl = buildCalendarUrl(delegate);

  const selectedTopic = MESSAGE_TOPICS.find((t) => t.id === topicId) || null;
  const currentMessage = volunteerStory && !topicId
    ? personalMessage(delegate, volunteerStory, volunteerName)
    : selectedTopic
    ? topicMessage(selectedTopic, delegate, volunteerName)
    : stageBasedMessage(delegate, volunteerName);

  function handleCall() {
    setWizardActive(true);
    setWizardStep(0);
    setWizardNotes({});
    setWizardReviewing(false);
    setWizardSaved(false);
  }
  function handleText() {
    if (expandedAction === "text") { setExpandedAction(null); setShowStoryForm(false); return; }
    setExpandedAction("text");
    setShowStoryForm(!volunteerStory);
  }
  function handleEmail() {
    if (expandedAction === "email") { setExpandedAction(null); setShowStoryForm(false); return; }
    setExpandedAction("email");
    setShowStoryForm(!volunteerStory);
  }
  async function improveMessage() {
    setImproving(true);
    try {
      const res = await fetch("/.netlify/functions/improve-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whySupporting: storyDraft.whySupporting,
          issues: storyDraft.issues,
          aboutMe: storyDraft.aboutMe,
          volunteerName: volunteerName || "",
        }),
      });
      const data = await res.json();
      if (data.message) {
        setPolishedMessage(data.message);
        setShowPolished(true);
      }
    } catch (err) {
      console.error("Failed to improve message:", err);
    } finally {
      setImproving(false);
    }
  }
  function saveStory() {
    const story = { ...storyDraft, polishedMessage: showPolished ? polishedMessage : null };
    localStorage.setItem(STORY_KEY, JSON.stringify(story));
    setVolunteerStory(story);
    setShowStoryForm(false);
  }
  function skipStory() { setShowStoryForm(false); }

  const emailSubject = `Aaron Wiley for HD 21 — following up, ${delegate.firstName || delegate.name?.split(" ")[0]}`;
  const emailBody = currentMessage +
    `\n\nI'd love to answer any questions or connect you with Aaron directly. Convention is April 11.\n\nLearn more: wileyfor21.com\n\n${volunteerName || "Your volunteer"}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <h3 className="font-condensed font-bold text-navy text-xl leading-tight">
            {delegate.name}
          </h3>
          <p className="text-xs text-gray-500">
            {delegate.precinct} &middot; {delegate.role}
          </p>
          {(delegate.address || delegate.city) && (
            <p className="text-xs text-gray-400 mt-0.5">
              {[delegate.address, delegate.city, delegate.state].filter(Boolean).join(", ")}
            </p>
          )}
          {/* Contact links */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {phone && (
              <a href={`tel:${phone.replace(/\D/g, "")}`} className="text-xs text-navy font-medium hover:underline">
                &#128222; {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="text-xs text-navy font-medium hover:underline truncate max-w-[180px]" title={email}>
                &#9993; {email}
              </a>
            )}
            {/* Social links */}
            {socialForm.facebook && (
              <a href={socialForm.facebook} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 font-medium hover:underline">
                𝐟 Facebook
              </a>
            )}
            {socialForm.twitter && (
              <a href={socialForm.twitter} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 font-medium hover:underline">
                𝕏 Twitter
              </a>
            )}
            {socialForm.instagram && (
              <a href={socialForm.instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 font-medium hover:underline">
                📷 Instagram
              </a>
            )}
            <button onClick={() => setSocialOpen((v) => !v)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors" title="Edit social links">
              ✏️ {socialForm.facebook || socialForm.twitter || socialForm.instagram ? "Edit" : "Add socials"}
            </button>
          </div>
          {/* Badges */}
          <div className="flex gap-2 mt-1 flex-wrap">
            {delegate.isPLEO && (
              <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                &#9733; PLEO x3
              </span>
            )}
            {delegate.wasOrdSupporter && (
              <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                Former Ord supporter
              </span>
            )}
          </div>
        </div>
        <StageBadge stage={delegate.stage} />
      </div>

      {/* ── Social links editor ── */}
      {socialOpen && (
        <div className="border border-gray-200 rounded-lg p-3 mb-2 bg-gray-50">
          <p className="text-xs font-semibold text-gray-700 mb-2">Social links</p>
          <div className="space-y-2">
            {[
              { key: "facebook", label: "𝐟 Facebook", placeholder: "https://facebook.com/..." },
              { key: "twitter", label: "𝕏 Twitter/X", placeholder: "https://twitter.com/..." },
              { key: "instagram", label: "📷 Instagram", placeholder: "https://instagram.com/..." },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
                <input
                  type="url"
                  value={socialForm[key]}
                  onChange={(e) => setSocialForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-navy/30"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setSocialOpen(false)} className="flex-1 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
            <button onClick={saveSocials} disabled={socialSaving} className="flex-1 py-1.5 text-xs font-bold bg-navy text-white rounded-lg hover:bg-navy-dark disabled:opacity-50">
              {socialSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* ── Intelligence strip ── */}
      <IntelStrip delegate={delegate} />

      {/* ── Candidate ranking ── */}
      <div className="mb-2">
        <button
          onClick={() => setRankingOpen((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-semibold text-navy px-2 py-1.5 rounded-lg bg-navy/5 hover:bg-navy/10 transition-colors"
        >
          <span>📊 Candidate Ranking {rankings["Aaron Wiley"] ? `— Aaron is #${rankings["Aaron Wiley"]}` : "— not ranked yet"}</span>
          <span className="text-gray-400">{rankingOpen ? "▲" : "▼"}</span>
        </button>
        {rankingOpen && (
          <div className="mt-2 px-1">
            <p className="text-[10px] text-gray-400 mb-2">Tap a number to set each candidate's rank in this delegate's mind. Only one candidate per rank.</p>
            <RankingEditor
              rankings={rankings}
              onChange={saveRankings}
            />
            {rankingSaving && <p className="text-[10px] text-green-600 mt-1 text-right">Saving...</p>}
          </div>
        )}
      </div>

      {/* ── Primary action buttons ── */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={handleCall}
          className="flex-1 bg-navy text-white text-sm font-medium py-2 rounded-lg hover:bg-navy-dark active:scale-95 transition-all"
          title={phone ? `Call ${phone}` : "No phone on file"}
        >
          &#128222; Call{!phone ? "*" : ""}
        </button>
        <button
          onClick={handleText}
          className={`flex-1 text-sm font-medium py-2 rounded-lg active:scale-95 transition-all ${
            expandedAction === "text" ? "bg-blue-600 text-white" : "bg-navy text-white hover:bg-navy-dark"
          }`}
        >
          &#128172; Text{!phone ? "*" : ""}
        </button>
        <button
          onClick={handleEmail}
          className={`flex-1 text-sm font-medium py-2 rounded-lg active:scale-95 transition-all ${
            expandedAction === "email" ? "bg-green-700 text-white" : "bg-navy text-white hover:bg-navy-dark"
          }`}
        >
          &#9993;&#65039; Email{!email ? "*" : ""}
        </button>
      </div>

      {/* ── Script area: inline call wizard when active, static script otherwise ── */}
      {wizardActive ? (
        <div className="border border-[#3A7D44]/30 rounded-lg mb-2 overflow-hidden">
          {/* Mini progress bar */}
          <div className="flex gap-1 p-2 bg-[#F5F2EC]">
            {wizardSteps.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-colors duration-200"
                style={{ backgroundColor: i <= (wizardReviewing ? wizardSteps.length : wizardStep) ? "#3A7D44" : "#D1D5DB" }} />
            ))}
            <button onClick={wizardReset} className="text-gray-400 hover:text-gray-600 text-base leading-none ml-1">×</button>
          </div>

          <div className="p-3">
            {wizardSaved ? (
              <div className="text-center py-2">
                <p className="text-sm font-semibold text-[#3A7D44]">✅ Notes saved</p>
                <button onClick={wizardReset} className="mt-2 text-xs text-gray-500 underline">Done</button>
              </div>
            ) : wizardReviewing ? (
              <>
                <p className="text-xs font-bold text-[#3A7D44] uppercase tracking-wide mb-2">Review call notes</p>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {wizardSteps.map((s) => (
                    <div key={s.id}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{s.stepLabel}</p>
                      <p className="text-xs text-gray-700">{wizardNotes[s.id] || <span className="italic text-gray-400">No notes</span>}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={wizardBack} className="flex-1 py-2 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">← Back</button>
                  <button onClick={wizardSave} className="flex-1 py-2 text-xs font-bold bg-[#3A7D44] text-white rounded-lg hover:bg-[#2f6838]">Save call log</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold text-[#3A7D44] uppercase tracking-wide mb-0.5">
                  Step {wizardStep + 1} — {wizardSteps[wizardStep].stepLabel}
                </p>
                <p className="text-sm font-bold text-navy mb-2">{wizardSteps[wizardStep].title}</p>
                <div className="border-l-2 border-[#3A7D44] pl-3 bg-[#F5F2EC] rounded-r py-2 pr-2 mb-2">
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {wizardSteps[wizardStep].script.replace(/\[Delegate Name\]/g,
                      delegate.firstName || delegate.name?.split(" ")[0] || delegate.name)}
                  </p>
                </div>
                <ul className="space-y-0.5 mb-2">
                  {wizardSteps[wizardStep].tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                      <span className="text-[#3A7D44] shrink-0">▸</span>{tip}
                    </li>
                  ))}
                </ul>
                {wizardStep === 0 && phone && (
                  <a
                    href={`tel:${phone.replace(/\D/g, "")}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 mb-3 rounded-lg bg-[#3A7D44] text-white text-xs font-bold hover:bg-[#2f6838] transition-colors"
                  >
                    📞 Dial now — {phone}
                  </a>
                )}
                <textarea
                  value={wizardNotes[wizardSteps[wizardStep].id] || ""}
                  onChange={(e) => setWizardNotes((n) => ({ ...n, [wizardSteps[wizardStep].id]: e.target.value }))}
                  placeholder={wizardSteps[wizardStep].notesPlaceholder}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#3A7D44]/30 resize-none bg-white mb-2"
                />
                <div className="flex gap-2">
                  <button onClick={wizardBack} disabled={wizardStep === 0}
                    className="flex-1 py-2 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-30">
                    ← Back
                  </button>
                  <button onClick={wizardNext}
                    className="flex-1 py-2 text-xs font-bold bg-navy text-white rounded-lg hover:bg-navy-dark">
                    {wizardStep === wizardSteps.length - 1 ? "Review call →" : "Next →"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (() => {
        const coaching = stageCoaching.connect;
        return (
          <div className="bg-navy/5 border border-navy/10 rounded-lg p-3 mb-2">
            <p className="text-[10px] font-bold text-navy uppercase tracking-wide mb-2">{coaching.label}</p>
            <p className="text-xs font-semibold text-navy mb-0.5">🎯 Goal</p>
            <p className="text-xs text-gray-700 mb-2">{coaching.goal}</p>
            <p className="text-xs font-semibold text-navy mb-0.5">💡 Why it matters</p>
            <p className="text-xs text-gray-700 mb-2">{coaching.why}</p>
            <p className="text-xs font-semibold text-navy mb-1">✅ What to accomplish</p>
            <ul className="space-y-0.5 mb-2">
              {coaching.accomplish.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                  <span className="text-navy shrink-0 mt-0.5">▸</span>{item}
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold text-navy mb-1">📋 Tips</p>
            <ul className="space-y-0.5">
              {coaching.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500 italic">
                  <span className="text-gray-400 shrink-0 mt-0.5">▸</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* ── Fix 5: Topic pills + message composer (text or email) ── */}
      {(expandedAction === "text" || expandedAction === "email") && showStoryForm && (
        <div className={`rounded-lg p-3 mb-2 border ${expandedAction === "text" ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}`}>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-0.5">Share your story</p>
          <p className="text-xs text-gray-500 mb-3">Answer a few questions — then let AI shape it into a message you can send.</p>

          {!showPolished ? (
            <>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Why are you supporting Aaron?</label>
              <textarea
                value={storyDraft.whySupporting}
                onChange={(e) => setStoryDraft((s) => ({ ...s, whySupporting: e.target.value }))}
                placeholder="e.g. He's fought for this neighborhood for 20 years and I trust him."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30 bg-white mb-3"
              />

              <label className="text-xs font-semibold text-gray-700 block mb-1">What issues matter most to you?</label>
              <textarea
                value={storyDraft.issues}
                onChange={(e) => setStoryDraft((s) => ({ ...s, issues: e.target.value }))}
                placeholder="e.g. housing affordability, healthcare, West Side investment"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30 bg-white mb-3"
              />

              <label className="text-xs font-semibold text-gray-700 block mb-1">Tell them a bit about yourself</label>
              <textarea
                value={storyDraft.aboutMe}
                onChange={(e) => setStoryDraft((s) => ({ ...s, aboutMe: e.target.value }))}
                placeholder="e.g. I'm a Rose Park resident and parent of two."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30 bg-white mb-3"
              />

              <button
                onClick={improveMessage}
                disabled={!storyDraft.whySupporting.trim() || improving}
                className={`w-full py-2 text-xs font-bold rounded-lg border transition-colors mb-2 disabled:opacity-40 ${
                  expandedAction === "text"
                    ? "bg-white text-blue-700 border-blue-300 hover:bg-blue-100"
                    : "bg-white text-green-700 border-green-300 hover:bg-green-100"
                }`}
              >
                {improving ? "Improving your message..." : "✨ Polish with AI"}
              </button>

              <div className="flex gap-2">
                <button onClick={skipStory} className="flex-1 py-2 text-xs font-semibold border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                  Skip
                </button>
                <button
                  onClick={saveStory}
                  disabled={!storyDraft.whySupporting.trim()}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg text-white transition-colors disabled:opacity-40 ${expandedAction === "text" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-700 hover:bg-green-800"}`}
                >
                  Use as-is →
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-700 mb-1">Your message — edit anything you like:</p>
              <textarea
                value={polishedMessage}
                onChange={(e) => setPolishedMessage(e.target.value)}
                rows={6}
                className={`w-full border rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 bg-white mb-2 ${
                  expandedAction === "text" ? "border-blue-300 focus:ring-blue-400" : "border-green-300 focus:ring-green-400"
                }`}
              />
              <button
                onClick={() => setShowPolished(false)}
                className="text-xs text-gray-500 underline mb-3 block"
              >
                ← Edit my answers
              </button>
              <button
                onClick={saveStory}
                className={`w-full py-2 text-xs font-bold rounded-lg text-white transition-colors ${expandedAction === "text" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-700 hover:bg-green-800"}`}
              >
                Save & Continue →
              </button>
            </>
          )}
        </div>
      )}

      {(expandedAction === "text" || expandedAction === "email") && !showStoryForm && (
        <div className={`rounded-lg p-3 mb-2 border ${expandedAction === "text" ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}`}>

          {/* HTML Template: Calling All Delegates */}
          {expandedAction === "email" && (
            <CallAllDelegatesRow
              email={email}
              firstName={delegate.firstName || delegate.name?.split(" ")[0] || ""}
              onLogged={() => onOpenLog?.("email", delegate)}
            />
          )}

          {/* Story banner */}
          {volunteerStory && !topicId && (
            <div className="flex items-center justify-between mb-2 bg-white/60 rounded-lg px-2.5 py-1.5 border border-gray-200">
              <p className="text-xs text-gray-600">Sending your personal story</p>
              <button onClick={() => setShowStoryForm(true)} className="text-xs text-navy underline font-medium">Edit</button>
            </div>
          )}
          {/* Topic pill selector */}
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Choose a message topic</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {MESSAGE_TOPICS.map((topic) => {
              const isSelected = topicId === topic.id || (!topicId && topic.id === "custom");
              const isAutoSelected = !topicId && topic.id !== "custom";
              return (
                <button
                  key={topic.id}
                  onClick={() => setTopicId(topicId === topic.id ? null : topic.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    topicId === topic.id
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-gray-600 border-gray-300 hover:border-navy/40 hover:text-navy"
                  }`}
                >
                  {topic.label}
                </button>
              );
            })}
          </div>

          {/* Email subject line */}
          {expandedAction === "email" && (
            <p className="text-xs text-green-700 mb-1 font-medium">
              <strong>Subject:</strong> {emailSubject}
            </p>
          )}

          {/* Message textarea */}
          {topicId === "custom" ? (
            <textarea
              ref={textareaRef}
              className={`w-full text-sm text-gray-800 bg-white rounded p-2 resize-none focus:outline-none focus:ring-1 ${
                expandedAction === "text" ? "border border-blue-200 focus:ring-blue-400" : "border border-green-200 focus:ring-green-400"
              }`}
              rows={5}
              placeholder="Write your own message..."
              id={`msg-${delegate.id}`}
            />
          ) : (
            <textarea
              ref={textareaRef}
              key={`${topicId}-${expandedAction}`}
              className={`w-full text-sm text-gray-800 bg-white rounded p-2 resize-none focus:outline-none focus:ring-1 ${
                expandedAction === "text" ? "border border-blue-200 focus:ring-blue-400" : "border border-green-200 focus:ring-green-400"
              }`}
              rows={expandedAction === "email" ? 6 : 4}
              defaultValue={expandedAction === "email" ? emailBody : currentMessage}
              id={`msg-${delegate.id}`}
            />
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-2">
            {expandedAction === "text" && phone && (
              <a
                href={`sms:${phone.replace(/\D/g, "")}?body=${encodeURIComponent(
                  document.getElementById(`msg-${delegate.id}`)?.value || currentMessage
                )}`}
                onClick={() => onOpenLog?.("text", delegate)}
                className="flex-1 text-center bg-blue-600 text-white text-sm font-medium py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Open Messages App &#8599;
              </a>
            )}
            {expandedAction === "email" && email && (
              <a
                href={`mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(
                  document.getElementById(`msg-${delegate.id}`)?.value || emailBody
                )}`}
                onClick={() => onOpenLog?.("email", delegate)}
                className="flex-1 text-center bg-green-700 text-white text-sm font-medium py-1.5 rounded-lg hover:bg-green-800 transition-colors"
              >
                Open Email App &#8599;
              </a>
            )}
            {!phone && expandedAction === "text" && (
              <p className="text-xs text-blue-600 italic flex-1">No phone number on file.</p>
            )}
            {!email && expandedAction === "email" && (
              <p className="text-xs text-green-600 italic flex-1">No email on file.</p>
            )}
            <button
              onClick={() => {
                const el = document.getElementById(`msg-${delegate.id}`);
                if (el) navigator.clipboard?.writeText(el.value).catch(() => {});
              }}
              className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                expandedAction === "text"
                  ? "text-blue-700 border-blue-300 hover:bg-blue-100"
                  : "text-green-700 border-green-300 hover:bg-green-100"
              }`}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* ── Secondary row: Directions + Calendar + Social ── */}
      <div className="flex gap-2 mb-2 flex-wrap">
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            &#128205; Directions
          </a>
        )}
        <a href={calendarUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          &#128197; Schedule follow-up
        </a>
      </div>

      {/* ── Survey panel ── */}
      <SurveyPanel delegate={delegate} onSurveySent={onSurveySent} />

      {/* ── Inline contact log ── */}
      {logOpen && (
        <div className="border border-gray-200 rounded-lg p-3 mb-2 bg-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-navy uppercase tracking-wide">Log Contact — {delegate.name.split(" ")[0]}</p>
            {!logSaved && <button onClick={() => setLogOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>}
          </div>

          {logSaved ? (
            <div className="text-center py-2">
              <p className="text-sm font-semibold text-[#3A7D44]">✅ Contact logged</p>
              <button onClick={() => { setLogOpen(false); setLogSaved(false); setLogForm({ outcome: "", leaningToward: "", issuesRaised: [], exactWords: "", mentionedOtherCandidate: false, otherCandidateNamed: "", nextAction: "" }); }}
                className="mt-2 text-xs text-gray-500 underline">Done</button>
            </div>
          ) : (
            <>
              {/* Outcome */}
              <p className="text-xs font-semibold text-gray-700 mb-1.5">How did it go?</p>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {OUTCOMES.map((o) => (
                  <button key={o.value} type="button" onClick={() => setLog("outcome", o.value)}
                    className={`px-2 py-1.5 rounded-lg text-xs text-left border transition-colors ${
                      logForm.outcome === o.value ? "bg-navy text-white border-navy" : "bg-white text-gray-700 border-gray-200 hover:border-navy/40"
                    }`}>
                    {o.icon} {o.label}
                  </button>
                ))}
              </div>

              {/* Candidate ranking */}
              <p className="text-xs font-semibold text-gray-700 mb-1.5">How do they rank the candidates?</p>
              <p className="text-[10px] text-gray-400 mb-2">Tap a number to rank. One candidate per position.</p>
              <div className="mb-3">
                <RankingEditor
                  rankings={rankings}
                  onChange={(next) => { setRankings(next); setLog("candidateRankings", next); }}
                />
              </div>

              {/* Issues */}
              <p className="text-xs font-semibold text-gray-700 mb-1.5">Issues they raised</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {ISSUES.map((issue) => (
                  <button key={issue} type="button" onClick={() => toggleLogIssue(issue)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      logForm.issuesRaised.includes(issue) ? "bg-coral text-white border-coral" : "bg-white text-gray-600 border-gray-300 hover:border-coral/40"
                    }`}>
                    {issue}
                  </button>
                ))}
              </div>

              {/* Exact words */}
              <p className="text-xs font-semibold text-gray-700 mb-1">What did they say? <span className="font-normal text-gray-400">Exact words matter</span></p>
              <textarea value={logForm.exactWords} onChange={(e) => setLog("exactWords", e.target.value)}
                placeholder="e.g. She said she's worried about rent and hasn't committed yet."
                rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-navy/30 mb-3" />

              {/* Mentioned other candidate */}
              <div className="flex items-center gap-3 mb-2">
                <p className="text-xs font-semibold text-gray-700 flex-1">Did they mention another candidate?</p>
                <button type="button" onClick={() => setLog("mentionedOtherCandidate", !logForm.mentionedOtherCandidate)}
                  className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${logForm.mentionedOtherCandidate ? "bg-navy" : "bg-gray-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${logForm.mentionedOtherCandidate ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {logForm.mentionedOtherCandidate && (
                <input type="text" value={logForm.otherCandidateNamed} onChange={(e) => setLog("otherCandidateNamed", e.target.value)}
                  placeholder="Which candidate?" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none focus:ring-2 focus:ring-navy/30" />
              )}

              {/* Next action */}
              <p className="text-xs font-semibold text-gray-700 mb-1.5">Next action</p>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {NEXT_ACTIONS.map((action) => (
                  <button key={action} type="button" onClick={() => setLog("nextAction", action)}
                    className={`px-2 py-1.5 rounded-lg text-xs text-left border transition-colors ${
                      logForm.nextAction === action ? "bg-navy text-white border-navy" : "bg-white text-gray-700 border-gray-200 hover:border-navy/40"
                    }`}>
                    {action}
                  </button>
                ))}
              </div>

              <button onClick={submitLog} disabled={logSubmitting || !logForm.outcome}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-coral hover:bg-coral/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {logSubmitting ? "Saving..." : "Save Contact Log"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Bottom actions ── */}
      <div className="flex gap-2">
        <button
          onClick={() => onOpenBriefing?.(delegate)}
          className="flex-1 text-sm text-navy font-medium py-1.5 border border-navy/20 rounded-lg hover:bg-navy/5 transition-colors"
        >
          View briefing &#8599;
        </button>
        <button
          onClick={() => setLogOpen((v) => !v)}
          className="flex-1 text-sm text-coral font-medium py-1.5 border border-coral/20 rounded-lg hover:bg-coral/5 transition-colors"
        >
          {logOpen ? "Hide log" : "Log contact"}
        </button>
      </div>
    </div>
  );
}
