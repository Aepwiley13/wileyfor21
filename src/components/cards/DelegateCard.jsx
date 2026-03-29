import { useState, useRef } from "react";
import { daysSince } from "@/lib/utils";
import StageBadge from "@/components/ui/StageBadge";
import ConflictWarningCard from "./ConflictWarningCard";
import { CALL_SCRIPTS, TEXT_TEMPLATES, MESSAGE_TOPICS, getRecommendedScript } from "@/lib/scripts";
import { db, useMock } from "@/lib/firebase";

const SURVEY_BASE_URL = "https://wileyfor21.com/delegate/survey";

// ── helpers ──────────────────────────────────────────────────────────────────

const SCRIPT_ORDER = [
  CALL_SCRIPTS.firstContact,
  CALL_SCRIPTS.followUp,
  CALL_SCRIPTS.commitmentAsk,
  CALL_SCRIPTS.voicemail,
];

function initialScriptIdx(stage, wasOrdSupporter) {
  if (wasOrdSupporter) return 0;
  switch (stage) {
    case "engaged": return 1;
    case "leaning":
    case "committed": return 2;
    default: return 0;
  }
}

function getInitialTopicId(stage, wasOrdSupporter) {
  if (wasOrdSupporter) return "ord";
  return null; // stage-based default message
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

function IntelStrip({ delegate }) {
  const leaning = delegate.leaningToward;
  const leaningColor =
    leaning === "Aaron Wiley" ? "text-green-700 font-bold" :
    !leaning || leaning === "Undecided" || leaning === "Was Ord → now undecided" ? "text-amber-600 font-semibold" :
    "text-red-600 font-semibold";

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
        <p className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Leaning Toward</p>
        <p className={leaningColor}>{leaning || "Unknown"}</p>
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

// ── main component ────────────────────────────────────────────────────────────

export default function DelegateCard({ delegate, onOpenLog, onOpenBriefing, onOpenCallScript, volunteerName, onSurveySent }) {
  const [expandedAction, setExpandedAction] = useState(null); // 'text' | 'email' | null
  const [scriptIdx, setScriptIdx] = useState(() => initialScriptIdx(delegate.stage, delegate.wasOrdSupporter));
  const [topicId, setTopicId] = useState(() => getInitialTopicId(delegate.stage, delegate.wasOrdSupporter));
  const textareaRef = useRef(null);

  if (delegate.isOpposingCandidate) return <ConflictWarningCard delegate={delegate} />;

  const phone = delegate.phone;
  const email = delegate.email;
  const mapsUrl = buildMapsUrl(delegate);
  const calendarUrl = buildCalendarUrl(delegate);

  const currentScript = SCRIPT_ORDER[scriptIdx] || SCRIPT_ORDER[0];
  const selectedTopic = MESSAGE_TOPICS.find((t) => t.id === topicId) || null;
  const currentMessage = selectedTopic
    ? topicMessage(selectedTopic, delegate, volunteerName)
    : stageBasedMessage(delegate, volunteerName);

  function handleCall() {
    if (phone) window.open(`tel:${phone.replace(/\D/g, "")}`);
    onOpenCallScript?.(delegate);
  }
  function handleText() { setExpandedAction(expandedAction === "text" ? null : "text"); }
  function handleEmail() { setExpandedAction(expandedAction === "email" ? null : "email"); }
  function cycleScript() { setScriptIdx((i) => (i + 1) % SCRIPT_ORDER.length); }

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
            {delegate.facebook && (
              <a href={delegate.facebook} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 font-medium hover:underline">
                &#x1F465; Facebook
              </a>
            )}
            {delegate.instagram && (
              <a href={delegate.instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 font-medium hover:underline">
                &#128247; Instagram
              </a>
            )}
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

      {/* ── Fix 3: Intelligence strip ── */}
      <IntelStrip delegate={delegate} />

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

      {/* ── Fix 4: Script selector (always visible) ── */}
      <div className="bg-navy/5 border border-navy/10 rounded-lg p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-navy uppercase tracking-wide">
            Script &mdash; {currentScript.label}
          </p>
          <button
            onClick={cycleScript}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Different script &rarr;
          </button>
        </div>
        <p className="text-[10px] text-gray-400 italic mb-2">{currentScript.useWhen}</p>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {currentScript.lines.map((line, i) => (
            <ScriptLine key={i} line={line} />
          ))}
        </div>
      </div>

      {/* ── Fix 5: Topic pills + message composer (text or email) ── */}
      {(expandedAction === "text" || expandedAction === "email") && (
        <div className={`rounded-lg p-3 mb-2 border ${expandedAction === "text" ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}`}>
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
        {delegate.twitter && (
          <a href={delegate.twitter} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-sky-700 border border-sky-200 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 transition-colors">
            &#128038; Twitter
          </a>
        )}
      </div>

      {/* ── Survey panel ── */}
      <SurveyPanel delegate={delegate} onSurveySent={onSurveySent} />

      {/* ── Bottom actions ── */}
      <div className="flex gap-2">
        <button
          onClick={() => onOpenBriefing?.(delegate)}
          className="flex-1 text-sm text-navy font-medium py-1.5 border border-navy/20 rounded-lg hover:bg-navy/5 transition-colors"
        >
          View briefing &#8599;
        </button>
        <button
          onClick={() => onOpenLog?.(null, delegate)}
          className="flex-1 text-sm text-coral font-medium py-1.5 border border-coral/20 rounded-lg hover:bg-coral/5 transition-colors"
        >
          Log contact
        </button>
      </div>
    </div>
  );
}
