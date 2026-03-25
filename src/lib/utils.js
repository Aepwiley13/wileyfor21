import { formatDistanceToNow, differenceInDays, addDays, addWeeks } from "date-fns";
import { STAGE_PRIORITY } from "./constants";

export function daysSince(date) {
  if (!date) return Infinity;
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  return differenceInDays(new Date(), d);
}

export function timeAgo(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  return formatDistanceToNow(d, { addSuffix: true });
}

export function daysUntilCaucus() {
  const caucus = new Date("2026-04-11");
  const diff = differenceInDays(caucus, new Date());
  return Math.max(0, diff);
}

export function sortByPriority(delegates) {
  return [...delegates].sort((a, b) => {
    const pa = STAGE_PRIORITY[a.stage] ?? -1;
    const pb = STAGE_PRIORITY[b.stage] ?? -1;
    if (pb !== pa) return pb - pa;
    // Secondary: most recently contacted first
    const aDate = a.lastContactedAt ? new Date(a.lastContactedAt) : new Date(0);
    const bDate = b.lastContactedAt ? new Date(b.lastContactedAt) : new Date(0);
    return aDate - bDate; // older first = needs attention sooner
  });
}

export function calculateNextContactDate(nextAction) {
  const now = new Date();
  switch (nextAction) {
    case "Follow up in 3 days":
      return addDays(now, 3);
    case "Follow up in 1 week":
      return addWeeks(now, 1);
    default:
      return null;
  }
}

export function formatFeedItem(log) {
  const time = log.timestamp ? timeAgo(log.timestamp) : "just now";

  if (log.outcome === "great" && log.stageAfterContact !== log.stageBeforeContact) {
    return `\uD83D\uDD25 ${log.volunteerName} moved ${log.delegateName} to ${log.stageAfterContact} \u00B7 ${time}`;
  }
  if (log.stageAfterContact === "committed") {
    return `\u2705 COMMITTED \u2014 ${log.delegateName} is with us! \u00B7 ${time}`;
  }
  if (log.stageAfterContact === "locked") {
    return `\uD83D\uDD12 LOCKED \u2014 ${log.delegateName} confirmed! \u00B7 ${time}`;
  }
  if (log.wasOrdSupporter && log.leaningToward === "Aaron Wiley") {
    return `\u2B50 ${log.volunteerName} flipped an Ord supporter to Aaron \u00B7 ${time}`;
  }
  if (log.method === "call") {
    return `\uD83D\uDCDE ${log.volunteerName} called ${log.delegateName} \u00B7 ${time}`;
  }
  if (log.method === "text") {
    return `\uD83D\uDCAC ${log.volunteerName} texted ${log.delegateName} \u00B7 ${time}`;
  }
  if (log.method === "email") {
    return `\u2709\uFE0F ${log.volunteerName} emailed ${log.delegateName} \u00B7 ${time}`;
  }
  if (log.outcome === "no_answer") {
    return `\uD83D\uDCF5 ${log.volunteerName} left voicemail for ${log.delegateName} \u00B7 ${time}`;
  }
  return `\uD83D\uDCCB ${log.volunteerName} logged contact with ${log.delegateName} \u00B7 ${time}`;
}
