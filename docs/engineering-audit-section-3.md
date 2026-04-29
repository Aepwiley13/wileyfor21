# Engineering Audit — Section 3 of 10: The Admin Dashboard

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## 1. What does the admin dashboard show when Aaron logs in?

The admin dashboard is a single-page interface organized into several sections. All data is live — it updates in real time via Firestore listeners without requiring a page refresh.

### Scoreboard (top of page)

| Metric | How it's calculated |
|---|---|
| Committed / Target | Count of delegates with `stage == "committed"` or `"locked"`, excluding deferred, vacant, and opposing candidates. Target defaults to 53 (read from `campaignStats/live.target`). |
| Progress bar (% to target) | `committed ÷ 53 × 100`, capped at 100% |
| 56% threshold | `ceil(53 × 0.56) = 30` — shows how many more are needed to clear a majority |
| Days until convention | Calculated from April 11, 2026 |
| Active delegates | Total non-vacant, non-opposing, non-deferred delegates |
| Deferred count | Delegates flagged `isDeferred: true` |
| Volunteer count | Total documents in `volunteers` collection |
| Stage breakdown | Count per stage: `locked`, `committed`, `leaning`, `engaged`, `identified`, `unknown`, `not_winnable` — each filtered to exclude deferred/vacant/opposing |

### Delegate Table

A full-page table of every delegate record with the following columns per row:

- **Name** — delegate's full name; vacant seats show as empty
- **Precinct** — precinct code (e.g., `SLC031`)
- **Role** — precinct role (e.g., `P Chair`, `P Vice`, `PLEO`)
- **Phone / Email / Address** — contact info
- **Stage** — inline dropdown selector (`unknown` → `locked`); changes save immediately to Firestore
- **Assigned To** — chip list of assigned volunteer names with a `+` button to add more and `×` to remove; changes save immediately
- **Conflict of Interest** — flag badge shown when `conflictOfInterest: true` (currently only Jeneanne Lock)

Delegates are split into two views toggled by a button: **Active** (default) and **Deferred**. Deferred delegates do not appear in the active table.

### Volunteer Contact Distribution

A collapsible section listing every volunteer and their assigned delegates. For each volunteer:

- Name, email, role
- Count of assigned delegates
- Expand row to see the full delegate list
- **Copy List** — copies a formatted plain-text contact sheet (name, precinct, phone, email, address per delegate)
- **Copy SMS** — copies a shorter SMS-format list (name + phone only)
- **Email List** — opens `mailto:` with the body pre-populated

### Convention Thank-You (email + text outreach)

A section for sending personalized convention day messages to delegates. For each delegate with an email or phone:

- **Email mode** — generates a full HTML email personalized with the delegate's first name; includes convention logistics (Highland High School, April 11, check-in 8 AM, District 21 breakout 1:40 PM, voting 2 PM), and a ranked-choice ask
- **Text mode** — generates a short SMS version of the same message
- **Copy** — copies HTML email or plain text to clipboard
- **Open in Gmail** — opens Gmail compose pre-filled with the recipient's address and subject; body must be pasted
- **Open SMS** — opens the native SMS app with the recipient's number and message pre-filled

Hardcoded endorsements in the email body: Sandra Hollins, Ashlee Matthews, Rosalba Dominguez, Natalie Pinkney, Liban Mohamed, David Hollins.

### Post-Convention Nominee Outreach

Same structure as the Convention Thank-You section but for a different message — a follow-up email/text sent after the nomination. Subject line: *"14 Days Later — We're Still Just Getting Started ⚡"*. Filtered to delegates who have an email or phone, excluding vacant seats and opposing candidates. Supports the same Copy / Gmail / SMS actions.

### CSV Import Panel

A section for importing delegate lists from a CSV file. Covered in detail in Q2.

---

## 2. What actions can Aaron take from the admin dashboard?

### Delegate Management

**Add a delegate manually**
Opens a modal with fields: Full Name (required), Precinct, Role, Phone, Email, Address. Creates a new document in `delegates` with `stage: "unknown"` and all tracking fields initialized to zero/empty.

**Edit a delegate**
Same modal, pre-filled. Updates name, precinct, role, phone, email, address. Does not touch stage history, leaning history, contact count, or assignment — those are preserved.

**Delete a delegate**
Permanent delete with a confirmation prompt. Removes the document from `delegates`. Cannot be undone.

**Change a delegate's stage**
Inline dropdown in the table. Selecting a new stage immediately writes to Firestore and appends a history record: `{ stage, changedAt, changedBy: "admin" }`.

**Assign / unassign a volunteer to a delegate**
`+` button on each delegate row opens a dropdown of unassigned volunteers. Clicking one adds them. `×` on existing chips removes them. Both use Firestore `arrayUnion` / `arrayRemove`.

**Defer / undefer a delegate**
Checkbox selection + "Defer selected" button. Deferred delegates are hidden from the active table and excluded from all scoreboard metrics. "Defer all P Vice" button defers every delegate whose role contains "P Vice" in one operation.

**Bulk assign**
Select multiple delegates via checkboxes, pick a volunteer from the bulk-assign dropdown, click Assign. Adds that volunteer to all selected delegates' `assignedTo` arrays.

### CSV Import

**Import delegates from CSV**
Upload a `.csv` file. The importer supports two formats:
- **New format** — columns: `First Name:`, `Middle Name:`, `Last Name:`, `Precinct ABCXXX:`, `Precinct Office:`, `Phone #:`, `Email:`, `Street Address:`, `City:`, `State:`, `Zip:`
- **Legacy format** — columns: `name`, `precinct`, `role`, `phone`, `email`, `address`

Detection is automatic: if any header contains "first name", the new format is used. Each row creates a new document in `delegates` with `stage: "unknown"`. Rows with no name are created as vacant seats. Rows with role containing "PLEO" are flagged `isPLEO: true`. A row for "Jeneanne Lock" is automatically flagged `isOpposingCandidate: true` and `conflictOfInterest: true`.

A progress counter shows `X of Y` rows imported as the file processes.

**Clear all delegates before reimport**
A "Clear Delegates" button deletes every document in the `delegates` collection after a confirmation prompt. Used to do a clean reimport when the source list changes. **This cannot be undone.**

### Outreach

**Send convention day messages**
Pick a delegate from the list, choose email or text mode, copy the personalized message, and send it via Gmail or native SMS.

**Send post-convention nominee messages**
Same flow, different message content. Works for both active and deferred delegates (toggle button to switch views).

**Send volunteer contact sheets**
Expand any volunteer row and copy their delegate list as plain text or SMS format, or open a mailto to send it to them directly.

---

## 3. How is the dashboard data calculated? Where does it come from?

All data comes from three Firestore sources, all listened to in real time via `onSnapshot`:

| Source | Path | What it feeds |
|---|---|---|
| Delegates | `delegates` (full collection) | Scoreboard counts, stage breakdown, delegate table, outreach lists |
| Volunteers | `volunteers` (full collection) | Volunteer count, assignment dropdowns, contact distribution |
| Campaign stats | `campaignStats/live` | `target` field (defaults to 53 if document missing) |

**Scoreboard math (all computed client-side on every update):**
- `committed` = delegates where `stage ∈ {committed, locked}` AND `isDeferred ≠ true` AND `isVacant ≠ true` AND `isOpposingCandidate ≠ true`
- `target` = `campaignStats/live.target` or `53` if not set
- `progressPct` = `min(100, round(committed / target × 100))`
- `voteTarget56` = `ceil(target × 0.56)` = 30 with target of 53
- Stage breakdown = count per stage with same exclusions applied

The `campaignStats/live` document is also written to by Cloud Functions (not the admin dashboard directly). The dashboard reads it but does not write to it.

---

## 4. What is the current state of the dashboard — is everything working, anything broken or incomplete?

### Working correctly

- Real-time scoreboard with all stage/leaning breakdowns
- Inline stage editing with history tracking
- Volunteer assignment (add/remove per delegate, bulk assign)
- Defer/undefer (individual and bulk P Vice)
- Add / edit / delete delegate
- CSV import with progress tracking (both formats)
- Convention thank-you outreach (email + SMS, copy + Gmail + native SMS)
- Post-convention nominee outreach (same)
- Volunteer contact distribution (copy + mailto)

### Issues to flag

**1. No admin route guard in the main app**
Any logged-in volunteer can navigate directly to `/admin` and the UI will render. They cannot save anything (Firestore rules block writes), but they can see the full delegate list, all contact info, and all outreach tools. The route should wrap `AdminDashboard` in a role check, not just an auth check. (Noted in Section 2 — flagging again here because it is most relevant to this dashboard.)

**2. CSV import has no duplicate detection**
Importing the same file twice creates every delegate twice. There is no check against existing records. A reimport requires manually running "Clear All Delegates" first, which is a destructive operation with no undo.

**3. CSV import stops on a bad row**
If any row throws an error during the Firestore write, the import halts at that row. Rows already written are not rolled back. The UI shows a generic "error" status with no indication of which row failed or how many were successfully imported before the failure.

**4. `campaignStats/live` document has no initialization code**
The scoreboard reads `campaignStats/live.target` and falls back to `53` if the document doesn't exist. There is no code that creates this document. If it was never manually created or seeded, the target field silently defaults. The Cloud Functions write other fields to this document (`staleCount`, aggregate counts), but none of them set `target`. This should be verified to exist in the live Firebase project.

**5. Hardcoded opposing candidate**
The name `"Jeneanne Lock"` is matched as a string literal in two places — the CSV importer and the add/edit delegate modal — to auto-flag `isOpposingCandidate` and `conflictOfInterest`. If her name is spelled or capitalized differently in an imported CSV, the flag won't be set. This should be a data field, not a name match.

**6. Hardcoded endorsement list in convention email**
The six endorser names in the convention thank-you email are written directly into the email template function. Updating them requires a code change and redeployment.

**7. Convention date is hardcoded**
`CONVENTION_DATE` is a constant in the source. The "days until convention" counter in the scoreboard and the convention email logistics text (April 11, Highland High School, 8 AM check-in) are all hardcoded. The convention has passed (April 11, 2026), so the days counter currently shows a negative number or zero.

**8. `assignedTo` initialized as `null`, not `[]`**
New delegates and CSV-imported delegates get `assignedTo: null`. The assignment code handles this correctly (it calls `arrayUnion`, which Firestore handles), but it means the field type is inconsistent — some documents have `null`, some have an array. The helper function `getAssigned()` handles both cases, but it is a latent data inconsistency worth cleaning up.

---

*This audit reflects the state of the codebase as of April 29, 2026.*
