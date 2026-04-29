# Engineering Audit — Section 10 of 10: AI Features, Integrations & Open Issues

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## AI features

### Message improvement (`/.netlify/functions/improve-message`)

The only AI feature currently in the app. It takes a volunteer's raw answers about why they support Aaron and generates a polished 2–4 sentence outreach text for them to send to a delegate.

**How it works:**
1. The call script wizard (or volunteer survey flow) collects: why the volunteer supports Aaron, what issues matter to them, a little about themselves, and their name
2. Those inputs are POSTed to the Netlify Function
3. The function calls the Anthropic API (Claude Haiku model) with a campaign-specific system prompt that establishes Aaron's background — Rose Park dad, youth coach, community organizer, first paid employee on Obama's 2008 Utah campaign
4. Claude returns a message starting with "Hi [DELEGATE_NAME]" and ending with "The convention is April 11 — I hope you'll join me in supporting Aaron. wileyfor21.com"
5. The volunteer copies the message and sends it themselves — the app does not send anything on their behalf

**What it costs:** Every call uses the Anthropic API and consumes tokens. The function caps responses at 250 tokens. Claude Haiku is the cheapest model in the Anthropic lineup — cost per call is fractions of a cent — but if many volunteers are generating messages simultaneously there could be noticeable API charges.

**What is not working:** The convention date in the generated message ("The convention is April 11") is hardcoded in the prompt. Now that the convention has passed, every generated message contains stale copy.

---

## Third-party integrations

### Firebase (Google)

**Services in use:** Authentication (email/password), Firestore (primary database), Storage (endorsement photos), Cloud Functions (server-side triggers and scheduled jobs).

**Firebase project ID:** Stored in Netlify environment variables as `VITE_FIREBASE_PROJECT_ID`. Not committed to the repo. Confirm in Firebase console or Netlify dashboard.

**Security model:** Firebase client keys are intentionally public. Security comes from Firestore rules, not key secrecy. The rules are in `hub/firestore.rules`.

### Netlify

**Services in use:** Hosting (the entire public site and React app), Serverless Functions (the `improve-message` AI function), Forms (the volunteer signup form on the landing page).

**Deployment:** Auto-deploys from git commits. Build command: `npm run build`. Output: `dist/`.

**Environment variables stored in Netlify:** All six Firebase client keys (`VITE_FIREBASE_*`) and `ANTHROPIC_API_KEY`.

### Anthropic

**Service:** Claude API — specifically the `claude-haiku-4-5-20251001` model.

**Used for:** Generating personalized volunteer outreach messages.

**API key storage:** `ANTHROPIC_API_KEY` — stored in Netlify environment variables, server-side only. Never exposed to the browser.

### Stripe

**Integration type:** Embedded payment link only. No API key, no server-side code. The donate button is a hardcoded URL to a Stripe-hosted checkout page. Stripe handles everything — no PCI compliance burden on the campaign.

**Donation link:** `https://buy.stripe.com/7sY9ASeNR0tr1Ng25b4ZG01`

### Google Fonts

**Fonts loaded:** Barlow and Barlow Condensed. Loaded from Google's CDN via `<link>` tags in the landing page `<head>`. No API key required.

---

## Open issues summary across all sections

This section collects every significant issue identified in the full audit into one place. Issues are grouped by impact.

### Must fix (broken functionality)

| Issue | Where | Detail |
|---|---|---|
| Endorsement edits fail silently | Section 8 | Firestore rules deny `update` on `endorsements` collection. The edit page exists and is linked from the confirmation screen, but saves will be rejected by Firestore. The submitter gets no useful error message. |
| Milestone 46 never fires | Section 5 | The "WE HAVE THE MINIMUM TO WIN" milestone message exists in constants but the number 46 is missing from the Cloud Function's milestone array `[10, 20, 30, 40, 50, 53, 60, 70]`. It will never trigger. |
| No admin route guard | Sections 2, 3 | The `/admin` route in the main app only checks that the user is authenticated, not that they have `role: "admin"`. Any volunteer can navigate to the URL and see the full admin UI. Firestore rules block destructive writes, but all delegate contact info is visible. |

### Should fix (significant gaps or data integrity risks)

| Issue | Where | Detail |
|---|---|---|
| Stale convention copy everywhere | Sections 3, 9, 10 | The convention date (April 11), the days-until-convention counter, and the AI message ending are all hardcoded. The convention has passed. Multiple screens show negative day counts or invite delegates to a past event. |
| CSV import has no duplicate detection | Sections 3, 4 | Importing the same file twice doubles all delegate records. No check against existing data. Requires destructive "Clear All" before reimport. |
| Call script wizard does not write to `contactLogs` | Section 5 | The wizard saves to `callScriptLogs` — a different collection. Cloud Functions only trigger on `contactLogs`, so wizard calls don't increment contact counts, update leanings, or fire milestones. A volunteer completing a wizard call appears to have done nothing in the stats. |
| Two contact log forms with different behavior | Section 5 | The modal form and the inline card form are separate implementations that compute stage transitions differently. No documentation on which to use. |
| Netlify signups disconnected from hub | Section 9 | People who sign up on the landing page are stored in Netlify — not in Firebase. They must be manually moved into the volunteer hub. There is no integration or notification. |
| `campaignStats/live` document may not exist | Section 3 | No code initializes this document. The scoreboard defaults to `target: 53` if it's missing, but Cloud Functions would fail to `update` a non-existent document. Needs to be confirmed as present in the live Firebase project. |
| Unauthenticated survey link is not revocable | Sections 6, 7 | The direct survey URL uses the Firestore document ID, which is not a secret token. Anyone with a delegate's ID can submit or overwrite their survey. |
| No moderation on endorsements | Section 8 | Endorsements go directly to the public wall with no review. A bad-faith submission appears immediately on the campaign website. |

### Nice to fix (quality and completeness)

| Issue | Where | Detail |
|---|---|---|
| "Where Aaron Stands" is a placeholder | Section 6 | The delegate dashboard has a card labeled "Coming soon" where Aaron's positions should appear. |
| `assignedDelegates` field on volunteer is unused | Section 5 | Volunteer documents have an `assignedDelegates: []` field that is never written to or read from. The actual assignment system uses `delegates.assignedTo` in the other direction. Dead field. |
| Next action dates collected but never displayed | Section 5 | Volunteers select "follow up in 3 days" etc. The date is calculated and stored but never surfaced anywhere in the UI. |
| Volunteer story stored in localStorage only | Section 5 | The volunteer's personal "why I support Aaron" story is saved to browser localStorage. Lost on cache clear or device switch. Should be in Firestore. |
| Featured endorsers are hardcoded | Section 8 | Adding or reordering the five featured political endorsers requires a code change and deploy. |
| `_original.html` in build output | Section 9 | A 1.6 MB archive file is publicly accessible and inflates every deploy. Should be excluded. |
| `assignedTo: null` vs `[]` inconsistency | Section 4 | Imported delegates initialize `assignedTo` as `null`; sign-up delegates get `[]`. Both are handled in code but the inconsistency will grow over time. |
| Hub subdirectory is dead code | Section 1 | `hub/src/` is a legacy standalone app that was superseded by the root `src/` app. It still exists in the repo with its own package.json, dependencies, and overlapping Firebase configs. Adds confusion and maintenance surface area. |

---

## What is working well

The core campaign infrastructure is solid and production-ready:

- Real-time delegate tracking with stage history and leaning history
- Contact log → Cloud Function pipeline that keeps stats current without any manual aggregation
- Role-based access (even if the frontend route guard needs tightening)
- CSV import with flexible format support
- Delegate survey with auto-save and follow-up flagging
- Volunteer leaderboard and activity feed providing team visibility
- AI-assisted outreach message generation
- Endorsement wall with photo support
- Mobile-friendly design throughout
- PWA support for offline-capable hub access

The architecture — Netlify for hosting and serverless functions, Firebase for auth/database/storage/backend logic, Vite for the build — is appropriate for a campaign of this scale and was well chosen. The main risks going forward are operational (stale date references, the endorsement edit bug, the CSV import process) rather than architectural.

---

*This completes the 10-section engineering audit. All sections are documented at `docs/engineering-audit-section-[1-10].md` on branch `claude/engineering-audit-infrastructure-6mFzy`. April 29, 2026.*
