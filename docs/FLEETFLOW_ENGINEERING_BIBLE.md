# FleetFlow Engineering Bible

Human-authored reference for the legacy production application (`index.html`).
The purpose is that no engineer — and no AI model — has to re-excavate the same
20,000 lines to answer the same questions.

**Status:** incremental. This first pass covers AI subsystems, dormant code, and
the risk register — the areas where evidence already existed. Job lifecycle,
payment flow, calendar architecture, auth flow, and data lineage are not yet
written. Sections are added by PR as they are researched; nothing here is
speculative filler.

---

## How this relates to `docs/legacy-app-map.md`

Two documents, deliberately different in kind. Do not merge them.

| | `legacy-app-map.md` | This document |
|---|---|---|
| Authored by | `scripts/analyze-legacy-app.mjs` | Humans (and AI under review) |
| Regenerated | Every run, deterministically | Never — edited by hand |
| Contains | Counts, line numbers, inventories, reference graph | Intent, judgment, risk, "why" |
| Answers | "What is in the file?" | "What does it mean and what should we do?" |

**Never hand-edit the map** — the next analyzer run overwrites it. **Never
auto-generate this file** — its value is the judgment a tool cannot produce.
Where this document cites a number, it cites the map as the source so the two
cannot silently drift.

---

## AI subsystems

FleetFlow contains three AI subsystems. All three call the Anthropic API
**directly from the browser**. All three are believed non-functional — see the
credential finding below, which applies to every one of them.

| # | Function | Line | Model | Trigger | Reachable? |
|---|---|---|---|---|---|
| 1 | `scanReceiptWithAI()` | 15486 | `claude-haiku-4-5-20251001` | Receipt photo capture → `handleReceiptPhoto` → line 15481 | Yes |
| 2 | `runClaimsDefenseScan()` | 4614 | `claude-sonnet-4-5` | **None — zero call sites** | No |
| 3 | `scribbleTranscribe()` | 20030 | `claude-haiku-4-5-20251001` | Scribble pad "✨ TRANSCRIBE" button (lines 20411, 20417) | Yes |

### The credential finding

**None of the three requests sends an API key.** Every call site sends exactly:

```
Content-Type: application/json
anthropic-dangerous-direct-browser-calls: true
anthropic-version: 2023-06-01
```

There is no `x-api-key` header, no `Authorization` header, and no Anthropic key
anywhere in the repository (`grep -cE "x-api-key|sk-ant-|ANTHROPIC_API_KEY"` →
`0`). The Anthropic API rejects unauthenticated requests, so all three of these
subsystems will fail at runtime regardless of how they are triggered.

Receipt OCR in particular *looks* wired up — it has a real call site and real
UI — but has almost certainly never succeeded in production. Treat any belief
that "FleetFlow already has a working AI pipeline" as unverified until someone
observes a successful response.

### Why this cannot be fixed by adding a key

`anthropic-dangerous-direct-browser-calls: true` is the header that permits
browser-originated calls; it does not remove the need to authenticate. Supplying
the key from client-side JavaScript would ship it to every user of the
application, where any browser devtools session can read it. For a
multi-tenant product billing real moving companies, that is not an acceptable
resolution.

**The correct fix is a server-side proxy** holding the key as an environment
secret — a Netlify Function or Firebase Cloud Function that the browser calls,
which in turn calls Anthropic. No such proxy exists today (no `netlify/functions`
or `functions` directory in the repository).

### Consequence for the document-extraction roadmap

The planned upload → extract → review → approve pipeline **cannot reuse this
pattern**, because the pattern does not work. Extraction needs the server-side
proxy built first. This is a prerequisite, not an implementation detail, and it
is the single largest hidden dependency in that roadmap.

The good news is that the three existing call sites are still valuable as
*reference*: request shape, model selection, image encoding, and prompt
structure are all already worked out and can be lifted into the proxy.

---

## Dormant and dead systems

Code that exists, appears finished, and does nothing. Each entry is evidence for
a decision — revive, extract, or remove — not a deletion instruction.

### `runClaimsDefenseScan()` — fully implemented, never called

Line 4614. AI pre-load damage detection: sends a photo to Claude, flags
pre-existing damage, and is designed to embed findings in the BOL as evidence
against false damage claims. It has supporting UI (`showClaimsDefenseResult`
4693, `renderClaimsDefenseHistory` 4774, `openClaimsDefensePanel` 10777) and a
data shape (`job.claimsDefense`).

**Zero call sites.** Nothing invokes it. The Claims Defense panel opens a
view-only history of scans that can never be created.

This is the most commercially interesting dormant asset in the codebase — the
feature is built, it just was never connected.

### `job.photos` — no upload path exists

`job.photos` is initialized as an empty array on job creation (lines 5794, 5804,
5814, 16755) and **nothing ever pushes into it**. The job-detail `📷 PHOTOS`
button and the Claims Defense panel's `📷 ADD PRE-LOAD PHOTO` button both call
`openPhotoModal()` → `openPhotoViewer()`, which is a viewer/deleter with no
"add" affordance; on an empty array it reports "No photos found."

These two findings compound: Claims Defense needs a photo, and there is no way
to attach one.

### `COL_LICENSEES` — declared, never used

Line 4810, `const COL_LICENSEES = 'ff_licensees'`. Zero reads. Correspondingly,
`ff_licensees` does not appear in the Firestore collection inventory — no query
anywhere uses it. Either the System Health licensee view was never wired up, or
it sources that data another way.

### Service worker — probably never registers

See risk **R2** below. Either it is dead code (PWA offline mode does not work)
or it is active and permanently pinning the app version. Both are defects.

---

## Risk register

Ordered by operational severity. Each risk states what is **proven** from the
code versus what is **inferred**, so nothing here is mistaken for a verified
verdict.

### R1 — AI subsystems are unauthenticated · severity: high · proven

All three Anthropic call sites lack credentials (above). Effect: receipt OCR and
handwriting transcription silently fail for users; Claims Defense could not work
even if wired. Adding a client-side key would leak it to every user.
**Resolution:** server-side proxy before any AI feature is relied upon.

### R2 — Service worker: cache-first forever, or dead · severity: high · mixed

*Proven:* the worker (lines 6284–6326) caches `/` on install, and its fetch
handler is unconditionally cache-first — `if (cached) return cached;` with no
revalidation. `CACHE` is the hardcoded constant `'fleetflow-v50'`, and `activate`
only deletes caches whose key *differs* from it, so the cache is never
invalidated. If this worker registers, that browser is pinned to the version it
first loaded and **no future deploy ever reaches it**. The inline comment claims
"network-first for everything else"; no network-first branch exists.

*Also proven:* registration is attempted from a `blob:` URL (lines 6328–6330),
which browsers reject for service workers, and the rejection is swallowed by an
empty `.catch(() => {})`.

*Inferred:* the two facts conflict, so exactly one of these is true — the worker
never registers (offline mode is silently broken), or it registers somewhere and
pins the version. **Unresolved.** Settle it in DevTools → Application → Service
Workers on a live origin; a successful registration also logs
`Service Worker registered`.

This is the leading hypothesis for a deployed change not appearing in a browser
that previously loaded the app.

### R3 — Two deploy pipelines, one stale · severity: high · proven

`.github/workflows/deploy.yml` runs `npm run build` (Vite) on every push to
`main` and publishes to `gh-pages` — entirely separate from Netlify, and unaware
of `scripts/apply-nav-stacking-fix.mjs`. Because nothing had modified raw
`index.html` since June 14, Vite's output stopped changing and `gh-pages` has
been frozen at commit `153b436` ever since. Every nav/dropdown fix in this
engagement exists only in the Netlify build. **Decision pending:** consolidate to
one pipeline, or make both assemble identically.

### R4 — Receipt Storage path is not tenant-scoped · severity: medium · proven

The only pre-existing Storage write is `ff_receipts/${receiptId}.${ext}` (line
5637). Unlike every Firestore write — which is stamped with `companyId` via
`withCompanyId()` — this path has no company prefix. All tenants' receipt images
share one flat namespace, isolated only by the unguessability of the receipt ID.
The new document-upload path (`companies/{companyId}/documents/...`)
deliberately does not follow this precedent.

### R5 — Security rules are not in version control · severity: medium · proven

No `.rules`, `firebase.json`, or equivalent exists in the repository. The only
trace is a comment at line 5299: *"deploy in Firebase Console → Firestore →
Rules."* Rules therefore cannot be code-reviewed, diffed, or rolled back, and no
engineer can confirm from the repository what the production authorization model
actually is. Client-side `companyId` stamping is a convention, **not**
enforcement.

### R6 — 37 unverified orphan candidates · severity: low · proven

See the map's zero-reference section. Candidates only — reference counting
cannot detect orphan *islands* (mutually-referencing groups with no path in), so
this finds leaves only. Verdicts belong in `docs/legacy-orphan-review.json`.

### R7 — Whole app is one global scope · severity: structural · proven

18,453 of 20,425 lines sit in a single `<script>` tag; 458 global bindings share
one namespace. Any addition can collide with or disturb anything else — the
mechanism behind the Wednesday incident, where an isolated feature broke startup
and was reverted within 8 minutes. The decomposition program exists to address
this.

---

## Sections not yet written

Named here so the gaps are visible rather than implied:

- Startup sequence (partially covered by the map's `fleetflow:ready` candidates)
- Authentication flow
- Job lifecycle
- Calendar architecture
- Payment and collections flow
- Data lineage for key fields (carrier balance, balance due, cubic feet, driver
  pay, collections, status, inventory)
- Trust boundaries: which operations may be automated vs. require human approval
