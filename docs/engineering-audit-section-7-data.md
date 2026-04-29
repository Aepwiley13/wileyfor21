# Engineering Audit — Section 7 of 10: Data & Firestore

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## 1. Every Firestore collection

### `delegates`

**What it stores:** One document per convention delegate — both volunteer-managed records (imported from CSV or added manually) and self-registered delegates who created accounts.

**Approximate document count:** Unknown without live Firestore access. The sample import file in the repo has 75 rows including vacant seats. The live count may differ.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| `name` | string | Full name |
| `precinct` | string | e.g. `SLC031` |
| `role` | string | `P Chair`, `P Vice`, `P Delegate`, `State Leg PLEO` |
| `phone` | string | |
| `email` | string | |
| `address` | string | |
| `district` | string | Always `"HD21"` |
| `stage` | string | `unknown` / `identified` / `engaged` / `leaning` / `committed` / `locked` / `not_winnable` |
| `stageHistory` | array | `{ stage, changedAt, changedBy }` per change |
| `currentLeaning` | string | Which candidate they support |
| `leaningHistory` | array | `{ leaning, date, loggedBy }` per change |
| `candidateRankings` | object | `{ "Aaron Wiley": 1, "Darin Mann": 2, … }` |
| `assignedTo` | array \| null | Volunteer UIDs assigned to this delegate |
| `lastContactedAt` | timestamp | |
| `lastContactedBy` | string | Volunteer name |
| `totalContacts` | number | Incremented by Cloud Function |
| `topIssues` | array | Issues raised across all contacts |
| `isPLEO` | boolean | |
| `isVacant` | boolean | True if name was empty at import |
| `isOpposingCandidate` | boolean | True for Jeneanne Lock |
| `conflictOfInterest` | boolean | True for Jeneanne Lock |
| `isDeferred` | boolean | Hidden from active lists |
| `wasOrdSupporter` | boolean | |
| `survey` | object | Entire survey response nested here (see `delegates.survey` below) |
| `surveyCompleted` | boolean | Set by Cloud Function |
| `surveyFollowUpNeeded` | boolean | Set by scheduled Cloud Function; cleared on completion |
| `issueTags` | array | Derived by Cloud Function from survey |
| `westsideTags` | array | Derived by Cloud Function from survey |
| `crimeStance` | string | Derived by Cloud Function |
| `engagementTier` | string | `volunteer` / `active` / `informed` |
| `livedExperienceFlags` | array | Derived by Cloud Function |
| `volunteerFlaggedAt` | timestamp | Set if engagementTier is `volunteer` |
| `uid` | string | Firebase Auth UID (set only when delegate creates an account) |
| `linkedAt` | timestamp | When delegate created their account |
| `joinedAt` | timestamp | |

The `survey` nested object contains: `completed`, `startedAt`, `completedAt`, `lastUpdated`, `linkOpenedAt`, `currentStep`, `topPriorities`, `westsideChallenges`, `rankOrder`, `matrixAnswers`, `agreementAnswers`, `budgetTradeoff`, `crimeApproach`, `overlookedIssue`, `legislativeFocus`, `nonprofitsMentioned`, `livedExperience`, `engagementInterest`, `contactPreference`, `closingThoughts`, `name`, `neighborhood`.

---

### `contactLogs`

**What it stores:** One document per volunteer-delegate contact interaction. Written by volunteers when they log a call, text, email, or in-person contact.

**Approximate document count:** Unknown. Grows with every contact logged — could be anywhere from dozens to several hundred depending on campaign activity.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| `delegateId` | string | Document ID of the delegate |
| `delegateName` | string | |
| `volunteerId` | string | Firebase Auth UID of the volunteer |
| `volunteerName` | string | |
| `method` | string | `call` / `text` / `email` / `in_person` / `event` |
| `outcome` | string | `great` / `good` / `neutral` / `skeptical` / `difficult` / `hostile` / `no_answer` |
| `stageBeforeContact` | string | Delegate's stage before this log |
| `stageAfterContact` | string | Delegate's stage after this log |
| `leaningToward` | string | Candidate name |
| `issuesRaised` | array | Issues mentioned during contact |
| `exactWords` | string | Verbatim quote |
| `mentionedOtherCandidate` | boolean | |
| `otherCandidateNamed` | string | |
| `wasOrdSupporter` | boolean | |
| `nextAction` | string | |
| `nextContactDate` | string | ISO date (calculated from nextAction, stored but not displayed) |
| `timestamp` | timestamp | Server timestamp |

---

### `volunteers`

**What it stores:** One document per registered volunteer or admin. Document ID is the Firebase Auth UID.

**Approximate document count:** Unknown without live access. The admin dashboard shows a live count.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| `firstName` | string | |
| `lastName` | string | |
| `name` | string | Concatenated full name |
| `email` | string | |
| `phone` | string | |
| `houseDistrict` | number | e.g. `21` |
| `role` | string | `"volunteer"` or `"admin"` |
| `preferredMethod` | string | `call` / `text` / `email` |
| `whyVolunteering` | string | Intake answer |
| `assignedDelegates` | array | Written at signup but never updated — effectively unused (see issues) |
| `totalContacts` | number | Incremented by Cloud Function |
| `stageUpgradesAllTime` | number | Incremented by Cloud Function |
| `joinedAt` | timestamp | |

---

### `campaignStats`

**What it stores:** A single document (`live`) containing pre-aggregated campaign metrics. Written exclusively by Cloud Functions. Read by the volunteer and admin dashboards.

**Approximate document count:** 1 (the `live` document).

**Key fields on `campaignStats/live`:**

| Field | Type | Notes |
|---|---|---|
| `totalByStage` | object | `{ unknown: N, identified: N, … }` — counts per stage, excluding deferred/vacant/opposing |
| `leaningByCandidate` | object | `{ "Aaron Wiley": N, "Darin Mann": N, … }` |
| `target` | number | Convention target (53) — if this field is missing, dashboards default to 53 |
| `staleCount` | number | Delegates not contacted in 14+ days |
| `staleDelegates` | array | `{ id, name, precinct, stage }` per stale delegate |
| `lastUpdated` | timestamp | When Cloud Function last wrote to this document |

**Important:** No client-side code creates this document. It must exist in Firestore before the Cloud Functions can update it (they use `update`, not `set`). If it does not exist, every `onContactLogCreated` trigger will fail silently.

---

### `milestones`

**What it stores:** One document per reached milestone threshold. Document ID is the threshold number as a string (`"10"`, `"20"`, etc.). Written once by `onContactLogCreated` Cloud Function when committed+locked count crosses a threshold; never written again.

**Approximate document count:** 0–8 depending on campaign progress (thresholds are 10, 20, 30, 40, 50, 53, 60, 70).

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| `count` | number | The threshold that was reached |
| `achievedAt` | timestamp | When it was first crossed |

**Note:** The milestone for 46 delegates ("WE HAVE THE MINIMUM TO WIN") is referenced in the UI constants but the number 46 is absent from the Cloud Function's threshold array. It will never be written to this collection.

---

### `endorsements`

**What it stores:** One document per public endorsement submission from `wileyfor21.com/endorse`. No authentication required to create.

**Approximate document count:** Unknown. Depends on how many people have submitted endorsements.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| `firstName` | string | |
| `lastName` | string | |
| `email` | string | Not displayed publicly |
| `title` | string | Optional |
| `why` | string | Displayed as pull quote on endorsement wall |
| `photoURL` | string | Firebase Storage URL; optional |
| `editToken` | string | UUID — used to authenticate the edit page |
| `createdAt` | timestamp | |

**Security note:** The Firestore rules deny `update` and `delete` on this collection. The edit page (`/endorse/edit/{id}?token={token}`) exists in the UI but its saves will be rejected by Firestore. This is a bug.

---

### `callScriptLogs`

**What it stores:** One document per completed call script wizard session. Written when a volunteer finishes the six-step guided call flow.

**Approximate document count:** Unknown. One entry per wizard completion.

**Key fields:**

| Field | Type | Notes |
|---|---|---|
| `type` | string | Always `"call_script"` |
| `stage` | string | Always `"connect"` (only one script stage exists) |
| `method` | string | Always `"call"` |
| `notes` | object | `{ opening: "…", rapport: "…", issues: "…", their_questions: "…", the_ask: "…", close: "…" }` |
| `delegateId` | string | |
| `delegateName` | string | |
| `submittedAt` | timestamp | |

**Note:** This collection is separate from `contactLogs`. Cloud Functions only trigger on `contactLogs`, so wizard completions do not count toward volunteer contact totals, do not update delegate leanings, and do not fire milestones unless the volunteer also submits a separate contact log.

---

### `surveyResponses`

**What it stores:** Referenced in Firestore rules and in the import script's `surveyResponseIds` field, but no active code in the current app reads from or writes to this collection. It appears to be a remnant of an earlier design where survey responses were stored separately rather than nested in the delegate document.

**Approximate document count:** Likely 0, or possibly some early test documents. Cannot confirm without live access.

---

### `candidates`

**What it stores:** Candidate metadata. Referenced in Firestore rules (admins can write, authenticated users can read) and in the seeding script `hub/scripts/seedCandidates.mjs`. No active UI reads from this collection at runtime — candidate data is instead hardcoded in `src/lib/constants.js`.

**Approximate document count:** Likely 1–5 (one per candidate in the race). Cannot confirm without live access.

---

## 2. Are there any Firestore security rules in place?

Yes. The rules file is at `hub/firestore.rules`. Here they are in full:

```
rules_version = "2";
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return get(/databases/$(database)/documents/volunteers/$(request.auth.uid))
             .data.role == "admin";
    }

    match /delegates/{delegateId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && isAdmin();
    }

    match /contactLogs/{logId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.volunteerId == request.auth.uid;
      allow update, delete: if isAdmin();
    }

    match /volunteers/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if isAdmin();
    }

    match /surveyResponses/{responseId} {
      allow create: if true;
      allow read: if request.auth != null;
    }

    match /campaignStats/{doc} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    match /candidates/{candidateId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    match /milestones/{milestoneId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    match /endorsements/{endorsementId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

**Summary by collection:**

| Collection | Public read | Auth read | Public write | Auth write | Admin write | Cloud Function write |
|---|---|---|---|---|---|---|
| `delegates` | No | Yes | No | No | Yes | Yes (service account bypasses rules) |
| `contactLogs` | No | Yes | No | Own records only | Yes (update/delete) | Yes |
| `volunteers` | No | Own doc only | No | Own doc only | Read only | Yes |
| `surveyResponses` | No | Yes | Yes (create) | Yes (create) | — | — |
| `campaignStats` | No | Yes | No | No | No | Yes |
| `candidates` | No | Yes | No | No | Yes | — |
| `milestones` | No | Yes | No | No | No | Yes |
| `endorsements` | Yes | Yes | Yes (create) | Yes (create) | No | — |

**Three issues with the current rules:**

1. **`callScriptLogs` has no rule.** This collection is written to by the volunteer call script wizard but does not appear anywhere in `firestore.rules`. When no rule matches a collection, Firestore denies all access by default — which means wizard saves should be failing in production. Either the rule is missing or the collection is not actually being written to in production.

2. **`endorsements` allows `update` for no one.** The edit page at `/endorse/edit/{id}` calls `updateDoc()` on the client. The rules have `allow update, delete: if false` — so every edit attempt is rejected by Firestore. The edit feature is broken.

3. **The `isAdmin()` helper makes a Firestore read on every write.** Every write that goes through the admin check reads the `volunteers/{uid}` document. This counts against Firestore read quotas and adds latency to every admin write operation. At campaign scale this is acceptable, but it is worth knowing.

---

## 3. Are there any indexes set up?

No `firestore.indexes.json` file exists in the repository. This means either:

- Indexes were created manually through the Firebase console (and therefore are not tracked in code), or
- Some queries that need composite indexes are failing silently in production

**Queries in the codebase that require composite indexes** (Firestore requires a composite index any time a query combines `where` on multiple fields, or combines `where` with `orderBy` on a different field):

| Query | Collection | Fields | Status |
|---|---|---|---|
| `where("lastContactedAt", "<", …) + where("isVacant", "==", false) + where("isOpposingCandidate", "==", false)` | `delegates` | `lastContactedAt`, `isVacant`, `isOpposingCandidate` | **Requires composite index.** Used by `staleDelegateAlert` Cloud Function. If the index does not exist, the stale delegate alert will fail every 24 hours. The legacy hub code even has a comment: `"At-risk query needs a composite index"`. |
| `where("survey.startedAt", "<=", …)` | `delegates` | `survey.startedAt` | Single-field range query on a nested field. Firestore may require a single-field index override for nested fields. Used by `staleDelegateSurveyAlert`. |
| `where("timestamp", ">=", weekStart)` | `contactLogs` | `timestamp` | Single-field range query. Firestore creates single-field indexes automatically, so this likely works without a manual index. |
| `orderBy("createdAt", "desc")` | `endorsements` | `createdAt` | Single-field order. Likely auto-indexed. |
| `where("assignedTo", "array-contains", uid)` | `delegates` | `assignedTo` | Array-contains queries are supported by single-field indexes. Likely auto-indexed. |
| `where("survey.completed", "==", true)` | `delegates` | `survey.completed` | Single-field query on nested field. May require a field override in Firebase console. |
| `where("email", "==", …)` or `where("phone", "==", …)` | `delegates` | `email`, `phone` | Simple equality queries. Auto-indexed. |

**The most likely production failures from missing indexes:** the `staleDelegateAlert` function (which has a three-field `where` query) and the `staleDelegateSurveyAlert` function (which queries on a nested timestamp field). These run on a schedule every 24 hours and would log errors in Firebase Functions logs if the indexes don't exist.

---

## 4. Is there any data that lives outside of Firestore?

Yes — three places.

### localStorage (browser storage)

Two keys are written to the browser's `localStorage`. This data is stored on the user's device, survives page refreshes, but is lost if the user clears their browser cache, switches devices, or uses a different browser.

| Key | What it stores | Written by |
|---|---|---|
| `"wileyfor21_volunteer_story"` | The volunteer's personal outreach story: `{ whySupporting, issues, aboutMe, polishedMessage }`. Used to pre-populate the AI message composer. | `DelegateCard.jsx` — saved every time the volunteer updates their story or generates an AI-polished message |
| `"wiley21_milestones_seen"` | Array of milestone thresholds already shown to this user (e.g., `[10, 20, 30]`). Prevents the same milestone banner from re-appearing. | `useMilestones.js` — written when a milestone banner is shown |

Neither of these values is synced to Firestore. A volunteer who clears their cache or uses a new device loses their personal story and will see already-achieved milestone banners again.

### Firebase Storage

Endorsement photos are uploaded to Firebase Storage, not stored in Firestore. The Firestore document stores only the resulting download URL.

- **Bucket CORS config:** Allows `GET`, `POST`, `PUT`, `DELETE`, `HEAD` from `https://wileyfor21.com` and `https://www.wileyfor21.com`
- **Path pattern:** `endorsements/{timestamp}.jpg`
- **No other files** are uploaded to Storage from the current codebase (delegate photos, profile pictures, and documents are not handled)

### Netlify

Volunteer sign-ups submitted through the landing page form (`index.html`) are stored in **Netlify's form submission service**, not in Firebase. They are accessible only through the Netlify dashboard. There is no sync between Netlify form submissions and the Firebase `volunteers` collection.

---

*This audit reflects the state of the codebase as of April 29, 2026. Document counts for all collections require live Firestore access to confirm.*
