# Engineering Audit — Section 8 of 10: Current Integrations

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## 1. Gmail / Google

**Partially built.**

The hub opens Gmail but does not connect to it through an API. There is no OAuth, no service account, no Gmail API key, and no Google Workspace integration anywhere in the codebase.

**How it works:**
When an admin or volunteer clicks "Open in Gmail," the app constructs a URL in this format:

```
https://mail.google.com/mail/?view=cm&to={recipient}&su={subject}
```

That URL opens Gmail compose in a new browser tab with the `To` and `Subject` fields pre-filled. The email body has already been copied to the clipboard using the browser Clipboard API. The user must manually paste the body into the compose window and click Send.

**What flows in / out:**
- **Out:** The recipient's email address and the subject line are passed as URL parameters. Nothing is written to Google's systems by the app itself.
- **In:** Nothing. The app receives no response, no delivery confirmation, and no read receipts from Gmail.

**Is it working correctly?**
The Gmail URL construction and clipboard copy work as designed. However, there are two reliability issues:

1. The clipboard copy uses `ClipboardItem` with a `text/html` MIME type, which is only supported in Chrome and Edge. In Firefox or Safari, it falls back to copying plain text — meaning the HTML formatting is lost when pasted.
2. The Gmail URL approach requires the user to be logged into Gmail in the same browser. If they are not, they land on the Gmail login page and the compose window never opens. The app has no way to detect or handle this.

---

## 2. Constant Contact

**Not connected.**

No reference to Constant Contact exists anywhere in the codebase — no API key, no SDK import, no webhook, no mention in any configuration file.

---

## 3. Luma

**Not connected.**

No reference to Luma exists anywhere in the codebase.

---

## 4. Zapier

**Not connected.**

No reference to Zapier exists anywhere in the codebase — no webhook URLs, no Zap triggers, no API keys.

---

## 5. Other integrations

### Firebase — Connected and active

The primary backend. Four Firebase services are in use:

**Firebase Authentication**
Handles all sign-in and sign-up flows for volunteers, admins, and delegates. Email/password only. Working correctly.

**Firestore**
The primary database for all campaign data (delegates, contact logs, volunteers, stats, milestones, endorsements, call script logs). Real-time listeners keep the dashboards live. Working correctly, with the caveats noted in Section 7 (missing Firestore rules for `callScriptLogs`, the `campaignStats/live` document may not exist, and composite indexes for scheduled Cloud Functions may not be set up).

**Firebase Storage**
Stores endorsement photos uploaded through the public endorsement form. CORS is configured for `wileyfor21.com`. Working correctly for uploads. The edit/delete path is broken because Firestore rules deny updates to the `endorsements` collection.

**Firebase Cloud Functions**
Five server-side functions deployed to Firebase:
- `onContactLogCreated` — triggers on every new contact log
- `staleDelegateAlert` — runs every 24 hours
- `onSurveyCompleted` — triggers when a delegate finishes their survey
- `staleDelegateSurveyAlert` — runs daily at 8 AM MT
- `clearSurveyFollowUpFlag` — triggers when a survey completes

Status: the scheduled functions (`staleDelegateAlert`, `staleDelegateSurveyAlert`) are likely failing due to missing composite Firestore indexes (see Section 7). The trigger-based functions should be working if the `campaignStats/live` document exists.

---

### Anthropic (Claude API) — Connected and active

The `improve-message` Netlify Function calls the Anthropic API to generate personalized volunteer outreach messages.

**How it connects:** Server-side HTTP POST from the Netlify Function to `https://api.anthropic.com/v1/messages`. The API key (`ANTHROPIC_API_KEY`) is stored as a Netlify environment variable and never exposed to the browser.

**What flows in:** Volunteer's name, why they support Aaron, what issues matter to them, and a brief personal background.

**What flows out:** A 2–4 sentence plain-text outreach message addressed to `[DELEGATE_NAME]`, ending with `"The convention is April 11 — I hope you'll join me in supporting Aaron. wileyfor21.com"`.

**Is it working correctly?** The function itself is structurally sound. One content issue: the convention date in the generated message (`"April 11"`) is hardcoded in the prompt and is now past. Every message the AI generates currently contains stale copy.

---

### Stripe — Connected (payment link only)

A Stripe-hosted donation checkout page is embedded as a button on the public landing page and in the app.

**How it connects:** A hardcoded URL pointing to a Stripe-hosted checkout page (`https://buy.stripe.com/...`). Clicking the button navigates the user to Stripe's servers. There is no Stripe API key, no server-side code, and no webhook in the campaign hub.

**What flows in / out:** The user leaves the campaign site and completes their donation on Stripe's hosted page. No donation data flows back into the hub. There is no record of who donated or how much anywhere in Firebase or the codebase.

**Is it working correctly?** Yes, for its intended purpose (taking someone to a donation page). It is purely a link — nothing to break on the campaign's side.

---

### Netlify Forms — Connected and active

The volunteer signup form on the public landing page (`index.html`) is a Netlify Form. Netlify intercepts the POST request and stores submissions in the Netlify dashboard.

**How it connects:** The HTML form has `data-netlify="true"`. Netlify's CDN automatically processes the submission. No API key or server-side code is required.

**What flows in / out:** Form fields submitted (name, email, phone, address, volunteer interests) are stored in Netlify. Nothing flows into Firebase — these submissions do not create volunteer accounts in the hub.

**Is it working correctly?** Yes, submissions are being captured in Netlify. The gap is downstream: there is no process to move those signups into the volunteer hub automatically.

---

### Google Fonts — Connected (CDN only)

Barlow and Barlow Condensed typefaces are loaded from Google's font CDN via `<link>` tags in the landing page `<head>`. No API key. No data flows in either direction beyond the browser downloading font files.

---

## Summary

| Integration | Status | Notes |
|---|---|---|
| Gmail / Google | Partially built | Opens compose via URL; no API; clipboard paste required; broken on Firefox/Safari |
| Constant Contact | Not connected | — |
| Luma | Not connected | — |
| Zapier | Not connected | — |
| Firebase Auth | Connected ✓ | Working |
| Firestore | Connected ✓ | Working; index and init issues noted in Section 7 |
| Firebase Storage | Connected ✓ | Working for uploads; edit/delete broken by rules |
| Firebase Cloud Functions | Connected ✓ | Trigger functions likely working; scheduled functions may be failing (missing indexes) |
| Anthropic (Claude API) | Connected ✓ | Working; convention date in generated messages is stale |
| Stripe | Connected ✓ | Payment link only; no data returns to hub |
| Netlify Forms | Connected ✓ | Captures signups; no sync to Firebase |
| Google Fonts | Connected ✓ | CDN only; no data exchange |

---

*This audit reflects the state of the codebase as of April 29, 2026.*
