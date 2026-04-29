# Engineering Audit — Section 7 of 10: The Delegate Survey

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## Overview

The delegate survey is the primary tool for learning what each delegate cares about, how they lean on key issues, and how engaged they want to be with the campaign. It is a long-form, multi-step questionnaire that saves progress automatically. Completed responses are processed by a Cloud Function that derives tags and flags useful for volunteer outreach.

The survey can be accessed two ways: authenticated (delegate logs in and goes to their dashboard) or via a unique direct link (no login required).

---

## All 11 survey steps and their questions

### Step 0 — Introduction & Neighborhood
- Name (text, required)
- Neighborhood (text, optional)

### Step 1 — Top Priorities
Select up to 3 from 18 options:
Cost of living & affordability / Access to healthcare (including mental health) / Westside economic development & investment / Housing affordability & displacement / Air quality & environmental health / Water — Great Salt Lake & water rights / Public education funding / Disability services & accessibility / Supporting seniors — housing, healthcare & services / Violence against women & domestic safety / Clean energy & utility costs / Crime prevention & community safety / Investing in Westside nonprofits & community organizations / Homelessness & shelter access / Transportation & transit access / Wages & job opportunities / Immigration & community protection / Government accountability & local control

### Step 2 — Westside Challenges
Select up to 3 from 14 options:
Worse air quality and health risks compared to the rest of the city / Being cut off from downtown by freight rail — the Rio Grande Plan can fix this / Rising housing costs and longtime residents being displaced / Lack of economic investment compared to the Eastside / Limited public transit / The Inland Port threatening neighborhoods / Underfunded schools and fewer student support resources / Inadequate services for people with disabilities / Seniors being pushed out by rising costs / Domestic violence and shortage of shelter / Property crime and public safety concerns / Westside nonprofits underfunded / Access to healthcare and mental health services / Aging infrastructure

### Step 3 — Rank Priorities
Rank these 3 in order: Affordability & cost of living / Healthcare access / Westside development & investment
(Drag-to-rank interface; stored as an index array.)

### Step 4 — Issue Importance, Part 1
Matrix: Very important / Somewhat important / Not a priority

Groups covered:
- **Housing & Affordability** (5 items): expanding affordable housing, preventing displacement, tenant opportunity to purchase, property tax relief for seniors, cooperative housing
- **Supporting Seniors** (5 items): senior housing, property tax deferral, in-home care, Medicaid/Medicare protection, senior resource centers
- **Violence Against Women & Domestic Safety** (5 items): DV shelters, legal protections, mandatory DV training, survivor support services, sexual assault evidence kit backlog
- **Water — Great Salt Lake & Water Rights** (5 items): leasing water shares, mandating conservation, industrial accountability, infrastructure upgrades, stopping tributary depletion

### Step 5 — Issue Importance, Part 2
Matrix: Very important / Somewhat important / Not a priority

Groups covered:
- **Crime Prevention & Community Safety** (8 items): community-based prevention, street lighting, SLCPD coordination with Westside orgs, property crime, civilian oversight boards, body cameras, community policing, addressing root causes
- **Investing in Nonprofits & Community Organizations** (7 items): dedicated state funding stream, multi-year grants, food/shelter/job training orgs, immigrant-serving orgs, youth programs, arts and culture, reducing bureaucratic barriers
- **Disability Services & Accessibility** (5 items): protecting disability funding, paraprofessionals in schools, physical accessibility, mental health and developmental disability programs, opposing vouchers that defund special ed
- **Environment & Clean Energy** (5 items): 100% renewables by 2030, rooftop solar access, scaling polluter fines, stopping Inland Port expansion, opposing new wind/solar tax

### Step 6 — Issue Importance, Part 3
Matrix: Very important / Somewhat important / Not a priority

Groups covered:
- **Education** (5 items): per-pupil funding, opposing private school vouchers, free school meals, smaller class sizes, repealing book bans
- **Healthcare** (4 items): mental healthcare access, reproductive healthcare, gender-affirming care, maternal health
- **Transportation** (4 items): Rio Grande Plan, UTA expansion, opposing SB 242 (state preemption of transit), accessible transit for seniors/disabled
- **Labor & Economy** (4 items): raising minimum wage, union and collective bargaining rights, living-wage jobs for the Westside, minimum wage for prison labor
- **Community & Immigration** (3 items): opposing expanded ICE enforcement, protecting immigrants from profiling, community-centered approach to homelessness

### Step 7 — Policy Agreement Statements
Matrix: Strongly agree / Agree / Disagree / Strongly disagree — 13 statements:
1. Utah should adopt a progressive tax structure to better fund education and disability services
2. Crime prevention requires investing in communities, not just policing
3. Westside nonprofits need sustained, multi-year state funding — not just private grants
4. The state should take immediate action to restore Great Salt Lake water levels
5. Domestic violence is a public health crisis that requires dedicated state funding
6. The Westside deserves the same infrastructure and energy investment as the Eastside
7. Housing decisions — including rent stabilization — should be made locally
8. ICE enforcement is making our community less safe, not more
9. Tenants should have the first right to purchase when a landlord sells
10. The state should support Salt Lake City's 2030 renewable energy goal, not undermine it
11. Healthcare decisions should be made by patients and doctors, not politicians
12. Seniors on fixed incomes need stronger protections from rising housing costs
13. School voucher programs that divert funds from special education must be opposed

### Step 8 — Tradeoffs & Open Questions
- Budget approach (radio): Lower taxes and reduce the budget / Increased investment, even if it means higher taxes / A balanced approach / Reduce government spending first, then revisit
- Crime approach (radio): More police presence / Investment in youth, mental health, and prevention / A balanced approach / Addressing root causes first — poverty, housing, addiction
- Overlooked issue (open text)
- Legislative focus — what they most want their rep to do (open text)
- Nonprofits mentioned (open text, optional)

### Step 9 — Lived Experience
Check all that apply:
Housing affordability or displacement / Crime or public safety concerns / Disability services or accessibility needs / Domestic violence or personal safety / Senior care or aging services / Water or air quality health impacts / Reliance on a local nonprofit or community organization / Immigration status or ICE enforcement concerns / Prefer not to say

### Step 10 — Stay Involved
- Engagement interest (check all that apply): Attend community discussion events / Volunteer on the campaign / Help shape policy ideas and give ongoing feedback / Participate in door-knocking or outreach / Just keep me informed
- Contact preference (optional radio): Email / Text or phone / Either is fine
- Closing thoughts (open text, optional)

### Step 11 — Thank You screen
Confirmation message. No additional inputs.

---

## How survey data is stored

All responses are saved to a nested `survey` object inside the delegate's document at `delegates/{delegateId}.survey`. The entire survey state is a single Firestore field — not a separate collection.

Key fields within the survey object:

| Field | What it stores |
|---|---|
| `topPriorities` | Array of selected priority strings |
| `westsideChallenges` | Array of selected challenge strings |
| `rankOrder` | Array of 3 indices representing priority ranking |
| `matrixAnswers` | Object mapping item keys to importance levels |
| `agreementAnswers` | Object mapping statement keys to agreement levels |
| `budgetTradeoff` | Selected budget radio value |
| `crimeApproach` | Selected crime approach radio value |
| `overlookedIssue` | Free text |
| `legislativeFocus` | Free text |
| `nonprofitsMentioned` | Free text |
| `livedExperience` | Array of selected flags |
| `engagementInterest` | Array of selected engagement options |
| `contactPreference` | Selected contact method |
| `closingThoughts` | Free text |
| `currentStep` | Integer — which step they last saved on |
| `completed` | Boolean |
| `startedAt` | Timestamp — set on first save |
| `completedAt` | Timestamp — set when `completed` becomes true |
| `lastUpdated` | Timestamp — updated on every save |
| `linkOpenedAt` | Timestamp — set when the direct link is first opened |

Progress is auto-saved on every Next or Back click, so a delegate can leave and return without losing their answers.

---

## What happens after a delegate submits

When `survey.completed` transitions to `true`, the Cloud Function `onSurveyCompleted` fires and writes derived fields back to the top-level delegate document:

| Derived field | Source |
|---|---|
| `issueTags[]` | Normalized slug tags from `topPriorities` |
| `westsideTags[]` | Normalized slug tags from `westsideChallenges` |
| `crimeStance` | `"enforcement"`, `"community-investment"`, `"balanced"`, or `"root-causes"` |
| `engagementTier` | `"volunteer"` (wants to volunteer), `"active"` (policy/outreach), `"informed"` (just keep me posted) |
| `livedExperienceFlags[]` | Slug flags like `"housing-affected"`, `"crime-affected"`, etc. |
| `surveyCompleted` | `true` |
| `contactPreference` | Copied from survey |
| `neighborhood` | Copied from survey (if delegate record was blank) |
| `nonprofitsMentioned` | Copied from survey |
| `volunteerFlaggedAt` | Timestamp, if `engagementTier === "volunteer"` |

These derived fields are what volunteers see in the delegate briefing drawer and what the volunteer dashboard's survey panel aggregates across all delegates.

---

## The stale survey follow-up system

A scheduled Cloud Function runs every day at 8 AM Mountain Time. It finds all delegates who:
- Have `survey.startedAt` set (they opened the survey at some point), AND
- Have had that timestamp for more than 48 hours, AND
- Have `survey.completed !== true`

For those delegates, it writes `surveyFollowUpNeeded: true`. Volunteers can filter their contact list for this flag to prioritize a follow-up nudge.

When a delegate completes their survey, the flag is cleared immediately.

---

## Issues to flag

**1. Survey is very long**
The survey has 11 substantive steps with dozens of matrix rows, multi-selects, and open text fields. A delegate who starts on their phone may abandon it partway through. Progress is saved, but there is no email or text reminder to come back. The only follow-up mechanism is a volunteer manually calling them — which is the intended workflow but requires the volunteer to know the survey is incomplete.

**2. No summary shown to the delegate after completion**
After completing the survey, the delegate sees a thank-you screen. Their dashboard then shows "Completed" with a badge. But there is no summary of what they selected — no "You said your top priority is housing" confirmation. A summary would reinforce the connection between the survey and the campaign.

**3. The direct survey link is not revocable**
Anyone with a delegate's document ID can submit or overwrite their survey via the direct link. The ID is not a secret token. If a delegate ID is guessed or leaked, their survey could be overwritten.

**4. Matrix answer keys are not human-readable in Firestore**
The matrix answers are stored as `{ "item_key_here": "Very important" }` where the key is a generated short string. Reading the raw Firestore data requires looking up the question text in the source code. A future audit or data export would need to join against the question definitions.

**5. Survey step 3 (ranking) is a drag interface on desktop, but usability on mobile is unclear**
The ranking step uses drag-to-rank. No mobile-specific alternative (tap-to-rank) was confirmed in the code. This could be a friction point for delegates completing the survey on a phone.

---

*This audit reflects the state of the codebase as of April 29, 2026.*
