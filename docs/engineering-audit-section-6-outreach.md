# Engineering Audit — Section 6 of 10: Outreach & Communications

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## 1. What outreach tools currently exist in the hub?

Nine distinct tools exist. All of them require a human to manually complete the send — the app prepares the message and opens the right application, but it never sends anything autonomously.

| Tool | Who uses it | Channel | What it does |
|---|---|---|---|
| Volunteer text outreach | Volunteer | SMS | Picks a message topic, opens native Messages app with delegate's number and message pre-filled |
| Volunteer email outreach | Volunteer | Email | Same, but opens native email client with delegate's address, subject, and body pre-filled |
| 9 pre-written message topics | Volunteer | SMS or email | One-tap templates covering Obama credential, Stericycle win, housing, healthcare, PNUT board, Michelle Obama connection, West Side contrast, Brockovich story, Ord supporters |
| AI message polish | Volunteer | SMS or email | Volunteer answers 3 questions, Claude Haiku generates a personalized 2–4 sentence message they can copy and send |
| "Calling All Delegates" email | Admin or volunteer | Email via Gmail | Personalized HTML email, copied to clipboard, Gmail compose opened with recipient pre-filled |
| Convention thank-you | Admin | Email + SMS | Day-of message (April 11) with convention logistics and endorser list; two versions — full HTML email and a short/long SMS |
| Post-convention nominee outreach | Admin | Email + SMS | Post-nomination follow-up; covers platform, next steps, volunteer ask |
| Event invite | Admin | Email + SMS | Invites delegate to a Culture Coffee gathering at 285 N 900 W |
| Volunteer contact list distribution | Admin | Email + SMS | Generates a formatted contact sheet for each volunteer listing their assigned delegates; one-click copy or mailto |

The call script wizard (six-step phone guide) is also an outreach tool — it is a reference script for live phone calls, not a message sender.

---

## 2. How does the current email system work? Is it one-at-a-time or bulk?

**One-at-a-time. There is no bulk sending.**

For every single email tool in the hub — volunteer outreach, "Calling All Delegates," convention thank-you, post-convention nominee, event invite — the workflow is:

1. Select one delegate from a list
2. The app generates a personalized HTML email or plain text
3. Click "Copy" — the message is written to the clipboard as rich HTML
4. Click "Open in Gmail" — Gmail compose opens in a new tab with the recipient's address and subject pre-filled
5. Paste the HTML body into the Gmail compose window manually
6. Click Send

There is no API integration with any email service provider. No SendGrid, no Mailchimp, no Postmark. Every email goes through the person's personal Gmail account, one send at a time.

---

## 3. What email campaigns have been built and sent so far? List them.

Four distinct email campaigns have been built (templates exist in code and/or the email-templates directory). Whether they were actually sent is a question for whoever administered the campaign — the codebase has no send history or delivery logs. The templates are:

**1. "Calling All Delegates"**
Subject: *"Yes, Another Campaign Email. Read This One."*
A main outreach email for the convention push. Opens with a self-aware hook ("your finger is hovering over delete"), covers Aaron's background, includes a convention quick-reference card (Highland High, April 11, check-in 8 AM, voting 2 PM), and a CTA to fill out the delegate survey. Personalized with first name. Links to `wileyfor21.com/delegate/survey`.

**2. Convention Thank-You (email)**
Subject line not defined in code.
Day-of message for April 11. Thanks the delegate for their #1 ranking, lists endorsers (Hollins, Matthews, Dominguez, Pinkney, Mohamed, David Hollins), reminds them of logistics, mentions snacks at the Aaron Wiley table, and asks them to rank Aaron #1 on their ballot.

**3. Post-Convention Nominee Thank-You (email)**
Subject: *"14 Days Later — We're Still Just Getting Started ⚡"*
A follow-up after winning the nomination. Covers the platform (housing, healthcare, parks, civic power), includes a video link to the convention speech, and pivots to the general election with three goals (introduce Aaron to all HD21 voters, organize the ground game, raise money). The primary date referenced (April 29) has now passed.

**4. Event Invite**
Subject: *"Thank you — and what comes next"*
An invite to a Culture Coffee gathering at 285 N 900 W after the convention. Thanks supporters, acknowledges the other candidates in the race by name (Washburn, Mann, Lock), and invites delegates to connect.

Additionally, there are three SMS versions:
- Convention thank-you short text (160 characters, single SMS)
- Convention thank-you long text (multi-part, pre-voting reminder)
- Event invite text (Culture Coffee details)

The convention thank-you template even includes admin notes embedded in the file: *"Send EMAIL version as broadcast to all delegates at 7:00 AM — Send SHORT TEXT at 7:30 AM — Send STANDARD TEXT at 12:30 PM as a pre-voting reminder."*

---

## 4. How does the text/SMS outreach work?

There are two separate SMS mechanisms, depending on who is using them.

**Volunteer → Delegate (one at a time):**

The volunteer opens a delegate card, selects "Text," picks one of nine pre-written message topics (or writes their own, or uses AI polish), and clicks "Open Messages App." The app constructs an `sms:` URI with the delegate's phone number and the message body URL-encoded, then navigates to it. The device opens its native Messages (or equivalent SMS) app with the number and message pre-filled. The volunteer taps Send.

All non-digit characters are stripped from the phone number before constructing the URI. The app does not add a country code — if a number is stored without `+1`, some devices may not dial correctly.

**Admin → Delegate (one at a time from admin panel):**

Same concept for the convention thank-you, post-convention, and event invite SMS flows. Admin selects a delegate, the appropriate text is generated with their first name substituted in, and clicking "Open in SMS" launches `sms:+1{digits}?body={encoded text}`. The `+1` prefix is hardcoded.

**No bulk SMS.** There is no Twilio integration, no shortcode, no mass-text platform. Every text message goes out from a personal phone, one at a time.

---

## 5. What does "Copy List" and "Copy SMS" do in the volunteer view?

These two buttons appear in the admin dashboard's **Volunteer Contact Distribution** section, not in the volunteer's own view. Each volunteer gets a row, and expanding that row shows their assigned delegates.

**"Copy List"** generates a full plain-text contact sheet for that volunteer and copies it to the clipboard. The format:

```
Hi [Volunteer First Name],

Here is your contact list for the Wiley for HD21 campaign.
Please reach out to each person below before the April 11 caucus.

YOUR DELEGATES (N):

1. [Delegate Name]
   Precinct: [Precinct] — [Role]
   Phone: [Phone]
   Email: [Email]
   Address: [Address]

2. ...

Questions? Reply to this email or reach out to the campaign.
Thank you for your help!
```

After copying, the admin's email client opens addressed to the volunteer with the subject "Your Delegate Contact List — Wiley for HD21" and the same text in the body.

**"Copy SMS"** generates a shorter version designed for a text message and copies it to the clipboard:

```
Hi [First Name]! Your Wiley HD21 call list (N delegates):

1. [Delegate Name] – [Phone]
2. ...

Questions? Text or call Aaron's campaign. Thanks!
```

This does not open an SMS app — it only copies to clipboard. The admin then pastes it manually wherever they want to send it.

---

## 6. Are emails sent through Gmail, a third party, or something else right now?

**Gmail, via copy-paste.** There is no third-party email service integrated into the app.

The workflow for every HTML email in the hub is: copy the rendered HTML to the clipboard using the browser Clipboard API (`ClipboardItem` with `text/html` MIME type), then open `https://mail.google.com/mail/?view=cm&to={address}&su={subject}` in a new tab. The recipient and subject are pre-filled. The user pastes the HTML body from their clipboard into the compose window and clicks Send.

This means:
- Every email is sent from the personal Gmail account of whoever is using the admin panel
- There are no delivery receipts, open tracking, or unsubscribe management
- There is no "From: Aaron Wiley Campaign" branding — the From address is whoever is logged into Chrome
- Gmail's own daily send limits apply (typically 500 emails per day for a personal Gmail account, 2,000 for Google Workspace)

The plain-text volunteer outreach emails (from the delegate card) work via `mailto:` — same concept but opens whatever email client is the device default rather than specifically Gmail.

---

## 7. What is the current limit on how many people we can email at once?

**Effectively one.** There is no bulk email capability anywhere in the application.

The Gmail copy-paste approach means each email requires a separate human action: select delegate, copy HTML, open Gmail, paste, send. With 75 delegates in the system, sending the "Calling All Delegates" email to every one of them would require 75 individual compose-and-send operations.

Gmail itself imposes daily limits on top of this — 500 sends per day for a personal `@gmail.com` account, 2,000 per day for Google Workspace accounts. At the scale of a district convention (75 delegates), this is not a practical constraint. But it is a hard ceiling that would matter if the list grew.

There is no workaround for this in the current system. Adding bulk email capability would require integrating a service like SendGrid, Mailchimp, or Gmail's batch send API — none of which are currently connected.

---

*This audit reflects the state of the codebase as of April 29, 2026.*
