import { useState } from "react";
import { daysSince } from "@/lib/utils";
import StageBadge from "@/components/ui/StageBadge";
import ConflictWarningCard from "./ConflictWarningCard";
import { TEXT_TEMPLATES, getRecommendedScript } from "@/lib/scripts";

function LastContactedLine({ delegate }) {
  if (!delegate.lastContactedAt) {
    return <p className="text-sm text-amber-600 font-medium">Never contacted &mdash; first outreach needed</p>;
  }
  const days = daysSince(delegate.lastContactedAt);
  const color = days > 14 ? "text-red-600" : days > 7 ? "text-amber-600" : "text-gray-500";
  return (
    <p className={`text-sm ${color}`}>
      Last contact: {days} day{days !== 1 ? "s" : ""} ago by {delegate.lastContactedBy}
    </p>
  );
}

function getSmsTemplate(delegate, volunteerName) {
  const name = delegate.name?.split(" ")[0] || delegate.name;
  const vol = volunteerName || "your volunteer";
  const stage = delegate.stage;
  let template;
  if (stage === "leaning" || stage === "engaged") {
    template = TEXT_TEMPLATES.followUp;
  } else if (stage === "committed" || stage === "locked") {
    template = TEXT_TEMPLATES.finalPush;
  } else {
    template = TEXT_TEMPLATES.firstOutreach;
  }
  return template
    .replace(/\[NAME\]/g, name)
    .replace(/\[YOUR NAME\]/g, vol)
    .replace("hub.wileyfor21.com", "wileyfor21.com");
}

function getEmailContent(delegate, volunteerName) {
  const firstName = delegate.firstName || delegate.name?.split(" ")[0] || delegate.name;
  const vol = volunteerName || "a volunteer";
  const script = getRecommendedScript(delegate.stage, delegate.wasOrdSupporter);
  const issuesMention = delegate.issuesRaised?.length
    ? `\n\nI noted that you care about ${delegate.issuesRaised.join(" and ")} — those are exactly the issues Aaron is fighting for.`
    : "";
  const subject = `Aaron Wiley for HD 21 — following up, ${firstName}`;
  const body =
    `Hi ${firstName},\n\n` +
    `My name is ${vol}, and I'm a volunteer with Aaron Wiley's campaign for House District 21. Aaron is running in the Democratic convention on April 11th.${issuesMention}\n\n` +
    `Aaron was the first paid employee on Barack Obama's campaign in Utah, a Rose Park youth coach for 20 years, and has spent decades organizing for housing affordability, healthcare access, and investment on the West Side.\n\n` +
    `I'd love to answer any questions or connect you directly with Aaron before the convention. You can also learn more at wileyfor21.com.\n\n` +
    `Thank you for your time,\n${vol}`;
  return { subject, body };
}

function buildMapsUrl(delegate) {
  const parts = [delegate.address, delegate.city, delegate.state, delegate.zip].filter(Boolean);
  if (!parts.length) return null;
  return `https://maps.google.com/?q=${encodeURIComponent(parts.join(", "))}`;
}

function buildCalendarUrl(delegate) {
  // Default: tomorrow at 10am local, 30 minutes
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
  const dates = `${fmt(tomorrow)}/${fmt(end)}`;
  const text = encodeURIComponent(`Follow up with ${delegate.name} — Aaron Wiley HD21`);
  const details = encodeURIComponent(
    `Outreach follow-up for Aaron Wiley HD21 campaign.\nDelegate: ${delegate.name} | ${delegate.precinct} | ${delegate.role}`
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
}

export default function DelegateCard({ delegate, onOpenLog, onOpenBriefing, volunteerName }) {
  const [expandedAction, setExpandedAction] = useState(null); // 'text' | 'email' | null

  if (delegate.isOpposingCandidate) {
    return <ConflictWarningCard delegate={delegate} />;
  }

  const phone = delegate.phone;
  const email = delegate.email;
  const mapsUrl = buildMapsUrl(delegate);
  const calendarUrl = buildCalendarUrl(delegate);
  const smsMessage = getSmsTemplate(delegate, volunteerName);
  const { subject: emailSubject, body: emailBody } = getEmailContent(delegate, volunteerName);

  function handleCall() {
    if (phone) {
      window.open(`tel:${phone.replace(/\D/g, "")}`);
    }
    onOpenLog?.("call", delegate);
  }

  function handleText() {
    setExpandedAction(expandedAction === "text" ? null : "text");
  }

  function handleEmail() {
    setExpandedAction(expandedAction === "email" ? null : "email");
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="font-condensed font-bold text-navy text-lg leading-tight truncate">
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
          {/* Contact info visible on card */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {phone && (
              <a
                href={`tel:${phone.replace(/\D/g, "")}`}
                className="text-xs text-navy font-medium hover:underline"
              >
                &#128222; {phone}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="text-xs text-navy font-medium hover:underline truncate max-w-[180px]"
                title={email}
              >
                &#9993; {email}
              </a>
            )}
            {delegate.facebook && (
              <a
                href={delegate.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-700 font-medium hover:underline"
              >
                &#x1F465; Facebook
              </a>
            )}
            {delegate.instagram && (
              <a
                href={delegate.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-pink-600 font-medium hover:underline"
              >
                &#128247; Instagram
              </a>
            )}
            {delegate.twitter && (
              <a
                href={delegate.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-600 font-medium hover:underline"
              >
                &#x1D54F; Twitter
              </a>
            )}
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            {delegate.isPLEO && (
              <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                &#9733; PLEO
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

      {/* Last contacted */}
      <div className="mb-3">
        <LastContactedLine delegate={delegate} />
      </div>

      {/* Primary contact buttons */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={handleCall}
          className="flex-1 bg-navy text-white text-sm font-medium py-2 rounded-lg hover:bg-navy-dark active:scale-95 transition-all"
          title={phone ? `Call ${phone}` : "No phone on file"}
        >
          &#128222; Call{phone ? "" : "*"}
        </button>
        <button
          onClick={handleText}
          className={`flex-1 text-sm font-medium py-2 rounded-lg active:scale-95 transition-all ${
            expandedAction === "text"
              ? "bg-blue-600 text-white"
              : "bg-navy text-white hover:bg-navy-dark"
          }`}
          title={phone ? `Text ${phone}` : "No phone on file"}
        >
          &#128172; Text{phone ? "" : "*"}
        </button>
        <button
          onClick={handleEmail}
          className={`flex-1 text-sm font-medium py-2 rounded-lg active:scale-95 transition-all ${
            expandedAction === "email"
              ? "bg-blue-600 text-white"
              : "bg-navy text-white hover:bg-navy-dark"
          }`}
          title={email ? `Email ${email}` : "No email on file"}
        >
          &#9993;&#65039; Email{email ? "" : "*"}
        </button>
      </div>

      {/* SMS composer panel */}
      {expandedAction === "text" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
          <p className="text-xs font-semibold text-blue-800 mb-1">Suggested message</p>
          <textarea
            className="w-full text-sm text-gray-800 bg-white border border-blue-200 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            rows={4}
            defaultValue={smsMessage}
            id={`sms-text-${delegate.id}`}
          />
          <div className="flex gap-2 mt-2">
            {phone ? (
              <a
                href={`sms:${phone.replace(/\D/g, "")}?body=${encodeURIComponent(
                  document.getElementById(`sms-text-${delegate.id}`)?.value || smsMessage
                )}`}
                onClick={() => onOpenLog?.("text", delegate)}
                className="flex-1 text-center bg-blue-600 text-white text-sm font-medium py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Open Messages App &#8599;
              </a>
            ) : (
              <p className="text-xs text-blue-600 italic">No phone number on file — copy message manually.</p>
            )}
            <button
              onClick={() => {
                const el = document.getElementById(`sms-text-${delegate.id}`);
                if (el) navigator.clipboard?.writeText(el.value).catch(() => {});
              }}
              className="px-3 py-1.5 text-sm text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Email composer panel */}
      {expandedAction === "email" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
          <p className="text-xs font-semibold text-green-800 mb-1">Suggested email</p>
          <p className="text-xs text-green-700 mb-1">
            <strong>Subject:</strong> {emailSubject}
          </p>
          <textarea
            className="w-full text-sm text-gray-800 bg-white border border-green-200 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-green-400"
            rows={6}
            defaultValue={emailBody}
            id={`email-body-${delegate.id}`}
          />
          <div className="flex gap-2 mt-2">
            {email ? (
              <a
                href={`mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                onClick={() => onOpenLog?.("email", delegate)}
                className="flex-1 text-center bg-green-600 text-white text-sm font-medium py-1.5 rounded-lg hover:bg-green-700 transition-colors"
              >
                Open Email App &#8599;
              </a>
            ) : (
              <p className="text-xs text-green-600 italic">No email on file — copy message manually.</p>
            )}
            <button
              onClick={() => {
                const el = document.getElementById(`email-body-${delegate.id}`);
                if (el) navigator.clipboard?.writeText(`Subject: ${emailSubject}\n\n${el.value}`).catch(() => {});
              }}
              className="px-3 py-1.5 text-sm text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Secondary action row: Directions + Calendar + Social */}
      <div className="flex gap-2 mb-2 flex-wrap">
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            &#128205; Directions
          </a>
        )}
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          &#128197; Schedule follow-up
        </a>
        {delegate.facebook && (
          <a
            href={delegate.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            &#x1F465; Facebook
          </a>
        )}
        {delegate.instagram && (
          <a
            href={delegate.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-pink-700 border border-pink-200 px-2.5 py-1.5 rounded-lg hover:bg-pink-50 transition-colors"
          >
            &#128247; Instagram
          </a>
        )}
        {delegate.twitter && (
          <a
            href={delegate.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-sky-700 border border-sky-200 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 transition-colors"
          >
            &#128038; X / Twitter
          </a>
        )}
      </div>

      {/* Bottom actions */}
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
