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

## Decisions — APPROVED 2026-07-31

All four are locked. Implementation follows these; changing any of them reopens the plan.

**D1 · Enrollment: verified, admin-assisted, for every account.**
Audit every `ff_users` record, verify the person, collect a unique valid email, issue
entirely new credentials. Bootstrap the creator account manually first. **No synthetic or
shared email addresses. No password migration** — C1 makes existing credentials
unusable regardless of convenience.

**D2 · Cutover: hard switch.**
The legacy plaintext-password path is **not** retained as a fallback. Keeping it alive
would preserve the compromised authentication path and defeat the migration's purpose. If
enrollment is incomplete at cutover, the answer is to delay the window, not to leave the
old path running.

**D3 · Timing: controlled off-hours maintenance window.**
No crew actively using FleetFlow. Writes frozen; accounts provisioned beforehand; client,
functions, and rules deployed together; role-by-role smoke tests; tested rollback ready.
ERSA gets advance notice of temporary downtime, described operationally — not a security
briefing.

**D4 · Notification: a legal decision, not an engineering one.**
Treat as a security incident requiring documented review. Engineering's job is to preserve
evidence and produce an affected-data and exposure-window report; **qualified privacy /
breach counsel determines obligations** by affected residents' jurisdictions. Do not issue
customer notifications on engineering inference. **Absence of logged access does not
establish that no access occurred** — Firestore does not log document reads by default.

---

## Sequence

Ordered so that nothing is deployed which cannot function.

**Phase A — establish facts (no production change).** Broken out as executable tasks below.

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

---

# Phase A — executable tasks

Fact-finding only. **No task below implements, deploys, provisions accounts, alters
Firebase configuration, or exports customer records.** Console inspection and local
analysis only; passwords and personal data are redacted from every artifact produced.

Owners: **Console** = the account holder with Firebase Console access · **Eng** =
engineering (this repo) · **Counsel** = qualified privacy/breach counsel (D4).

## A0 · Publish and verify the emergency containment — PREREQUISITE

**Owner:** Console · **Prerequisite:** none · **Blocks:** every task below

Not part of Phase A proper, but nothing else should proceed while anonymous `ff_users`
mutation stays open. Publish `firestore.rules` from branch
`claude/firestore-containment-rules` @ `1c4b341`.

**Acceptance:** Playground, run before and after and both results kept —

| Test | Before | After |
|---|---|---|
| `get /ff_users/joe` | Allow | Allow |
| `update /ff_users/joe` (dummy body) | Allow | **Deny** |
| `create /ff_jobs/test` | Allow | Allow |

Then, after a hard refresh: login works; job create/save works; the five `ff_users`
admin workflows fail with permission-denied.

**Rollback gate:** Console → Rules → history → **Mar 31, 2026 · 9:46 PM** → publish.
Restores full public read *and* write — an outage escape hatch, not a safe state.

**Stop condition:** any production workflow outside the five expected breaks → roll back
first, diagnose second.

## A1 · Establish the true exposure window

**Owner:** Console · **Prerequisite:** A0

Open each Rules-history version oldest-first and record which is the **first containing
`allow read, write: if true`**. Scroll to the bottom of the list first — the oldest
visible entry (2026-01-13 10:15) may not be the oldest that exists.

**Acceptance:** a dated list of every rules version with a yes/no flag for public access,
and a single stated start date. Screenshot each version's rules text.

**Stop condition:** if history predates retention or is truncated, record that fact rather
than estimating. "Unknown, at least since 2026-01-13" is a usable answer; a guess is not.

## A2 · Audit `ff_users`

**Owner:** Console · **Prerequisite:** A0

Per account, record only: username, display name, role, `companyId`, `active`,
`createdAt`, and **whether a valid email exists**. **Do not record, screenshot, or export
password values.** Do not download the collection.

**Acceptance:** a roster with a total count, an email-coverage count, and an explicit list
of accounts nobody recognizes. Feeds D1 enrollment and A6.

**Stop condition — escalate immediately, do not continue Phase A:** any account nobody
created, any unexpected `creator`/`owner` role, or any `createdAt` inside the exposure
window that doesn't match a known hire. That converts a suspected exposure into a
suspected intrusion and changes what counsel needs.

## A3 · Confirm `ff_documents` is empty

**Owner:** Console · **Prerequisite:** A0

Expected empty — `uploadDocument()` writes to Storage first, Storage denies unauthenticated
writes, and there is no fallback, so the Firestore record is never created.

**Acceptance:** document count recorded. **If non-zero**, the reasoning above is wrong
somewhere and ERSA contract metadata may have been publicly readable — raise it before
proceeding, and add it to A6's affected-data categories.

## A4 · Inspect offline queues for replay risk

**Owner:** Console (on each active FleetFlow browser/device) · **Prerequisite:** A0

Read `localStorage` under the offline-queue key on machines in regular use. Failed writes
are retained indefinitely (`syncOfflineQueue` re-preserves anything that fails) and drain
on every reconnect — so a stale `ff_users` write queued weeks ago can land the moment
permissions loosen at cutover.

**Acceptance:** per device, the count and target collections of queued operations. Any
`ff_users` entries documented, then deliberately cleared rather than left to replay.

**Re-run gate:** repeat immediately before Phase E. A queue that is empty today can refill.

## A5 · Monitoring review

**Owner:** Console · **Prerequisite:** A1 (needs the window)

Cloud Monitoring read/write volume and Firebase usage graphs across the exposure window,
looking for anomalies against the operational baseline.

**Acceptance:** graphs captured with the window marked. **Stated plainly in the artifact:**
Firestore does not log document reads by default, so quiet graphs are weak reassurance and
**not** evidence that no access occurred. Do not let this task's output be read as an
all-clear.

## A6 · Evidence package for counsel

**Owner:** Eng + Console → **Counsel** · **Prerequisite:** A1–A5

Assemble, with personal data and credentials redacted:

- the published rules text and the Firebase public-rules warning banner (captured)
- rules history with timestamps; the exposure start date from A1
- **affected data categories** — customer names/addresses/phone/email (`ff_jobs`,
  `ff_leads`), payroll and compensation (`ff_payroll_ledger`, `ff_disbursements`),
  receipt images embedded as base64 (`ff_receipts`), user records including credentials
  (`ff_users`), company configuration (`ff_company`)
- **residency spread** of affected individuals — determines which jurisdictions apply
- monitoring evidence from A5, with its stated limitation
- remediation timeline: containment published (A0), cutover planned (Phase E)

**Acceptance:** package delivered to counsel. **Engineering does not determine
notification obligations and does not contact customers** (D4).

## A7 · Feed results back into the plan

**Owner:** Eng · **Prerequisite:** A1–A4

Update this document and the Engineering Bible risk register (R1, R5) with confirmed
findings; convert D1's enrollment roster into Phase C tasks.

---

## Phase A exit criteria

Phase B does not start until: A0 verified · exposure window stated or explicitly recorded
as unknown · `ff_users` roster complete with email coverage · `ff_documents` count
confirmed · offline queues documented · evidence package with counsel.

**Global stop condition:** if A2 surfaces an unrecognized account or A3 returns a non-zero
count, halt Phase A, escalate, and let counsel's read of the changed facts inform whether
the sequence still holds.
