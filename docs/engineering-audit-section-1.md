# Engineering Audit — Section 1 of 10: Infrastructure & Hosting

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## 1. Where is the campaign hub hosted and what is the exact URL?

**URL:** `https://wileyfor21.com/`

The React volunteer/delegate hub is served from the same domain. All hub routes (`/volunteer`, `/admin`, `/login`, `/delegate/*`, `/endorse`, `/endorsements`, etc.) are redirected at the CDN edge to `app.html`, which mounts the React app.

---

## 2. What is the hosting environment?

**Netlify.** The project has a `netlify.toml` at the root that configures the build, publish directory, redirects, and Netlify Functions. There is no evidence of a separate server, VPS, or container deployment.

---

## 3. How is the app deployed? Is there a build process or is it a direct file upload?

There is a **build process**, not a file upload.

- **Build command:** `npm run build`
- **Build tool:** Vite 8.0.2
- **Output directory:** `dist/`
- Vite compiles the React app (JSX → optimized JS bundles), then a post-build script copies the static pages (`index.html`, `css/`, `js/`, `images/`, `data/`, `robots.txt`, `sitemap.xml`) into `dist/` alongside the compiled app.
- Netlify auto-deploys on commits to the connected branch. No manual upload step.

The `hub/` subdirectory is a **separate Vite project** (React 18 + Firebase 10) with its own `package.json`. It was an earlier version of the hub and appears to have been superseded by the root `src/` app. It does not appear to be actively deployed to production but still exists in the repo.

---

## 4. What files exist in the project? List every file and what it does.

### Root Config

| File | Purpose |
|---|---|
| `package.json` | Main app deps: React 19, Vite 8, Firebase 12, Tailwind 4, PWA plugin, sharp |
| `netlify.toml` | Netlify build config, 15 SPA redirects, disables secrets scanner for Firebase keys |
| `vite.config.js` | Vite config with React, Tailwind, and PWA plugins |
| `.env.example` | Template listing all required env vars (no real values) |
| `.gitignore` | Excludes `node_modules/`, `dist/`, `.env` files |
| `robots.txt` | Standard crawl permissions |
| `sitemap.xml` | SEO sitemap |

### Public Campaign Pages

| File | Purpose |
|---|---|
| `index.html` | Main campaign landing page — hero, issues, donate (Stripe), volunteer signup form (Netlify Forms), footer |
| `app.html` | React app mount point (`<div id="root">`) — all hub routes load this |
| `caucus.html` | Caucus night event info page |
| `_original.html` | Archived original design (1.6 MB — not served in production) |
| `_archived_candidates.html` | Archived candidate list page |

### Static Assets

| File | Purpose |
|---|---|
| `css/style.css` | 1,114-line stylesheet for the landing page |
| `js/main.js` | Landing page JS — scroll reveal animations, mobile nav toggle, Netlify form handler |
| `images/` | Campaign photos, Aaron portraits, movement images, logos, favicons |
| `public/` | PWA icons (`manifest.json`, various sizes), email templates |
| `data/candidates.json` | Aaron Wiley's candidate metadata (district, party, caucus date/location) |

### Email Templates

| File | Purpose |
|---|---|
| `email-templates/calling-all-delegates.html` | Delegate recruitment email |
| `email-templates/convention-thank-you.html` | Post-convention thank-you (HTML) |
| `email-templates/convention-thank-you.txt` | Post-convention thank-you (plain text) |
| `email-templates/post-convention-nominee.html` | Email for if Aaron wins the nomination |

### React App Source (`src/`)

| File | Purpose |
|---|---|
| `src/main.jsx` | React entry point |
| `src/App.jsx` | Route definitions for all pages |
| `src/index.css` | Tailwind CSS directives |
| `src/lib/firebase.js` | Firebase initialization (reads from VITE_ env vars, supports mock mode) |
| `src/lib/constants.js` | Campaign constants: candidates, delegate stages, issues, milestone thresholds |
| `src/lib/utils.js` | Shared utility functions |
| `src/lib/mockStore.js` | Mock endorsement data for development |

**Pages (`src/pages/`)**

| File | Purpose |
|---|---|
| `LoginPage.jsx` | Volunteer login |
| `SignupPage.jsx` | Volunteer registration |
| `ForgotPasswordPage.jsx` | Password reset |
| `VolunteerDashboard.jsx` | Main volunteer interface — filterable delegate cards, contact logging, activity feed, leaderboard |
| `AdminDashboard.jsx` | Admin-only — CSV delegate import, campaign stats, delegate management |
| `DelegateLoginPage.jsx` | Delegate-specific login |
| `DelegateSignupPage.jsx` | Delegate registration |
| `DelegateDashboard.jsx` | Delegate-only view of their profile and survey status |
| `DelegateSurveyPage.jsx` | Multi-step call script wizard guiding volunteers through delegate conversations |
| `DelegateSurveyDirectPage.jsx` | Unauthenticated delegate survey via unique link (`/delegate/survey?delegate=<id>`) |
| `VolunteerSurveyPage.jsx` | Volunteer intake survey |
| `EndorsementPage.jsx` | Public endorsement submission with photo upload and client-side image compression |
| `EndorsementsWallPage.jsx` | Public endorsement gallery |
| `EndorsementEditPage.jsx` | Edit existing endorsement via unique link |

**Hooks (`src/hooks/`)**

| File | Purpose |
|---|---|
| `useAuth.jsx` | Firebase auth context with role-based access (admin vs. volunteer) |
| `useContacts.js` | Delegate contact management |
| `useCampaignStats.js` | Real-time Firestore listener for campaign-wide stats |
| `useActivityFeed.js` | Real-time activity stream |
| `useLeaderboard.js` | Volunteer leaderboard data |
| `useMilestones.js` | Milestone tracking |
| `useStageSummary.js` | Delegate stage aggregation |
| `useDelegateSurvey.js` | Delegate survey responses |
| `useDelegateInsights.js` | Survey insight derivation |

**Components (`src/components/`)**

| File | Purpose |
|---|---|
| `layout/PublicNav.jsx` | Navigation for public-facing pages |
| `layout/TopBar.jsx` | App header bar |
| `layout/DashboardLayout.jsx` | Multi-panel dashboard layout wrapper |
| `ui/ProtectedRoute.jsx` | Auth gate (redirects unauthenticated users) |
| `ui/ScoreboardPanel.jsx` | Campaign stats display |
| `ui/MomentumBar.jsx` | Progress bar visualization |
| `ui/StageBadge.jsx` | Delegate stage indicator badge |
| `cards/DelegateCard.jsx` | Individual delegate card with stage, leaning, contact buttons |
| `cards/MilestoneBanner.jsx` | Milestone achievement notification |
| `cards/ConflictWarningCard.jsx` | Alert for competing delegates in same precinct |
| `feed/ActivityFeed.jsx` | Real-time activity stream container |
| `feed/FeedItem.jsx` | Single activity feed item |
| `feed/Leaderboard.jsx` | Volunteer rankings display |
| `survey/HD21Survey.jsx` | Delegate survey form |
| `survey/SurveyForm.jsx` | Reusable survey component |
| `survey/CallScriptWizard.jsx` | Step-by-step call guide |
| `modals/ContactLogModal.jsx` | Form to log a volunteer-delegate interaction |
| `modals/BriefingDrawer.jsx` | Slide-out delegate profile and insights panel |

**Data (`src/data/`)**

| File | Purpose |
|---|---|
| `surveyQuestions.js` | Call script stages, coaching text, survey questions |
| `mockFeed.js` | Mock activity feed data for development |
| `mockContacts.js` | Mock delegate data for development |

### Netlify Functions

| File | Purpose |
|---|---|
| `netlify/functions/improve-message.js` | Calls Anthropic API (Claude Haiku) to polish a volunteer's outreach message draft |

### Legacy Hub Subdirectory (`hub/`)

This is an earlier standalone version of the admin hub. It has its own dependencies, Firebase config, and Firebase Cloud Functions. The Cloud Functions here are likely what is deployed to production Firebase.

| File | Purpose |
|---|---|
| `hub/package.json` | Hub-specific deps: React 18, Firebase 10, Vite 5 |
| `hub/vite.config.js` | Hub Vite config |
| `hub/tailwind.config.js` | Custom colors (navy `#034A76`, coral `#F36F6B`) |
| `hub/index.html` | Hub app entry point |
| `hub/firestore.rules` | Firestore security rules for all collections |
| `hub/storage.cors.json` | Firebase Storage CORS configuration |
| `hub/src/App.jsx` | Hub routes |
| `hub/src/lib/firebase.js` | Hub Firebase initialization |
| `hub/src/hooks/useAuth.js` | Hub auth context |
| `hub/src/hooks/useCampaignStats.js` | Hub campaign stats |
| `hub/src/data/surveyMeta.js` | Survey metadata |
| `hub/src/pages/Login.jsx` | Hub login page |
| `hub/src/pages/Signup.jsx` | Hub signup |
| `hub/src/pages/ForgotPassword.jsx` | Hub password reset |
| `hub/src/pages/AdminDashboard.jsx` | Hub admin page |
| `hub/src/pages/VolunteerHome.jsx` | Hub volunteer page |
| `hub/src/components/ProtectedRoute.jsx` | Hub auth gate |
| `hub/src/components/SurveyDetailModal.jsx` | Survey detail viewer |
| `hub/src/components/InlineStageEditor.jsx` | Inline delegate stage editor |
| `hub/scripts/seedCandidates.mjs` | One-time script to seed candidate data |
| `hub/scripts/importDelegates.mjs` | One-time script to import delegate list |
| `hub/scripts/seedCampaignStats.mjs` | One-time script to seed campaign stats |
| `hub/delegates.csv` | Sample delegate data file |
| `hub/functions/index.js` | Firebase Functions entry — exports all 5 functions |
| `hub/functions/onContactLogCreated.js` | Contact log trigger (see Q6) |
| `hub/functions/staleDelegateAlert.js` | Stale delegate scheduled alert (see Q6) |
| `hub/functions/onSurveyCompleted.js` | Survey completion trigger (see Q6) |
| `hub/functions/staleDelegateSurveyAlert.js` | Stale survey scheduled alert (see Q6) |
| `hub/functions/package.json` | Functions deps: firebase-admin 12, firebase-functions 5, Node 20 |

---

## 5. What Firebase project powers this app? What services are active?

**Firebase Project ID:** Not committed to the repository. It is stored as `VITE_FIREBASE_PROJECT_ID` in Netlify's environment variable settings. Confirm the exact value in: Netlify → Site Settings → Environment Variables, or in the Firebase console.

**Active Firebase Services (confirmed by code):**

| Service | Evidence |
|---|---|
| **Authentication** (email/password) | `useAuth.jsx` — sign in, sign up, password reset, role lookup |
| **Firestore** | All hooks and Cloud Functions — primary database |
| **Storage** | `hub/storage.cors.json` — CORS config for file uploads; endorsement photo uploads |
| **Cloud Functions** | `hub/functions/` — 5 deployed functions |

**Firestore Collections:**

| Collection | Read | Write |
|---|---|---|
| `delegates` | Authenticated users | Admins only |
| `contactLogs` | Authenticated users | Create: own record only; Update/Delete: admins |
| `volunteers` | Self or admins | Self or admins |
| `surveyResponses` | Authenticated users | Anyone (public create) |
| `campaignStats` | Authenticated users | Cloud Functions only |
| `candidates` | Authenticated users | Admins only |
| `milestones` | Authenticated users | Cloud Functions only |
| `endorsements` | Anyone (public) | Create: anyone; Update/Delete: none |
| `callScriptLogs` | Volunteers | Volunteers |

---

## 6. Are there any server-side functions? If yes, list each one and what it does.

Yes — **5 Firebase Cloud Functions** and **1 Netlify Function.**

### Firebase Cloud Functions (`hub/functions/`)

**1. `onContactLogCreated`** — Firestore trigger on `contactLogs/{logId}`
- Updates the delegate document: sets `lastContactedAt`, `lastContactedBy`, `currentLeaning`, `stageAfterContact`
- Appends to `leaningHistory`, captures `exactWords` quote, logs `issuesRaised`
- Re-aggregates all delegates to recalculate `/campaignStats/live` (totals by stage and by leaning)
- Fires milestone documents when `committed + locked` crosses 10, 20, 30, 40, 46, 50, 53, 60, or 70

**2. `staleDelegateAlert`** — Scheduled (every 24 hours)
- Queries all non-locked, non-"not_winnable", non-vacant delegates not contacted in 14+ days
- Writes `staleCount` and `staleDelegates[]` to `/campaignStats/live` for dashboard surfacing

**3. `onSurveyCompleted`** — Firestore trigger on `delegates/{delegateId}` writes
- Fires when a delegate document is updated with survey data
- Derives issue tags, westside challenge tags, `crimeStance`, and `engagementTier` from survey answers
- Flags delegate for volunteer follow-up if `engagementTier == "volunteer"`
- Enriches delegate profile with tags for dashboard filtering

**4. `staleDelegateSurveyAlert`** — Scheduled (daily at 8:00 AM MT) + document trigger
- Scheduled: flags delegates who started the survey 48+ hours ago but have not completed it
- Trigger: immediately clears the incomplete-survey flag when a delegate finishes

**5. `clearSurveyFollowUpFlag`** — Trigger (co-exported from `staleDelegateSurveyAlert.js`)
- Clears the stale survey flag on a delegate as soon as their survey is marked complete

### Netlify Function (`netlify/functions/`)

**6. `improve-message`** — HTTP POST endpoint
- Accepts: `volunteerName`, `whySupporting`, `issues`, `aboutMe`
- Calls Anthropic API (Claude Haiku) with a campaign-specific prompt
- Returns a polished 2–4 sentence outreach message the volunteer can send to a delegate
- Used by the call script wizard to help volunteers personalize their messages

---

## 7. What third-party APIs or services are connected right now?

| Service | Purpose | Where |
|---|---|---|
| **Firebase** (Google) | Auth, Firestore database, Storage, Cloud Functions | `src/lib/firebase.js`, `hub/functions/` |
| **Anthropic (Claude API)** | AI-polished volunteer outreach messages | `netlify/functions/improve-message.js` |
| **Stripe** | Campaign donations — embedded checkout link, no server-side integration | Hardcoded link in `index.html`, `app.html` |
| **Google Fonts** | Barlow and Barlow Condensed typefaces | CDN `<link>` in `index.html` |
| **Netlify Forms** | Volunteer sign-up form submissions on the landing page | `index.html` `<form data-netlify="true">` |

---

## 8. What API keys exist and where are they stored?

| Key | Purpose | Where stored |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase client SDK auth | Netlify environment variables |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Netlify environment variables |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project identifier | Netlify environment variables |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | Netlify environment variables |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging | Netlify environment variables |
| `VITE_FIREBASE_APP_ID` | Firebase app identifier | Netlify environment variables |
| `ANTHROPIC_API_KEY` | Anthropic Claude API (improve-message function) | Netlify environment variables (server-side only — never sent to browser) |

**No secrets are committed to the repository.** Only `.env.example` (a template with empty values) exists in git. This is correct.

**Note on Firebase keys:** The `VITE_` prefixed Firebase keys are intentionally public — they are client-side identifiers, not secrets. Security is enforced by Firestore rules (which restrict access by auth role), not key secrecy. The `netlify.toml` explicitly disables Netlify's secrets scanner for this reason.

**The only true secret** is `ANTHROPIC_API_KEY`, which is used server-side only (inside a Netlify Function) and is never exposed to the browser.

---

*This audit reflects the state of the codebase as of April 29, 2026. The Firebase project ID and live Netlify site name are not committed to the repo and should be confirmed from the Netlify and Firebase dashboards.*
