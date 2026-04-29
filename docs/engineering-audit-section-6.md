# Engineering Audit — Section 6 of 10: The Delegate Experience

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## What the delegate-facing side of the app does

Delegates have their own separate auth flow, dashboard, and survey. This is a distinct persona from volunteers and admins — delegates log in at `/delegate/login`, not `/login`, and land on a different dashboard with different permissions.

---

## Pages and what each one shows

### Delegate Signup (`/delegate/signup`)

A registration form that either creates a new delegate record or links a new auth account to an existing one.

**Form fields:** First name, last name, email, password (min 8 characters), confirm password, phone, neighborhood (optional), precinct (optional), preferred contact method (call / text / email).

**Smart matching:** Before creating anything, the app searches the `delegates` collection by email, then by phone (including a digits-only fallback). If a volunteer-managed record already exists for that person, the new auth account is linked to that existing document — it does not create a duplicate. If no match is found, a new document is created at `delegates/{uid}`.

**What gets written to Firestore on signup:**
- All form fields
- `uid` (Firebase Auth UID)
- `role: "delegate"`
- `linkedAt` (server timestamp)
- `stage: "identified"` (new records only — not overwritten if linking to existing)
- `currentLeaning: null`, `lastContactedAt: null`, `totalContacts: 0`, `leaningHistory: []`, `topIssues: []`, `assignedTo: []`, `joinedAt`

### Delegate Dashboard (`/delegate/dashboard`)

The main screen a delegate sees after logging in. Organized into several cards:

**Welcome card** — Personalized greeting using first name.

**Convention quick-reference** — Date (April 11, 2026), location (Highland High School, 2166 S 1700 E), check-in time (8 AM), credentialing reminder, voting structure, and an explanation of the 60% rule for nominating candidates.

**Survey card** — Shows current survey status (not started / in progress / completed) with a progress bar if in progress. A "Start Survey" or "Continue Survey" button launches the full survey in-page.

**Community voice summary** — Once enough delegates have completed the survey, this shows the top issues across all completed responses — so delegates can see what their peers care about.

**Personal responses summary** — If the delegate has completed the survey, shows their own top priorities and engagement preferences back to them.

**Stay connected** — Link to email the campaign at `utahforwiley@gmail.com`.

**"Where Aaron Stands" card** — Marked "Coming soon." Not yet built. This was intended to show Aaron's positions on the issues delegates care about.

### Delegate Survey — Direct Link (`/delegate/survey?delegate={delegateId}`)

A version of the survey that requires no login. Any delegate who receives a link with their delegate ID in the URL can fill out the survey without creating an account.

On first open, the app writes `survey.linkOpenedAt` to the delegate's record — so the campaign can see that a link was opened even if the survey is not completed.

If the delegate ID is invalid or not found, an error screen is shown instead of the survey.

### Delegate Survey — Authenticated (`/delegate/survey` after login)

The same survey but loaded from the authenticated delegate's own record. Progress is saved automatically as the delegate moves through the steps.

---

## How delegate data flows into the volunteer hub

When a delegate completes their survey, the Cloud Function `onSurveyCompleted` fires and enriches the delegate's document with derived fields — issue tags, westside tags, crime stance, engagement tier, lived experience flags. These fields are what volunteers see in the briefing drawer and what the scoreboard's "survey panel" aggregates.

If a delegate completes the survey but left it partially open more than 48 hours ago, the Cloud Function `staleDelegateSurveyAlert` (scheduled daily at 8 AM MT) flags `surveyFollowUpNeeded: true`. Volunteers can filter their contact list for these delegates to follow up.

---

## Issues to flag

**1. "Where Aaron Stands" is a placeholder**
The card on the delegate dashboard says "Coming soon." A delegate who completes the survey and wants to understand Aaron's positions has nowhere to go in the app. This is a meaningful gap — the survey asks delegates what they care about, and the natural next step is showing them how Aaron aligns with those priorities.

**2. The unauthenticated survey link has no expiry or revocation**
The direct survey link (`/delegate/survey?delegate={id}`) works for anyone with the ID. There is no token, no expiry, and no way to revoke access. A delegate ID that leaks could allow someone to overwrite another delegate's survey responses. The delegate ID is the Firestore document ID, which is not secret.

**3. Delegate signup overwrites stage on new records**
When a delegate signs up and no matching record is found, the new document is created with `stage: "identified"`. But if a volunteer had already moved a delegate to `engaged`, `leaning`, or `committed`, and that record wasn't found by email/phone (e.g., phone was stored differently), a new record would be created at `identified`, splitting the delegate's history across two documents. The matching logic mitigates this but does not eliminate the risk.

**4. No way for a delegate to see who is assigned to them**
The delegate dashboard does not show which volunteer is their point of contact. Delegates have no way to reach back out through the app.

---

*This audit reflects the state of the codebase as of April 29, 2026.*
