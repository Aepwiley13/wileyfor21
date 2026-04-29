# Engineering Audit — Section 9 of 10: The Public Website

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## Overview

The public website is a static HTML/CSS/JS campaign site at `https://wileyfor21.com/`. It is not a React app — it is plain HTML files served by Netlify. The React app (the volunteer/delegate hub) runs at the same domain but on different routes, redirected by Netlify to `app.html`.

---

## Pages

### Main landing page (`/` → `index.html`)

The primary campaign page. Organized into these sections:

**Navigation bar** — Logo, links to: Our Story, Issues, Meet Aaron, Endorsements, Volunteer HUB, Endorse Aaron, Admin, Donate (Stripe). Mobile: collapses to hamburger menu.

**Hero** — "WE ARE 21 / WE ARE HERE" headline. Three call-to-action buttons: Donate Now (Stripe link), Volunteer HUB (→ `/volunteer`), Endorse Aaron (→ `/endorse`).

**Movement** — West Side narrative. Describes the community Aaron is running to represent.

**Why I'm Running** — Aaron's personal story. Stericycle fight, 20 years in the community.

**Meet Aaron** — Bio, portrait photo, key background points.

**My Commitment** — Four issue cards: Housing Affordability, Clean Air & Environment, Fair Representation, Education & Opportunity.

**Donate** — Stripe donate button + legal compliance disclaimer ("Contributions are not tax deductible").

**Get Involved** — Six action cards: Knock doors, Make calls, Social media, Administrative help, Convention delegate support, Sign up.

**Join the Movement** — Volunteer signup form (handled by Netlify Forms).

**Footer** — Contact email (`utahforwiley@gmail.com`), social links (Facebook and Instagram both `@utahforwiley`), legal disclaimer ("Paid for by Aaron Wiley for Utah House District 21. Not authorized by any candidate or candidate committee.").

### Caucus night archive (`/caucus` → `caucus.html`)

A post-event page explaining what happened at caucus on March 17, 2026. Headline: "This Is How We Won." Three steps: Show Up, Raise Your Hand, Vote at Convention. Link back to main site for convention info. This page is informational — no forms, no actions.

---

## The volunteer signup form

The landing page's "Join the Movement" section has a Netlify form. It is a standard HTML form with `data-netlify="true"`, which means Netlify intercepts the POST request and stores submissions in the Netlify dashboard without requiring any backend code.

**How it submits:** JavaScript intercepts the submit event, serializes the form as `application/x-www-form-urlencoded`, POSTs to `/` (root), then hides the form and shows a "Thank you" confirmation div. Netlify captures the submission before it reaches the HTML file.

**What fields it captures:** The form collects firstName, lastName, email, phone, address, and five checkboxes (likely for volunteer interest areas — the exact checkbox labels are in the HTML but not in the JS). All submissions are stored in the Netlify dashboard under the "signup" form name and can be exported as CSV from there.

**Important:** These signups are stored in Netlify, not in Firebase. They do not automatically create volunteer accounts in the hub. Someone would need to manually take Netlify signup submissions and either invite those people to create hub accounts or import them.

---

## SEO and structured data

The landing page has full SEO markup:

- Canonical URL: `https://wileyfor21.com/`
- Open Graph tags for social sharing (title, description, image, URL)
- Twitter card tags
- JSON-LD structured data for:
  - **Person** — Aaron Wiley, candidate for Utah House District 21
  - **Event** — Utah Democratic Caucus Night, March 17, 2026, Rose Park Elementary
  - **PoliticalParty** — Utah Democratic Party
  - **WebSite** — with `SearchAction` for sitelinks search

The caucus event in the structured data (March 17) has already passed. This should be updated or removed to avoid Google displaying stale event information in search results.

---

## JavaScript behavior

A single script file (`js/main.js`) handles the entire landing page:

- **Scroll reveal animations** — Uses `IntersectionObserver` to add a `visible` class to elements as they enter the viewport. Elements animate in as the user scrolls.
- **Mobile nav** — Hamburger button toggles the nav menu open/closed.
- **Form submission** — Handles the Netlify form submit (described above).

No analytics code is present in the JavaScript file. SEO-related Google tag (`gtag`) may be present in the HTML head (referenced in the codebase notes from Section 1) but was not confirmed in the portion read.

---

## Third-party embeds

**Stripe (donation):** A hardcoded Stripe payment link embedded as a button href. No API key or server-side code — clicking the button navigates to Stripe's hosted checkout. The URL is `https://buy.stripe.com/7sY9ASeNR0tr1Ng25b4ZG01`.

**Google Fonts:** Barlow and Barlow Condensed loaded from `fonts.googleapis.com` and `fonts.gstatic.com`. Two `<link rel="preconnect">` tags in the `<head>` for performance.

---

## Issues to flag

**1. Netlify form signups are disconnected from the hub**

People who fill out the "Join the Movement" form are stored in Netlify but are not automatically added to the volunteer hub. There is no integration between the two systems. Volunteer sign-ups need to be manually transferred. This creates a gap: someone can sign up on the site, receive no follow-up, and never be onboarded into the hub.

**2. Caucus event structured data is stale**

The JSON-LD structured data on the landing page includes an Event object for the caucus on March 17, 2026. That event has passed. Google may display this in search results as an upcoming event or flag it as outdated. The structured data should be updated to reference the convention (April 11) or removed.

**3. The convention date (April 11) has also passed**

The landing page and hub both reference April 11, 2026 as the convention date in several places. The convention has now passed. Any live "days until convention" counters, "Vote on April 11" CTAs, and similar time-sensitive copy are now stale or showing negative numbers.

**4. `_original.html` and `_archived_candidates.html` are in the build**

These large archive files (1.6 MB for `_original.html`) are copied into `dist/` at build time and are publicly accessible at their URLs. They are not linked from anywhere, but they are reachable and inflate the deploy size. They should be moved out of the build output or excluded in the build script.

**5. No cookie consent or privacy policy**

The site collects names, email addresses, and phone numbers via the Netlify form. There is no privacy policy page and no cookie consent banner. For a political campaign this is likely not a legal requirement under Utah law, but it is a best practice — especially given that form data is being stored in a third-party system (Netlify).

---

*This audit reflects the state of the codebase as of April 29, 2026.*
