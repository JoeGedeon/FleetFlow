# Checkpoint 2 — Firebase Authentication Cutover

**Status:** planning. No code, no rules, no data changed by this document.
**Purpose:** close the public-disclosure exposure that the 2026-07-31 containment does not.

---

## Why this is scheduled now

The Firestore rules published 2026-03-31 21:46 were:

```
match /{document=**} { allow read, write: if true; }
```

Verified in the Console on 2026-07-31, with Firebase's own banner displayed above them:
*"Your security rules are defined as public, so anyone can steal, modify, or delete data
in your database."* Rules history reaches back to at least 2026-01-13; **the first version
containing `if true` has not yet been identified**, so the exposure window is at minimum
four months and possibly longer.

The emergency containment (branch `claude/firestore-containment-rules`, commit `1c4b341`)
blocks anonymous mutation of `ff_users` only. **Every document in the project — including
plaintext passwords, customer addresses, payroll, and operational records — remains
publicly readable until this checkpoint ships.** Nothing else on the roadmap changes that.

This also gates work already accepted elsewhere: `docs/fleetflow-read-gateway-v1.md`
assigns FleetFlow authority for "authentication, tenant isolation, authorization," none of
which exist yet.

---

## Hard constraints discovered during review

These four are proven from the codebase and each one invalidates an obvious approach.

### C1 — Every existing password must be treated as compromised

Passwords are stored in plaintext on `ff_users` documents and compared in the browser
(`index.html:6478`). Those documents have been world-readable for months.

**Consequence:** the credentials cannot be migrated into Firebase Auth. Importing them
carries known-compromised secrets forward under a new system and produces a false sense of
resolution. **Every user must set a new password as part of enrollment.** This is not a
security preference; it is the only defensible reading of the exposure.

### C2 — Email is optional on `ff_users`, so email-based reset is not universally available

| Creation path | Sets `email`? |
|---|---|
| User Management (`index.html:19967`) | optional — `?.value.trim() \|\| ''` |
| First-run admin (`index.html:6048`) | **no** |
| Seed accounts `joe` / `recovery` (`5979`, `5989`) | **no** |

Firebase Auth's email/password provider requires an email address, and password-reset
emails require a *valid* one. Some accounts — likely including the creator account — have
neither.

**Consequence:** enrollment cannot assume email. Requires an audit of which users have
valid addresses, and a second path for those who don't (admin-provisioned temporary
credential delivered out-of-band, or mandatory email collection before cutover).

### C3 — The public booking portal must remain anonymous

`?book=1&co=COMPANY_ID` (`index.html:11068`) is a public URL that moving companies publish
on their websites. Customers with no account submit jobs through it. That flow **requires**
unauthenticated writes and will break the moment rules demand `request.auth != null`.

**Consequence:** a server-side booking endpoint is a prerequisite of the rules change, not
a follow-up. PR #66's `netlify/functions` infrastructure is the natural home for it.

### C4 — Client and rules must cut over together

There is no intermediate state where both old and new work: today's client cannot
authenticate at all, so any rule requiring auth causes immediate total outage. Deploying
the Auth-capable client before restrictive rules leaves the exposure open; deploying rules
first takes production down.

**Consequence:** one coordinated release, tested in preview against production-shaped data.

---

## Decisions required before implementation starts

These are business calls, not engineering ones, and each blocks work:

1. **Enrollment mechanism for users without email** — collect emails first, or
   admin-provision temporary credentials out-of-band?
2. **Cutover style** — hard switch at a scheduled window, or dual-path period where the
   client accepts either mechanism? Dual-path is gentler operationally but keeps the
   plaintext comparison alive longer, extending the exposure.
3. **Timing against ERSA operations** — a hard switch means every user must re-enroll
   before they can work. That needs a window that does not sit in front of a moving day.
4. **Notification obligations** — whether the exposure window and data categories
   (customer addresses, payroll, contact details) trigger any disclosure duty. Outside
   engineering scope; needs a decision owner.

---

## Sequence

Ordered so that nothing is deployed which cannot function.

**Phase A — establish facts (no production change)**
- Identify the oldest rules version containing `if true`; record the true exposure window.
- Audit `ff_users`: account count, which have valid emails, any accounts nobody created.
- Confirm `ff_documents` is empty (expected — uploads have been failing, see below).
- Inspect `localStorage` offline queues for pending `ff_users` writes that would replay
  once permissions change.

**Phase B — server foundation**
- Land PR #66 (`session-context`) after resolving its CI failure.
- Add the public booking endpoint alongside it (C3), server-validated, rate-limited.
- Both are inert until the client calls them.

**Phase C — enrollment (no cutover yet)**
- Provision Firebase Auth accounts via Admin SDK, with **new** credentials (C1).
- Backfill immutable `uid` onto each `ff_users` document — the mapping PR #66's
  `loadFleetFlowIdentity` already expects.
- Handle the no-email cohort per decision 1.
- Verify every user can authenticate *before* anything depends on it.

**Phase D — client**
- Load `firebase-auth-compat.js`.
- Replace the Firestore password comparison in `doLogin()` with a real Auth sign-in.
- Session restore (`checkFirstRun`, `loadSession`) moves to Auth state rather than
  `localStorage` role claims.
- Deploy behind a flag or to preview only — **not** to production yet.

**Phase E — coordinated cutover (single window)**
- Deploy Auth-capable client, functions, and restrictive rules together (C4).
- Firestore rules: `request.auth != null` **plus** tenant enforcement — company membership
  resolved server-side (custom claim or `ff_users` lookup), never from a client-supplied
  field.
- Storage rules: add the membership check currently missing. Today
  `match /companies/{companyId}/documents/…` grants any authenticated user access to any
  company's path; that is harmless only because nobody can authenticate.

**Phase F — cleanup**
- Remove `password` from every `ff_users` document once nothing reads it.
- Re-run the analyzer; update the Engineering Bible (R1, R5) and the decomposition
  blueprint's Phase-0 gates.
- Review Cloud Monitoring for anomalous access since the window opened — noting that
  Firestore does not log document reads by default, so quiet graphs are weak reassurance,
  not evidence of safety.

---

## Side effect worth knowing: uploads start working

PR #35's document upload has never functioned in production. Storage rules require
`request.auth != null`; the client has no Auth; `uploadDocument()` has no fallback, so the
write fails before the Firestore metadata record is created. `ff_documents` should be empty.

Receipt photos behave differently: `uploadReceiptPhoto()` **does** have a fallback
(`index.html:~5670`) that embeds the image as base64 in Firestore when Storage denies the
write — so receipt images have been landing in the world-readable database. That path
stops being exposed at Phase E and starts using Storage correctly.

---

## Verification

- Every role signs in: creator, owner, office, driver, helper, warehouse, client.
- Public booking submits successfully **without** authentication.
- A user of company A cannot read company B's Firestore documents or Storage objects —
  tested with real credentials, not rules simulation alone.
- Session restore survives refresh, and logout revokes access.
- Document upload succeeds end-to-end for the first time.
- Receipt upload uses Storage rather than the base64 fallback.
- The five workflows broken by the containment work again.

## Rollback

Phase E is the only irreversible-feeling step, and it isn't: rules revert from Console
history in seconds, and the client reverts by redeploying the prior `dist`. The genuine
one-way door is **Phase F** — once `password` fields are deleted, the old login cannot be
restored. Do not run Phase F until Phase E has been stable through a full operating week.
