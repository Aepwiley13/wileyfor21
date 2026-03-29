// Active candidates in the HD21 race — used for delegate ranking
export const ACTIVE_CANDIDATES = [
  "Aaron Wiley",
  "Darin Mann",
  "Anthony Washburn",
  "Stephen Otterstrom",
  "Jeneanne Lock",
];

export const CAUCUS_DATE = new Date("2026-04-11");

export const STAGES = [
  "unknown",
  "identified",
  "engaged",
  "leaning",
  "committed",
  "locked",
];

export const STAGE_BADGES = {
  unknown: { bg: "#F3F4F6", text: "#374151", label: "Not contacted" },
  identified: { bg: "#FEF3C7", text: "#713F12", label: "Identified" },
  engaged: { bg: "#FFEDD5", text: "#7C2D12", label: "Engaged" },
  leaning: { bg: "#DBEAFE", text: "#1E3A5F", label: "Leaning" },
  committed: { bg: "#DCFCE7", text: "#166534", label: "Committed" },
  locked: { bg: "#166534", text: "#FFFFFF", label: "Locked \u2713" },
  not_winnable: { bg: "#FEE2E2", text: "#991B1B", label: "Not winnable" },
};

// Priority for sorting delegate cards — higher = show first
export const STAGE_PRIORITY = {
  leaning: 4,
  engaged: 3,
  identified: 2,
  unknown: 1,
  committed: 0,
  locked: 0,
  not_winnable: -1,
};

export const COMPETITOR = {
  name: "Jeneanne Lock",
  precinct: "SLC031",
  role: "P Vice",
};

export const CANDIDATES = [
  "Aaron Wiley",
  "Darin Mann",
  "Anthony Washburn",
  "Stephen Otterstrom",
  "Jeneanne Lock",
  "Was Ord \u2192 now undecided",
  "Undecided",
  "Refused to say",
];

export const ISSUES = [
  "Housing",
  "Public safety",
  "Transit",
  "Education",
  "Jobs/economy",
  "Homelessness",
  "Environment",
  "Immigration",
];

export const CONTACT_METHODS = [
  { value: "call", label: "Phone call", icon: "\uD83D\uDCDE" },
  { value: "text", label: "Text message", icon: "\uD83D\uDCAC" },
  { value: "email", label: "Email", icon: "\u2709\uFE0F" },
  { value: "in_person", label: "In person", icon: "\uD83E\uDD1D" },
  { value: "event", label: "Event", icon: "\uD83C\uDF89" },
];

export const OUTCOMES = [
  { value: "great", label: "Great \u2014 very positive", icon: "\uD83D\uDD25" },
  { value: "good", label: "Good \u2014 open and friendly", icon: "\uD83D\uDC4D" },
  { value: "neutral", label: "Neutral \u2014 polite, non-committal", icon: "\uD83D\uDE10" },
  { value: "skeptical", label: "Skeptical \u2014 has concerns", icon: "\uD83E\uDD14" },
  { value: "difficult", label: "Difficult \u2014 resistant", icon: "\uD83D\uDC4E" },
  { value: "hostile", label: "Hostile \u2014 not winnable", icon: "\u274C" },
  { value: "no_answer", label: "No answer / voicemail", icon: "\uD83D\uDCF5" },
];

export const NEXT_ACTIONS = [
  "Follow up in 3 days",
  "Follow up in 1 week",
  "Send policy brief",
  "Invite to event",
  "Schedule call with Aaron",
  "No action needed",
];

export const MILESTONE_MESSAGES = {
  10: "We just hit 10 committed delegates! 43 more to reach our target.",
  20: "20 committed! We're building real momentum.",
  30: "30 committed! We're more than halfway to our 53-delegate target.",
  40: "40 committed! 13 more and we win.",
  46: "46 committed \u2014 WE HAVE THE MINIMUM TO WIN. Keep pushing.",
  50: "50 committed! 3 from our target.",
  53: "53 COMMITTED. WE HIT OUR TARGET. April 11 \u2014 we win.",
};

export const TARGET_DELEGATES = 53;

// Call script stages — one stage per phase of outreach, call-only.
// Text and email scripts will be added separately when ready.
export const CALL_SCRIPT_STAGES = {
  connect: {
    id: "connect",
    label: "Connect",
    description: "First call — introduce Aaron, build rapport, learn their issues",
    method: "call",
  },
  // Future stages added here: persuade, commit, gotv
};
