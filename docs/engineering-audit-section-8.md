# Engineering Audit — Section 8 of 10: Endorsements

**To:** Aaron Wiley
**From:** Engineering
**Date:** April 29, 2026

---

## Overview

The endorsement system is a public-facing feature — no login required. Anyone can submit an endorsement, and all approved endorsements appear on a public wall. There is a separate section for featured political endorsers that is hardcoded in the source.

---

## Pages

### Submit an endorsement (`/endorse`)

A public form anyone can fill out. Fields:

| Field | Required | Notes |
|---|---|---|
| First name | Yes | |
| Last name | Yes | |
| Email | Yes | Not displayed publicly |
| Title | No | e.g., "Parent and Rose Park Neighbor" |
| Why supporting Aaron | No | Textarea — displayed as a quote on the wall |
| Photo | No | Uploaded to Firebase Storage; auto-compressed client-side to max 900px, JPEG at 80% quality |

On submit:
1. If a photo was provided, it is uploaded to Firebase Storage at `endorsements/{timestamp}.jpg`
2. A new document is written to the `endorsements` Firestore collection with all fields, the photo URL, a generated UUID as `editToken`, and `createdAt` (server timestamp)
3. The page displays a private edit link: `/endorse/edit/{docId}?token={editToken}` — the submitter should save this link if they want to edit later

### Endorsement wall (`/endorsements`)

A public page with two sections:

**Featured endorsers (hardcoded — not from Firestore):**
- Rep. Sandra Hollins
- Rep. Ashlee Matthews
- Rep. Rosalba Dominguez
- Councilwoman Natalie Pinkney
- Liban Mohamed

These five appear as styled cards at the top of the page regardless of what is in the database.

**Community endorsements (live from Firestore):**
All submitted endorsements ordered by `createdAt` descending (newest first). Each card shows name, title, why-supporting quote (if provided), and photo (or initials avatar if no photo). Email is not displayed publicly.

### Edit an endorsement (`/endorse/edit/{id}?token={token}`)

The private edit page. It loads the endorsement from `endorsements/{id}`, validates that the `token` URL parameter matches the stored `editToken`, and presents the same form pre-filled. The submitter can update any field or replace their photo. On save, the document is updated via Firestore `updateDoc`.

If the token does not match, the page shows an error and does not load the form.

---

## Firestore data structure

Collection: `endorsements`

| Field | Type | Notes |
|---|---|---|
| `firstName` | string | |
| `lastName` | string | |
| `email` | string | Never displayed publicly |
| `title` | string | Optional |
| `why` | string | Optional; displayed as pull quote |
| `photoURL` | string | Firebase Storage URL; optional |
| `editToken` | string | UUID generated at submission time |
| `createdAt` | timestamp | Server timestamp |

Firestore security rules for `endorsements`:
- **Read:** Anyone (public)
- **Create:** Anyone (public — no auth required)
- **Update / Delete:** No one (not allowed via client)

Edits go through Firestore `updateDoc` from the client — but the rules say updates are not allowed. This is a bug: the edit page will fail to save because Firestore will reject the write. (See issues below.)

---

## Issues to flag

**1. Endorsement edits will fail**

The Firestore security rules explicitly deny all `update` and `delete` operations on the `endorsements` collection:

```
allow read, create: if true;
// No allow update or delete rule
```

The edit page calls `updateDoc()` on the client. Firestore will reject that write with a permission error. The edit page exists in the UI and is linked to from the submission confirmation, but it does not actually work.

**2. Featured endorsers are hardcoded**

The five featured endorsers (Hollins, Matthews, Dominguez, Pinkney, Mohamed) are written directly into the React component. Adding, removing, or reordering them requires a code change and redeployment. There is no way to manage them from the admin dashboard.

**3. No moderation**

Endorsements are written directly to Firestore and immediately appear on the public wall. There is no review queue, no admin approval step, and no way to remove a submission without direct Firestore console access. Any person can submit any name and text and it will appear publicly on Aaron's campaign website.

**4. Edit token is the only security**

The `editToken` (a UUID) is the only thing protecting a submission from being overwritten. The token is shown once — at the end of the submission flow — and is never emailed to the submitter. If they close the page without saving the link, they have no way to retrieve it. And as noted above, the edit system doesn't currently work due to the Firestore rules.

**5. No deduplication**

The same person can submit multiple endorsements. There is no check on email address uniqueness or any other identifier.

---

*This audit reflects the state of the codebase as of April 29, 2026.*
