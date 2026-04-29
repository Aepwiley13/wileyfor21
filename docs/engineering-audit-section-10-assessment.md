# Engineering Audit — Section 10 of 10: Engineering Assessment

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## 1. On a scale of 1–10, how stable is the current codebase?

**5 out of 10.**

The architecture is solid. Netlify + Firebase is a good choice for this scale, the real-time Firestore listeners work well, and the core happy path — volunteer logs in, sees their delegates, logs a contact — works reliably. The platform ran through a real convention and did its job.

But a 5 is honest, not generous. Here is why it is not higher:

Several features appear to work but silently fail. The endorsement edit page, the call script wizard, and possibly the entire scheduled Cloud Function pipeline are broken in ways that produce no visible error. A user completes the wizard and sees a success screen. An endorsement submitter clicks Save on their edit. An admin looks at the stale delegate panel. All three believe something happened. None of them can tell that it didn't.

The `campaignStats/live` document is a single point of failure with no initialization code. If it does not exist — or if it is ever accidentally deleted — the contact log Cloud Function fails on every trigger, silently. No stat updates. No milestones. No leaning counts. The dashboard looks normal because it is displaying the last values that were written before the failure.

There is no error monitoring. The system has no way to tell anyone when something breaks. The only way to know is to look at Firebase Functions logs and notice.

The codebase is also showing clear signs of having been built at campaign pace: two contact log implementations, a 2,500-line admin file, dead code sitting alongside live code, and data split across localStorage, Firestore, and Netlify with no bridge. None of these are crises, but they compound the difficulty of every future change.

A 5 means: it works when it works, but we do not fully know what is working and what is not.

---

## 2. What would break first if we added 1,000 new contacts tomorrow?

The Cloud Function `onContactLogCreated` would become the bottleneck, and potentially start failing.

Every time a volunteer logs a contact, that function runs a full read of the entire `delegates` collection to recalculate `campaignStats/live`. With 75 delegates, that is 75 document reads per contact log — acceptable. If the contact list grew to 1,000 delegates and volunteers were logging contacts rapidly, every single contact log submission would trigger 1,000 Firestore reads. At sustained pace, this would hit Firestore's per-second operation limits, generate significant cost, and introduce latency into what currently feels like an instant operation.

The second thing that would strain: the volunteer dashboard's `useStageSummary` hook subscribes to the entire `delegates` collection via a real-time listener. Every change to any delegate document pushes an update to every connected volunteer's browser. At 1,000 delegates with active contact logging, every user's browser would be receiving constant updates. This is not how Firestore real-time listeners are meant to be used at scale.

The leaderboard query — which reads all `contactLogs` from the past 7 days — would also grow linearly. At 1,000 logs per week, it is still manageable. At 10,000, it becomes slow.

What would not break: the actual contact log writes, the auth system, the delegate cards, the UI rendering. Those are fine.

---

## 3. What would break first if we added 10 new volunteers tomorrow?

Nothing would break technically. The system is designed to support multiple concurrent volunteers.

The operational problem is the assignment workflow. There is no self-service. An admin must manually go into the delegate table, find each delegate, and add the new volunteer using the `+` button — one delegate at a time. Adding 10 volunteers across 75 delegates, with each volunteer assigned to a subset, could mean dozens of individual clicks. There is a bulk assign tool, but it assigns one volunteer to many delegates in one operation — not the other way around.

The bigger risk with 10 new volunteers is that signup is completely open. Anyone who reaches the signup page gets a volunteer account instantly with no approval. Right now the campaign presumably knows who its volunteers are. As that group grows and the signup URL circulates more widely, the likelihood of an unintended account (wrong person, duplicate, adversarial) increases. There is no review step.

The second operational issue: the volunteer contact list distribution is a manual admin task. For each new volunteer, an admin must copy their contact list and send it to them individually. There is no automated onboarding email, no self-serve access to their list on signup.

---

## 4. If we wanted to send a bulk email to 1,000 people today, what would stop us?

Everything. There is no path to bulk email in the current system.

The email tools in the hub generate one message at a time, require a human to manually copy HTML from the clipboard, open Gmail compose, paste the body, and click Send — then repeat. For 1,000 recipients, that is 1,000 individual send operations. At an optimistic two minutes per send, that is 33 hours of work.

Even if someone had the stamina, Gmail imposes a daily send limit. A personal `@gmail.com` account can send approximately 500 emails per day. A Google Workspace account can send approximately 2,000. Neither reaches 1,000 in a single day through this workflow.

There is no API connection to any email service provider. No SendGrid, no Mailchimp, no Constant Contact, no Klaviyo, nothing. There is no contact list, no unsubscribe management, no delivery tracking, no open rates. The concept of "send to a list" does not exist in this codebase.

To send a bulk email to 1,000 people today, you would need to: choose an email service provider, export the delegate or contact list as a CSV, import it into that provider, build or import the email template, set up a sender domain, and send — entirely outside this platform. The hub would contribute nothing to that process except a data export.

---

## 5. The one thing I need you to know before we plan what to build next

**This platform was purpose-built for a 75-delegate convention race. That race is over. The general election is a fundamentally different problem.**

Every feature in this hub was designed around one specific goal: get 53 of 75 delegates to rank Aaron Wiley #1 at a party convention on April 11. The stage pipeline (unknown → committed), the 53-delegate target, the milestone messages, the call scripts, the leaning tracking, the survey questions, the outreach templates — all of it was scoped to that context. It worked. Aaron won the nomination.

The general election is not that. It is a district-wide race against a Republican opponent, with a voter universe that could be thousands of people instead of 75. The outreach is door-knocking and phone banking at scale, not hand-crafted one-on-one delegate relationship management. The metrics are not "committed delegates" but voter contact rates, persuasion scores, and turnout modeling. The communications are not "warm neighbor texts" but a sustained multi-touch campaign across email, SMS, and canvassing. The tools for that race — a voter file, a VAN or similar CRM, mass texting, bulk email — are not in this platform.

Before planning what to build next, the question to answer is not "what features does this hub need?" It is: **what does the general election campaign actually require, and should that be built here or alongside a purpose-built tool?**

This hub is genuinely good at what it does. The delegate pipeline, the volunteer coordination, the real-time dashboard — these are solid. If Aaron runs for this seat again through a convention process in 2028, this platform is most of the way there. And some of what exists here — volunteer management, contact logging, the briefing drawer concept — has analogs in a general election campaign.

But the honest answer is that the general election will require capabilities this platform was never designed for, at a scale it was never tested at, with a data model (voters, not delegates) it does not currently support. The work for the next planning session is to define what the general election campaign needs first, and then decide what to build, buy, or integrate — rather than starting from "how do we extend the hub."

That framing will save months of building the wrong thing.

---

*This completes the 10-section engineering audit of the Wiley for HD21 campaign hub. All sections are available at `docs/engineering-audit-section-[1-10]*.md` on branch `claude/engineering-audit-infrastructure-6mFzy`.*
