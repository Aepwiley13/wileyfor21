/**
 * Cloud Function: onSurveyCompleted
 *
 * Triggers when a delegate document is written and survey.completed transitions
 * to true. Derives structured tags and enriches the delegate's root profile so
 * the Volunteer Hub has actionable signals for every call.
 *
 * Writes back to delegates/{delegateId}:
 *   issueTags[]          — normalized tag slugs from topPriorities
 *   westsideTags[]       — normalized tags from westsideChallenges
 *   crimeStance          — "enforcement" | "community-investment" | "balanced" | "root-causes"
 *   engagementTier       — "volunteer" | "active" | "informed"
 *   livedExperienceFlags[] — flag slugs for volunteer call scripts
 *   surveyCompleted      — true
 *   contactPreference    — from survey, overwrites any prior assumption
 *   neighborhood         — enriches if previously blank
 */

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

try { initializeApp(); } catch (_) {}

// ── Derivation maps ──────────────────────────────────────────────────────────

const PRIORITY_TO_TAG = {
  "Cost of living & affordability": "Affordability",
  "Access to healthcare (including mental health)": "Healthcare",
  "Westside economic development & investment": "Westside Development",
  "Housing affordability & displacement": "Housing",
  "Air quality & environmental health": "Air Quality",
  "Water — Great Salt Lake & water rights": "Water",
  "Public education funding": "Education",
  "Disability services & accessibility": "Disability",
  "Supporting seniors — housing, healthcare & services": "Seniors",
  "Violence against women & domestic safety": "Domestic Safety",
  "Clean energy & utility costs": "Clean Energy",
  "Crime prevention & community safety": "Crime & Safety",
  "Investing in Westside nonprofits & community organizations": "Nonprofits",
  "Homelessness & shelter access": "Homelessness",
  "Transportation & transit access": "Transportation",
  "Wages & job opportunities": "Labor & Jobs",
  "Immigration & community protection": "Immigration",
  "Government accountability & local control": "Accountability",
};

const WESTSIDE_TO_TAG = {
  "Worse air quality and health risks compared to the rest of the city": "Air Quality",
  "Being cut off from downtown by freight rail — the Rio Grande Plan can fix this": "Transportation",
  "Rising housing costs and longtime residents being displaced": "Housing",
  "Lack of economic investment compared to the Eastside": "Westside Development",
  "Limited public transit — not enough routes, not frequent enough": "Transportation",
  "The Inland Port and industrial expansion threatening our neighborhoods": "Air Quality",
  "Underfunded schools and fewer student support resources": "Education",
  "Inadequate services and accessibility for people with disabilities": "Disability",
  "Seniors being pushed out of their homes by rising costs": "Seniors",
  "Domestic violence and a shortage of shelter and support services": "Domestic Safety",
  "Property crime and public safety concerns, especially at night": "Crime & Safety",
  "Westside nonprofits underfunded and stretched too thin": "Nonprofits",
  "Access to healthcare clinics and mental health services": "Healthcare",
  "Aging infrastructure — roads, sidewalks, lighting, pipes": "Westside Development",
};

const CRIME_APPROACH_TO_STANCE = {
  "More police presence and enforcement": "enforcement",
  "More investment in youth programs, jobs, and mental health": "community-investment",
  "A balanced approach — both enforcement and community investment": "balanced",
  "Focus on addressing root causes like poverty and addiction first": "root-causes",
};

const LIVED_EXP_TO_FLAG = {
  "Housing affordability or displacement": "housing-affected",
  "Crime or public safety concerns": "crime-affected",
  "Disability services or accessibility needs": "disability-affected",
  "Domestic violence or personal safety": "dv-affected",
  "Senior care or aging services": "senior-affected",
  "Water or air quality health impacts": "environment-affected",
  "Reliance on a local nonprofit or community organization": "nonprofit-reliant",
  "Immigration status or ICE enforcement concerns": "immigration-affected",
};

// ── Derivation helpers ────────────────────────────────────────────────────────

function deriveIssueTags(topPriorities = []) {
  return [...new Set(topPriorities.map((p) => PRIORITY_TO_TAG[p]).filter(Boolean))];
}

function deriveWestsideTags(westsideChallenges = []) {
  return [...new Set(westsideChallenges.map((c) => WESTSIDE_TO_TAG[c]).filter(Boolean))];
}

function deriveCrimeStance(crimeApproach) {
  return CRIME_APPROACH_TO_STANCE[crimeApproach] || null;
}

function deriveEngagementTier(engagementInterest = []) {
  if (engagementInterest.includes("Volunteer on the campaign")) return "volunteer";
  if (
    engagementInterest.includes("Help shape policy ideas and give ongoing feedback") ||
    engagementInterest.includes("Participate in door-knocking or outreach")
  ) return "active";
  return "informed";
}

function deriveLivedExperienceFlags(livedExperience = []) {
  return livedExperience
    .map((item) => LIVED_EXP_TO_FLAG[item])
    .filter(Boolean);
}

// ── Cloud Function ────────────────────────────────────────────────────────────

exports.onSurveyCompleted = onDocumentWritten(
  "delegates/{delegateId}",
  async (event) => {
    const before = event.data.before?.data();
    const after = event.data.after?.data();

    // Only fire when survey.completed transitions false → true
    if (!after?.survey?.completed) return;
    if (before?.survey?.completed === true) return;

    const survey = after.survey;
    const db = getFirestore();
    const delegateId = event.params.delegateId;

    const issueTags = deriveIssueTags(survey.topPriorities);
    const westsideTags = deriveWestsideTags(survey.westsideChallenges);
    const crimeStance = deriveCrimeStance(survey.crimeApproach);
    const engagementTier = deriveEngagementTier(survey.engagementInterest);
    const livedExperienceFlags = deriveLivedExperienceFlags(survey.livedExperience);

    const enrichment = {
      surveyCompleted: true,
      issueTags,
      westsideTags,
      engagementTier,
      livedExperienceFlags,
    };

    if (crimeStance) enrichment.crimeStance = crimeStance;
    if (survey.contactPreference) enrichment.contactPreference = survey.contactPreference;
    if (survey.neighborhood && !after.neighborhood) enrichment.neighborhood = survey.neighborhood;
    if (survey.nonprofitsMentioned) enrichment.nonprofitsMentioned = survey.nonprofitsMentioned;

    // If they want to volunteer, flag for coordinator follow-up
    if (engagementTier === "volunteer") {
      enrichment.volunteerFlaggedAt = FieldValue.serverTimestamp();
    }

    await db.collection("delegates").doc(delegateId).update(enrichment);

    console.log(`Survey enrichment written for delegate ${delegateId} — tags: ${issueTags.join(", ")}`);
  }
);
