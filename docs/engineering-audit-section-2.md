# Engineering Audit — Section 2 of 10: Authentication & Roles

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## 1. How do users log in? Walk me through the exact login flow.

There are two separate login paths — one for volunteers/admins, one for delegates. Both use Firebase email/password authentication.

### Volunteer Login (`/login` → `LoginPage.jsx`)

1. User enters email and password and submits the form.
2. `signIn(email, password)` is called from the `useAuth` context hook.
3. Firebase's `signInWithEmailAndPassword()` runs. If credentials are wrong, Firebase throws an error and the form shows it.
4. On success, the user object is immediately set with just `uid`, `displayName`, and `email` — **role is not known yet.**
5. The user is navigated to `/volunteer`.
6. In parallel, the `onAuthStateChanged` listener fires. It reads `volunteers/{uid}` from Firestore and fetches the `role` field. The user object is then updated with the role. This happens asynchronously — the volunteer page is already loading while this fetch runs.

### Delegate Login (`/delegate/login` → `DelegateLoginPage.jsx`)

Identical logic to volunteer login, except the user is redirected to `/delegate/dashboard` after signing in.

### Password Reset (`/forgot-password` → `ForgotPasswordPage.jsx`)

User enters their email. Firebase's `sendPasswordResetEmail()` is called. Firebase sends a reset link to that address.

### Mock Mode (development only)

If `VITE_USE_MOCK=true` is set in the environment, `signIn()` skips Firebase entirely and sets a hardcoded mock user object. This only applies in local development.

---

## 2. What roles exist in the system today? List every role and what each one can and cannot do.

Three roles exist. The exact role strings (case-sensitive) are: `"volunteer"`, `"admin"`, and `"delegate"`.

### `"volunteer"` — Standard campaign volunteer

**Can:**
- Log in and access the volunteer dashboard (`/volunteer`)
- View all delegate records (read-only from Firestore)
- Create contact log entries for their own interactions (`contactLogs` — own records only)
- View the activity feed, leaderboard, and campaign stats
- Access the call script wizard and delegate survey pages
- View their own volunteer profile document

**Cannot:**
- Edit or delete other users' contact logs
- Write to delegate records (no direct edit; only Cloud Functions update delegates)
- Access the admin dashboard (redirected away at the route level in the hub; blocked by Firestore rules in the main app)
- Read other volunteers' profile documents
- Write to `campaignStats`, `milestones`, or `candidates` collections

### `"admin"` — Campaign administrator

**Can do everything a volunteer can, plus:**
- Access the admin dashboard (`/admin`)
- Import delegates via CSV
- Write to delegate records (create, update, delete)
- Update and delete any contact log
- Read all volunteer profile documents
- Write to `candidates` collection

**Cannot:**
- Write directly to `campaignStats` or `milestones` — those are locked to Cloud Functions only, even for admins

### `"delegate"` — Convention delegate with a personal account

**Can:**
- Log in and access the delegate dashboard (`/delegate/dashboard`)
- View their own profile and survey status
- Complete the delegate survey (via authenticated page or unique link)
- Submit endorsements (public, no auth required)

**Cannot:**
- Access the volunteer or admin dashboards
- View other delegates' records
- Write to contact logs, campaign stats, or any volunteer-facing collections

> **Note:** The `"delegate"` role is stored in the `delegates` Firestore collection, not `volunteers`. The admin `isAdmin()` check only looks in `volunteers`, so a delegate account can never accidentally gain admin access.

---

## 3. How are new users approved or denied access?

**Signup is fully open. There is no approval step.**

When a new volunteer signs up, their account is created immediately via Firebase Auth and a Firestore document is written with `role: "volunteer"`. They are navigated to the dashboard in the same request. No email verification, no admin review, no status flag.

Same for delegates — signup is immediate, with `role: "delegate"` set on creation.

There is no `status`, `approved`, or `pending` field anywhere in the user data model. There is no admin interface for reviewing or approving accounts. Anyone who reaches the signup page and submits valid credentials gets full volunteer-level access instantly.

The delegate signup does include one smart check: it searches existing delegate records by email and phone to see if a volunteer already created a record for that person. If a match is found, it links the new auth account to the existing delegate document rather than creating a duplicate. This is matching logic, not an approval gate.

---

## 4. Where are users stored? What does the user data structure look like in Firestore?

Users are split across two Firestore collections depending on their type.

### `volunteers/{uid}` — Volunteers and admins

Document ID is the Firebase Auth UID. Created at signup.

| Field | Type | Notes |
|---|---|---|
| `firstName` | string | |
| `lastName` | string | |
| `name` | string | Concatenated first + last |
| `email` | string | |
| `phone` | string | |
| `houseDistrict` | number | Utah House district number (e.g., 21) |
| `role` | string | `"volunteer"` on creation; manually changed to `"admin"` to elevate |
| `preferredMethod` | string | `"call"`, `"text"`, or `"email"` |
| `whyVolunteering` | string | Optional intake answer |
| `assignedDelegates` | array | Delegate IDs assigned to this volunteer |
| `totalContacts` | number | 0 on creation; incremented by Cloud Function |
| `stageUpgradesAllTime` | number | 0 on creation; incremented by Cloud Function |
| `joinedAt` | timestamp | Server timestamp at signup |

### `delegates/{delegateId}` — Delegate accounts

Document ID is either the Firebase Auth UID (if self-registered) or a volunteer-assigned ID (if the record was created by staff before the delegate signed up). Created at signup or by admin CSV import.

| Field | Type | Notes |
|---|---|---|
| `firstName` | string | |
| `lastName` | string | |
| `name` | string | Concatenated first + last |
| `email` | string | |
| `phone` | string | |
| `neighborhood` | string | Optional |
| `precinct` | string | Optional, e.g. `"SLC031"` |
| `role` | string | `"delegate"` |
| `preferredMethod` | string | `"call"`, `"text"`, or `"email"` |
| `uid` | string | Firebase Auth UID (set when delegate creates an account) |
| `linkedAt` | timestamp | When the delegate created their account |
| `stage` | string | Outreach stage: `unknown`, `identified`, `engaged`, `leaning`, `committed`, `locked`, `not_winnable` |
| `currentLeaning` | string \| null | Which candidate they are leaning toward |
| `lastContactedAt` | timestamp \| null | Set by Cloud Function on each contact log |
| `totalContacts` | number | Incremented by Cloud Function |
| `leaningHistory` | array | History of leaning changes |
| `topIssues` | array | Issues raised during contacts |
| `assignedTo` | array | Volunteer IDs assigned to this delegate |
| `joinedAt` | timestamp | |

Additional fields added by Cloud Functions after survey completion: `issueTags`, `westsideTags`, `crimeStance`, `engagementTier`, `needsVolunteerFollowUp`.

**How to promote a volunteer to admin:** There is no UI for this. An admin (or someone with direct Firestore access) must manually update the `role` field in the `volunteers/{uid}` document from `"volunteer"` to `"admin"`.

---

## 5. Are there any pending access requests in the system right now?

No. The system has no concept of pending access requests. There is no queue, no approval workflow, no `status` field, and no admin UI for managing account requests.

Every user who has created an account has immediate, active access at their assigned role level.

---

## Flag for Aaron

One issue worth noting: **the `/admin` route in the main app does not enforce role at the route level.** It wraps `AdminDashboard` in the basic `ProtectedRoute` component, which only checks that a user is logged in — not that they have `role: "admin"`. The actual protection falls entirely on Firestore security rules.

The older `hub/` app handles this correctly with an explicit `<AdminOnly>` route wrapper. The main app should be brought in line with that pattern. A logged-in volunteer who manually navigates to `/admin` will see the admin UI render; they just won't be able to save anything (Firestore will reject writes). That is not ideal.

---

*This audit reflects the state of the codebase as of April 29, 2026.*
