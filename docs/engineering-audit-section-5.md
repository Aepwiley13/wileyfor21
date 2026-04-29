# Engineering Audit — Section 5 of 10: Volunteers

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## 1. How many volunteers are currently in the system?

Cannot answer from the codebase — volunteer count lives in Firestore. The admin dashboard scoreboard shows the live count in real time under "Volunteers." Check there or the Firebase console → `volunteers` collection.

---

## 2. What can a volunteer see when they log in? Walk me through their exact view.

The volunteer dashboard is a two-column layout.

### Left column — "Your Contacts Today"

A prioritized list of the delegates assigned to that volunteer. Each delegate appears as a card. The list is sorted automatically: delegates who are `leaning` appear first (highest attention needed), then `engaged`, `identified`, `unknown`, then `committed` and `locked` at the bottom (already won — lower priority). Within each stage, delegates who have not been contacted recently float to the top.

A filter button above the list shows how many delegates have started but not completed their survey ("2 incomplete surveys — follow up"). Clicking it narrows the list to only those delegates.

Each delegate card shows:
- Name, precinct, role
- Current stage badge
- Current leaning (which candidate they support)
- Last contacted date
- Issues they've mentioned
- Candidate rankings (if entered)
- Quick-action buttons: Log Contact, Open Briefing, Send Message

### Right column — Campaign stats and team activity

Top to bottom:

**Scoreboard** — Shows the total committed delegate count in large text, the 53-delegate target with a progress bar, and a stage breakdown with one bar per stage (locked, committed, leaning, engaged, identified, unknown).

**Survey panel** — Shows how many delegates have completed their survey and the top issues across all completed surveys.

**Email templates** — A card for the "Calling All Delegates" email template with a one-click copy button.

**Leaderboard** — Top 5 volunteers ranked by contacts logged in the past 7 days, with medal icons for the top 3. Shows the current volunteer's rank and a nudge ("Make 2 more contacts to pass Sarah").

**Activity feed** — A scrollable list of the 20 most recent contact logs across all volunteers, formatted as short events: "📞 Jane called Marcus · 4 min ago", "✅ COMMITTED — Rosa is with us! · 12 min ago", etc.

### Milestone banner

When the committed delegate count crosses a threshold (10, 20, 30, 40, 46, 50, 53), a full-width coral banner appears at the top of the page with a celebratory message and auto-dismisses after 8 seconds. Each milestone shows only once per browser (tracked in localStorage).

---

## 3. What actions can a volunteer take?

**On a delegate card:**
- **Log a contact** — opens the contact log form (see Q5)
- **Open briefing** — opens a right-side drawer with the delegate's full profile: contact history, leaning history, issues raised, exact words logged, survey answers, and coaching notes
- **Send message** — opens a text/email composer with nine pre-written message topics to choose from (Obama story, Stericycle fight, housing, healthcare, peanut butter bill, Michelle Obama connection, West Side story, Brockovich comparison, or custom). Copies the message to clipboard or opens native SMS/email.
- **Change candidate rankings** — an inline ranking editor on the card lets the volunteer record which candidates the delegate is ranking and in what order
- **Use the call script wizard** — a six-step guided call flow (see Q5) with coaching tips at each step

**Globally:**
- **Filter contacts** by incomplete survey status
- **Sign out**
- **Navigate to main site** or delegate hub (links in top bar)
- Admins also see a link to the admin dashboard in the top bar

---

## 4. How does a volunteer see their assigned contacts?

The volunteer dashboard queries Firestore for `delegates` where `assignedTo array-contains currentUser.uid`. Only delegates where the volunteer's UID is in the `assignedTo` array are returned — they cannot see anyone else's delegates.

The results are sorted client-side by stage priority (leaning first, committed last) and then by last-contacted date within each stage (oldest contact first). The intent is that the top of the list is always who needs attention most urgently.

The survey filter further narrows to delegates where `survey.startedAt` exists but `survey.completed` is false — indicating a delegate who began the survey but did not finish.

---

## 5. How does the volunteer outreach flow work — what happens when they contact someone?

### Standard contact log

1. Volunteer finds the delegate card and clicks "Log Contact"
2. A form appears (modal or inline) with these fields:
   - **Method** — call, text, email, in person, event
   - **Outcome** — great, good, neutral, skeptical, difficult, hostile, no answer
   - **Leaning toward** — which candidate they mentioned supporting
   - **Issues raised** — multi-select pills (housing, public safety, transit, education, jobs, homelessness, environment, immigration)
   - **Exact words** — verbatim quote textarea
   - **Mentioned another candidate** — toggle + name field if yes
   - **Was an Ord supporter** — toggle
   - **Advance stage?** — only shown if outcome is great or good; yes / no / not yet
   - **Next action** — dropdown (follow up in 3 days, 1 week, send policy brief, invite to event, schedule call with Aaron, no action needed)

3. On submit, two writes happen immediately:
   - A new document is added to `contactLogs` with all fields above plus `stageBeforeContact` and `stageAfterContact`
   - The delegate's document is updated: `lastContactedAt`, `lastContactedBy`, `stage` (if changed), `contactHistory` (appended), `issuesRaised` (appended), `exactWordsLogged` (appended), `wasOrdSupporter` (if flagged)

4. The Cloud Function `onContactLogCreated` fires server-side and:
   - Increments `delegates/{id}.totalContacts` by 1
   - Updates `currentLeaning` and appends to `leaningHistory`
   - Applies the stage change to `stage` and `stageHistory` (with volunteer name + timestamp)
   - Recalculates `campaignStats/live` by re-reading all delegates and summing by stage and leaning
   - Checks if `committed + locked` has crossed any milestone threshold (10, 20, 30, 40, 50, 53); if so, creates a document in `milestones/{count}` (idempotent — only written once per threshold)

**Stage transitions that happen automatically:**
- Outcome = `hostile` → stage forced to `not_winnable`
- Current stage = `unknown` + any outcome except no-answer → auto-advances to `identified`
- Aaron ranked #1 → stage advances to `committed` (if currently lower)
- Aaron ranked #2 → stage advances to `leaning` (if currently lower)
- Volunteer explicitly selects "advance stage: yes" → moves one step up the sequence

### Call script wizard (alternative flow)

Instead of the plain contact log form, a volunteer can use the guided call script wizard:

1. **Opening** — script to introduce themselves and ask if the delegate has a minute
2. **Build Rapport** — ask why they wanted to be a delegate; tips on listening
3. **Issues** — ask what issues matter most; tips on connecting to Aaron's platform
4. **Their Questions** — script covering Aaron's background (Rose Park, Obama campaign, Weiler race); tips on handling tough questions
5. **The Ask** — ask who they're planning to support; coaching on soft commits vs. undecided
6. **Close** — confirm follow-up; script for a warm ending

Each step has a script, coaching tips, and a notes textarea. After the final step, a review screen shows all six notes before saving. The wizard saves to `callScriptLogs` (a separate collection) and then opens the standard contact log form for the outcome and leaning details.

---

## 6. What data is tracked per volunteer?

### On the volunteer's own document in `volunteers/{uid}`

| Field | What it tracks |
|---|---|
| `firstName`, `lastName`, `name` | Display name |
| `email`, `phone` | Contact info |
| `houseDistrict` | Which district they're in |
| `role` | `"volunteer"` or `"admin"` |
| `preferredMethod` | call / text / email |
| `whyVolunteering` | Intake answer |
| `assignedDelegates` | Array of delegate IDs (note: this is a separate field from `delegates.assignedTo` — see flag below) |
| `totalContacts` | Count of contacts (set at 0 on signup; incremented by Cloud Function) |
| `stageUpgradesAllTime` | Count of stage advances they caused (set at 0 on signup; incremented by Cloud Function) |
| `joinedAt` | When they signed up |

### Tracked across other collections

**In `contactLogs`:** Every log the volunteer submits is stored with their `volunteerId` and `volunteerName`. This is the source for the leaderboard (contacts in the past 7 days) and the activity feed.

**Leaderboard ranking:** Computed weekly. The app queries all `contactLogs` where `timestamp >= 7 days ago`, counts documents per `volunteerId`, sorts descending, takes the top 5. The current volunteer's rank is highlighted and a nudge message shows how many more contacts they need to pass the person above them.

---

## Issues to flag

**1. Two contact log forms exist and they behave differently**

The `ContactLogModal` (the pop-up version) and the inline log form inside `DelegateCard` are separate implementations. The modal has an explicit "advance stage?" question; the inline form does not — it auto-advances based on the candidate ranking instead. A volunteer using one form will get different behavior than one using the other. There is no documentation on which to use.

**2. Call script wizard saves to a different collection than contact logs**

The wizard writes to `callScriptLogs`, not `contactLogs`. The Cloud Function that recalculates stats, updates delegate fields, and fires milestones only triggers on `contactLogs`. A completed wizard call does not increment `totalContacts`, does not update `currentLeaning`, and does not trigger milestone checks unless the volunteer also fills out the follow-up contact log form. The notes from the wizard are not carried into that form.

**3. Milestone for 46 delegates never fires**

The milestone messages include a threshold for 46 ("WE HAVE THE MINIMUM TO WIN"), but the Cloud Function checks the list `[10, 20, 30, 40, 50, 53, 60, 70]`. The number 46 is not in that list. The message was written but the trigger was never added.

**4. Activity feed is global — no privacy scoping**

The activity feed shows the 20 most recent contact logs from all volunteers across the entire campaign. A volunteer can see which delegates other volunteers are contacting and what the outcomes were. This may be intentional (team visibility), but it is worth confirming — if a volunteer is assigned sensitive delegates (e.g., persuadable holdouts), their contact activity is visible to everyone.

**5. `assignedDelegates` on the volunteer document is not used**

The volunteer signup writes `assignedDelegates: []` to the volunteer document. But the actual assignment system works the other direction — volunteer UIDs are stored in `delegates.assignedTo`. The `assignedDelegates` field on the volunteer document is never written to by the assignment UI and is not read by any query. It is an unused field that exists alongside a working system that does the same thing differently.

**6. Volunteer story is stored only in the browser**

The call script wizard personalizes outreach based on a "volunteer story" (why they support Aaron). This story is saved to `localStorage` in the browser under the key `wileyfor21_volunteer_story`. If the volunteer clears their cache, switches devices, or uses a different browser, the story is gone. It is not stored in Firestore.

**7. Next action dates are calculated but never displayed**

When a volunteer selects "Follow up in 3 days" or "Follow up in 1 week" as a next action, the app calculates a `nextContactDate` and writes it to the contact log. But no UI anywhere reads that field to show the volunteer which delegates need follow-up by when. The data is being collected and discarded.

---

*This audit reflects the state of the codebase as of April 29, 2026. Live volunteer counts require Firestore access.*
