# Engineering Audit — Section 4 of 10: Delegates

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## 1. How many delegates are currently in the system?

I cannot answer this from the codebase alone. The live delegate count lives in Firestore, which I do not have direct read access to. To get the number, open the Firebase console → Firestore → `delegates` collection and check the document count, or look at the scoreboard in the admin dashboard (it shows total active, deferred, and vacant counts in real time).

What I can tell you from the source CSV (`hub/delegates.csv`): the sample import file contains 75 rows, a number of which are vacant seats (rows with no name). That file may or may not reflect what is actually in the live database.

---

## 2. What data fields exist on each delegate record? List every field.

Delegate documents live in the `delegates` Firestore collection. Fields fall into five categories:

### Identity (set at import or signup)

| Field | Type | Notes |
|---|---|---|
| `name` | string | Full name |
| `precinct` | string | e.g. `SLC001` |
| `role` | string | e.g. `P Chair`, `P Vice`, `P Delegate`, `State Leg PLEO` |
| `phone` | string | |
| `email` | string | |
| `address` | string | |
| `district` | string | Always `"HD21"` |
| `neighborhood` | string | Optional; enriched from survey if blank at import |
| `facebook` / `twitter` / `instagram` | string | Optional social links |

### Pipeline stage

| Field | Type | Notes |
|---|---|---|
| `stage` | string | One of the 7 stage values (see Q3) |
| `stageHistory` | array | Each entry: `{ stage, changedAt, changedBy }` |

### Leaning & competitive intel

| Field | Type | Notes |
|---|---|---|
| `currentLeaning` | string | Candidate name they are leaning toward |
| `leaningHistory` | array | Each entry: `{ leaning, date, loggedBy }` |
| `candidateRankings` | object | e.g. `{ "Aaron Wiley": 1, "Darin Mann": 2, ... }` |
| `wasOrdSupporter` | boolean | Whether they previously supported Ord |

### Contact tracking (updated per contact log)

| Field | Type | Notes |
|---|---|---|
| `lastContactedAt` | timestamp | |
| `lastContactedBy` | string | Volunteer name |
| `totalContacts` | number | Incremented by Cloud Function |
| `contactHistory` | array | Each entry: `{ date, method, outcome, loggedBy }` |
| `assignedTo` | array | Volunteer UIDs assigned to this delegate (or `null` on some older records) |
| `topIssues` | array | Issues raised across all contacts |
| `issuesRaised` | array | Accumulated list of issues mentioned during contacts |
| `exactWordsLog` | array | Verbatim quotes from contacts |
| `exactWordsLogged` | array | Each entry: `{ text, by, date }` |
| `notes` | string | Free-text notes |
| `nextAction` | string | Most recent next-action flag |
| `nextContactDate` | string | ISO date string |

### Survey-derived fields (written by Cloud Function `onSurveyCompleted`)

These fields do not exist until the delegate completes their survey.

| Field | Type | Notes |
|---|---|---|
| `survey` | object | Nested survey response object; includes `completed` boolean and `startedAt` |
| `surveySentAt` | timestamp | When the survey link was sent |
| `surveyCompleted` | boolean | |
| `issueTags` | array | Normalized tag slugs derived from survey priorities |
| `westsideTags` | array | Derived from survey's westside challenges answers |
| `crimeStance` | string | `enforcement`, `community-investment`, `balanced`, or `root-causes` |
| `engagementTier` | string | `volunteer`, `active`, or `informed` |
| `livedExperienceFlags` | array | e.g. `housing-affected`, `crime-affected` |
| `contactPreference` | string | From survey |
| `nonprofitsMentioned` | array | From survey |
| `volunteerFlaggedAt` | timestamp | Set if `engagementTier == "volunteer"` |

### Flags & metadata

| Field | Type | Notes |
|---|---|---|
| `isPLEO` | boolean | Set if role contains "PLEO" |
| `isVacant` | boolean | `true` if name was empty at import |
| `isOpposingCandidate` | boolean | `true` for Jeneanne Lock |
| `conflictOfInterest` | boolean | `true` for Jeneanne Lock |
| `isDeferred` | boolean | Hidden from active list; excluded from metrics |
| `uid` | string | Firebase Auth UID, set when delegate creates an account |
| `linkedAt` | timestamp | When the delegate created their own account |
| `joinedAt` | timestamp | |
| `surveyResponseIds` | array | IDs of survey response documents |
| `talkingPoints` | array | (from import script; not used in current UI) |
| `avoidTopics` | array | (from import script; not used in current UI) |

---

## 3. What stages exist for delegates? List all of them.

Seven stages. Six are sequential; one is a terminal outcome.

| Stage | Meaning |
|---|---|
| `unknown` | In the system; no contact made yet |
| `identified` | Initial contact made (any outcome except no-answer) |
| `engaged` | Responsive and engaged in conversation |
| `leaning` | Leaning toward Aaron (typically Aaron ranked #2) |
| `committed` | Committed to rank Aaron #1 |
| `locked` | Firm — no further contact needed |
| `not_winnable` | Hostile or otherwise unwinnable; removed from active targeting |

**Excluded from all scoreboard metrics:** `isDeferred`, `isVacant`, `isOpposingCandidate` delegates regardless of stage.

**"Committed" for scoreboard purposes** = `stage ∈ { committed, locked }`.

**Win minimum:** 46 committed delegates (constant `WIN_MINIMUM = 46`). Target: 53 (`TARGET_DELEGATES = 53`).

---

## 4. How does a delegate move from one stage to another? Who can do it?

Stage changes happen through four paths:

### Path 1 — Volunteer logs a contact (most common)

When a volunteer submits a contact log, the outcome and their inputs determine the next stage:

| Condition | Resulting stage |
|---|---|
| Outcome = `hostile` | → `not_winnable` (always, overrides everything) |
| Current stage = `unknown` AND outcome ≠ `no_answer` | → `identified` (automatic) |
| Volunteer checks "advance stage" AND outcome is `great` or `good` | → next stage in sequence |
| Volunteer records Aaron as delegate's #1 ranking | → `committed` (if current stage is lower) |
| Volunteer records Aaron as delegate's #2 ranking | → `leaning` (if current stage is lower) |

The stage determined here is written to the `contactLog` document as `stageAfterContact`. The Cloud Function `onContactLogCreated` then reads that value and writes it back to the delegate document, appending to `stageHistory` with a timestamp and the volunteer's name.

### Path 2 — Candidate ranking editor

When a volunteer (or delegate) updates the delegate's candidate rankings directly (without logging a full contact), the same auto-advance logic applies: Aaron ranked #1 pushes to `committed`, Aaron ranked #2 pushes to `leaning`, but only if the resulting stage would be higher than the current one. Stages never go backward through this path.

### Path 3 — Admin direct edit

An admin can set any delegate to any stage at any time from the admin dashboard, using the inline stage dropdown in the delegate table. This bypasses all the outcome logic above. The change is written to `stage` and appended to `stageHistory` with `changedBy: "admin"`.

### Path 4 — CSV import / manual add

Delegates created via CSV import or the "Add delegate" modal always start at `stage: "unknown"`. There is no way to set a starting stage in either import path.

**Stages never auto-advance backward.** All paths are additive — a stage only changes if the new value would be higher in the sequence than the current one (except `not_winnable`, which can be set from any stage by a hostile outcome, and admin edits, which can set any value freely).

---

## 5. What is the current breakdown of delegates by stage?

I cannot read live Firestore data. The current breakdown is visible in real time on the scoreboard in the admin dashboard.

From the codebase I can tell you what the scoreboard counts and excludes: all counts exclude delegates where `isDeferred`, `isVacant`, or (for Cloud Function–calculated totals) `isOpposingCandidate` is true. The UI scoreboard also excludes `isOpposingCandidate` from its counts.

To see the current numbers, log in as admin and look at the stage breakdown panel on the dashboard.

---

## 6. How are delegates assigned to volunteers? Walk me through that flow.

### The `assignedTo` field

Each delegate document has an `assignedTo` field that holds an array of volunteer user UIDs. A volunteer can only see delegates where their UID is in that array. Admins see all delegates.

### How an admin assigns a delegate to a volunteer

**Per-delegate (from the delegate table):**
1. Admin finds the delegate row in the admin dashboard table
2. Clicks the `+` button in the Assigned To column
3. A dropdown shows all volunteers not yet assigned to this delegate
4. Admin selects a volunteer — Firestore `arrayUnion(volunteerId)` is called immediately
5. The volunteer's name chip appears in the row
6. To remove: admin clicks the `×` on a volunteer chip — `arrayRemove(volunteerId)` is called

**Bulk assignment:**
1. Admin checks multiple delegates using row checkboxes
2. Selects a volunteer from the bulk-assign dropdown at the top of the table
3. Clicks "Assign" — `arrayUnion(volunteerId)` runs for all selected delegates simultaneously

**Defer all P Vice:**
A dedicated button defers all delegates whose role contains "P Vice" in one operation. This is a convenience shortcut, not an assignment tool.

### What the volunteer sees

The volunteer dashboard queries `where("assignedTo", "array-contains", user.uid)` against the `delegates` collection. They see only their assigned delegates. They cannot see or contact delegates assigned to other volunteers.

### Data type note

Delegates created by CSV import or the "Add delegate" modal initialize `assignedTo` as `null`, not `[]`. The first `arrayUnion` call converts it to an array correctly, but the inconsistency (`null` vs. `[]`) exists across older records. The code handles both cases with a normalizer function.

---

## 7. Can delegates be imported via CSV? How does that work?

Yes. The admin dashboard has a CSV import panel. It supports two column formats:

### New format (Utah SoS / party export style)

| Column header | Maps to |
|---|---|
| `First Name:` | first part of `name` |
| `Middle Name:` | middle part of `name` |
| `Last Name:` | last part of `name` |
| `Precinct ABCXXX:` | `precinct` |
| `Precinct Office:` | `role` |
| `Phone #:` | `phone` |
| `Email:` | `email` |
| `Street Address:`, `City:`, `State:`, `Zip:` | concatenated into `address` |

### Legacy format

| Column header | Maps to |
|---|---|
| `name` | `name` |
| `precinct` | `precinct` |
| `role` | `role` |
| `phone` | `phone` |
| `email` | `email` |
| `address` | `address` |

**Format detection:** If any header contains "first name" (case-insensitive), the new format is used. Otherwise, legacy.

### What each imported row creates

Every row creates a new document in `delegates` with:
- `stage: "unknown"`, `stageHistory: []`
- `currentLeaning: "undecided"`, `leaningHistory: []`
- `totalContacts: 0`, `lastContactedAt: null`
- `assignedTo: null`
- `isVacant: true` if name is empty
- `isPLEO: true` if role contains "PLEO"
- `isOpposingCandidate: true` and `conflictOfInterest: true` if name is exactly `"Jeneanne Lock"`

### Limitations and known issues

**No duplicate detection.** Importing the same file twice creates every delegate twice. The recommended workflow is: use "Clear All Delegates" first, then reimport. Clear is permanent — it deletes every document in the collection with no undo.

**No row-level validation.** Email format, phone format, and required fields beyond name are not checked. Any text is accepted.

**No error recovery.** If a row fails to write (e.g., a Firestore permission error), the import stops at that row. Rows already written remain. The UI shows a generic "error" status with no indication of which row failed.

**Single-row progress.** A counter shows `X of Y` rows processed, so you can see where it stopped if it fails.

**CSV quote handling.** The parser handles quoted fields correctly but does not handle escaped quotes (`\"`) inside a quoted field. A delegate name or address containing a literal quote character would corrupt that row's parsing.

---

*This audit reflects the state of the codebase as of April 29, 2026. Live delegate counts and current stage breakdown require direct access to the Firestore console or the admin dashboard.*
