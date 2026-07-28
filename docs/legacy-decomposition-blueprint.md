# FleetFlow Legacy Decomposition Blueprint

Read-only architectural decomposition of the production `index.html`
(20,425 lines at `main` @ `61890b5`). **This document changes nothing.** It is
the execution map for eventually splitting the monolith — which files should
exist, what belongs in each, and what order gets there without breaking
production.

Evidence sources consumed rather than re-derived:
`docs/legacy-app-map.md` (generated, 992 lines, deterministic),
`docs/FLEETFLOW_ENGINEERING_BIBLE.md` (risk register R1–R7),
`docs/legacy-orphan-review.json` (verdict store, currently empty),
`scripts/analyze-legacy-app.mjs` (the generator), and PR #35 (in-flight
document-upload subsystem, noted but not analyzed as merged code).

Convention: **[P]** = proven (cited to line/analyzer/command output).
**[I]** = inferred (stated as recommendation or hypothesis, not fact).

---

## 1. Executive summary

[P] The application is one 18,453-line `<script>` block (lines 1929–20382)
containing 79 banner-delimited sections, 458 global bindings in a single
scope, 808 inline HTML event handlers, 17 Firestore collections, and 2
Storage call sites. Startup, rendering, and every feature share one
namespace.

[I] The file decomposes cleanly into **18 domains** (§5) and a proposed
**24-module tree** (§7). Roughly a third of the code (utilities, dormant AI,
leaf features, per-domain renderers below coupling score ~9) can be
extracted with low risk; the core quartet — `STATE & STORAGE` (coupling 71),
`NOTIFICATION` (43), `TABS` (40), `ROLE HIERARCHY` (35), `FIREBASE INIT`
(31) — must move last, in that order of caution.

[P] Two hard gates precede *any* physical extraction, both already on the
risk register: the dual-deploy split (R3 — the GitHub Pages pipeline runs
`vite build` and knows nothing of the Netlify splice mechanism, which is why
PR #34 is paused) and the unresolved service worker (R2 — either dead code
or version-pinning clients; if the latter, extracted builds would not reach
returning browsers at all).

## 2. Verified architecture facts

All from the generated map (regenerable via
`node scripts/analyze-legacy-app.mjs`) or direct citation:

| Fact | Value | Source |
|---|---|---|
| Total lines | 20,425 | `wc -l index.html` |
| Main script span | 1929–20382 | map, coverage-validated (no gaps/overlaps) |
| Sections | 79 (+ preamble) | map §Sections |
| Global bindings | 458 (398 inbound-referenced · 23 handler-linked · 37 zero-reference candidates) | map §Reference summary |
| Inline handlers | 808 (60 unparsed — refs uncredited) | map §Inline HTML event handlers |
| Dynamic dispatch (`window[...]`, `eval(`, `new Function(`) | 0 / 0 / 0 | map §Zero-reference bindings |
| Firestore collections in use | 17 (`COL_LICENSEES` declared, unused) | map §Firestore collections |
| Storage call sites | 2 (`ff_receipts/…` write, `refFromURL` delete) | map §Firebase Storage paths |
| Other `<script>` blocks | theme pre-paint 99–110; `file:`-only helpers 647–652, 688–701 | map §Small standalone blocks |
| External CDN deps | Firebase compat ×3 (94–96), jsPDF (97), Stripe (646) | map §External CDN scripts |
| AI call sites (all unauthenticated) | 4614, 15486 (approx.), 20030 | Bible R1 |

## 3. Known analysis limitations

- [P] Reference counting, not reachability: 398 "inbound-referenced" is an
  **upper bound** on live code. Orphan *islands* (mutually-referencing groups
  with no path from a root) are invisible to this method. A live partial
  example exists: `renderClaimsDefenseHistory` (4774) is referenced only from
  `openClaimsDefensePanel`'s template (10801) — live — while its sibling
  creation path (`runClaimsDefenseScan` 4614, `showClaimsDefenseResult` 4693)
  has **zero references each** (`grep -n showClaimsDefenseResult` returns only
  the definition). The display half of the subsystem is live; the creation
  half is dead. Section-level coupling cannot see splits like this;
  function-level mark-and-sweep would.
- [P] 60 unparsed handlers (string-concatenated `onclick`) leave references
  uncredited; auto-clearing recovered 23 bindings, 37 remain unverified.
- [P] Firebase security rules are not in the repository (R5) — nothing here
  can describe the actual authorization model.
- [P] Coupling scores are **section-level**. A section pair may share one
  binding or forty; the score counts distinct sections, not edge weight.
- [P] Coupling scores are also **main-script-only**. Edges to the three
  small standalone `<script>` blocks are invisible to them. Demonstrated:
  THEME TOGGLE scores 0 yet depends on `window._ffThemePref`, first written
  by the pre-paint block at line 108. Every "safe to extract" claim in this
  document therefore carries an explicit dependency manifest (§8) rather
  than resting on its score.
- [I] No runtime tracing was performed. Everything here is static.

## 4. Runtime roots

The real entry points, verified by grep against `main`:

**Top-level execution (runs at parse time):**
- [P] 1934–1951 — `firebaseConfig`, `firebase.initializeApp`, `db`,
  `storage`, `file:`-only long-polling setting.
- [P] All 458 top-level declarations, plus top-level IIFEs: theme active-state
  (20367–20381, includes a `matchMedia('prefers-color-scheme')` listener).

**Deferred handlers (registered at parse, fire later):**
- [P] `window.addEventListener('load', …)` ×3: splash dismiss (6035),
  offline-queue sync (6264), **startup auth resolution** (6384).
- [P] `document.addEventListener('DOMContentLoaded', …)` ×2: `file:`-only
  login-panel forcing (690), theme buttons (20371).
- [P] `beforeinstallprompt` (6049); service-worker registration attempt from a
  `blob:` URL inside a `load` handler (6283 region — see R2).
- [P] 808 inline `on*` attributes (412 `onclick`); these are the reachability
  roots for most UI functions.

**The startup/auth chain (the spine everything hangs from):**
- [P] `load` (6384) → `checkFirstRun()` (5849) → `loadSession()` (6364) →
  validate against `ff_users` → set `currentUser` + `setCompanyId()` →
  `initFirestore()` — or fall through to the login form. `checkFirstRun` has
  an 8-second Firebase timeout that shows login anyway (≈5885).
- [P] `doLogin()` (≈6391) → validate → `setCompanyId` → `saveSession` →
  `initFirestore()` (6431).
- [P] `initFirestore()` (5323) registers 11 Firestore listeners (u1–u11,
  5355–5511), gates first render on jobs+inventory+receipts via
  `checkAllReady()` (5515), then schedules `seedIfEmpty`,
  `stampMissingCompanyIds`, `syncOfflineQueue`, `loadPlatformConfig`,
  `checkBetaWelcome` (5521–5525).
- [P] Four `initFirestore()` call sites total (5873, 5925, 6431, 6493) — all
  are auth-resolution completions. [I] These four sites are where a future
  single `fleetflow:ready` dispatch belongs (map §Phase 2 candidates agrees).

## 5. Domain map

79 sections grouped into 18 domains. Section numbers refer to the map's
sections table; coupling scores from the map's safe-extraction-order table.

| # | Domain | Map sections (lines) | Peak coupling |
|---|---|---|---|
| D1 | Boot & Firebase | 2 (1930–1953), 13 (5289–5312) | 31 |
| D2 | Roles, Auth & Session | 3, 4, 15, 16 (5845–6029), 21 (6349–6584), 70 (19454–19646) | 35 |
| D3 | State & Data Access | 14 (5313–5840), 18 (6076–6121), 19 (6122–6317), 20 (6318–6348) | **71** |
| D4 | Shell: Nav, Modals, Notify, Theme | 22 (6585–6705), 72 (19967–20007), 73 (20008–20032), 79 (20345–20382) | 43 |
| D5 | Dashboard | 23 (6706–7747) | 12 |
| D6 | Jobs | 24, 38, 54, 56 (15890–16296), 57 (16297–16770) | 21 |
| D7 | Estimate & BOL | 31 (8242–8533), 53 (14726–14957), 41 (11922–12759), 77, 76, 78 | 9 |
| D8 | Calendar & Scheduling | 5 (2002–2445), 48, 49, 50 (13902–14209) | 13 |
| D9 | Money & Reporting | 25, 33, 34, 47, 59, 62, 63 | 10 |
| D10 | Payroll & Crew | 26, 27, 28, 42, 46, 58, 61, 64–67 | 14 |
| D11 | Receipts | 55 (15013–15889, incl. `scanReceiptWithAI`) | 12 |
| D12 | CRM & Portals | 6, 32, 37 (10254–10909), 40 (11013–11921) | 15 |
| D13 | Warehouse, Fleet & Logistics | 7, 8 (3146–3994), 9, 10, 52, 60 | 9 |
| D14 | Comms & Sound | 35, 44, 45, 51 | 10 |
| D15 | Payments (Stripe) | 36 (10012–10253) | 10 |
| D16 | Platform Ops & Tiering | 12 (4804–5288), 43, 74, 75 (20037–20195) | 9 |
| D17 | AI subsystems | 11 (4606–4803) + `scanReceiptWithAI` (in D11) + scribble (inside section 73, 20023–20031) | 6 |
| D18 | Shared utilities | 29 (8181–8213), 30 (8214–8241), 39 (10984–11012) | 22 |

[P] Notable banner/domain mismatch: the scribble pad (an AI feature) lives
inside the NOTIFICATION section's line range, and `NAME NORMALIZATION`
(coupling 22) is a utility every crew-matching feature depends on despite
sitting mid-file. Banners are a good first cut, not gospel.

In-flight: **D19 Document Upload** (PR #35) — already written as a
self-contained section with its own listener; it will slot into this tree as
`domains/documents.js` with no rework. [P: PR #35 diff]

## 6. Dependency table

Shared infrastructure every domain leans on (from the map's bindings table —
reads/writes credited by scope analysis):

| Binding | Declared | Refs | Role |
|---|---|---|---|
| `STATE` | 5318 | app-wide | single mutable store; 11 listeners write it |
| `currentUser` | 5838 | 219 (213r/6w) | auth identity; read by nearly every render |
| `COMPANY_ID` / `setCompanyId` / `withCompanyId` | 5302–5310 | app-wide | tenant scoping on every write |
| `db`, `storage` | 1944–45 | app-wide | Firebase handles (compat SDK) |
| `notify()` | 20034 | 43-section coupling | the de-facto standard error channel |
| `openModal`/`closeModal` | 19971/19983 | 25-section coupling | modal lifecycle |
| `switchTab`/`buildTabs`/`renderActiveTab`/`activeTab` | 6585–6705 | 40-section coupling | navigation + re-render spine |
| `isAdmin()`/`ROLE_TIER`/`myTier` | 1958–2001 | 35-section coupling | authorization gates |
| `safeFirestoreSet/Add` + offline queue | 6213–6240 | most writes | write path with offline fallback |
| `nameIncludes`/normalization | 8181–8213 | 22-section coupling | crew/name matching |

Per-domain detail (owned bindings, collections, DOM containers, handlers) is
already enumerated in the map's bindings and coupling tables; duplicating
those ~460 rows here would create a second hand-maintained copy of generated
data. This table lists only the **bridge set** — the bindings that must
remain globally visible during any transition (§7).

**DOM containers** [P]: `#main-content` (all tab renders, 6701),
`#tabs-container` (6626), `#jobdetail-content` (shared modal body used by
many features, 1650 + 16194), per-feature modal overlays (842–1927), and the
notification/photo-viewer/signature fixed elements.

**Firestore access**: all 17 collections listed in the map §Firestore
collections with call-site counts; heaviest are `ff_users` (42 sites) and
`ff_company` (15). Two dynamic-argument helpers (`safeFirestoreSet/Add`,
offline queue at 6163–6240) mean collection names also flow through
variables — extraction must keep those helpers with the state layer.

## 7. Proposed module tree

[I] Target structure (names follow existing banner vocabulary; nothing moves
yet):

```
legacy/
  core/
    firebase-init.js      D1  · firebaseConfig, db, storage           risk: CRITICAL
    roles.js              D2  · ROLE_TIER, isAdmin, canModifyUser     risk: high
    session.js            D2  · load/save/clearSession, checkFirstRun risk: high
    auth.js               D2  · doLogin, doLogout, role switcher      risk: high
    state.js              D3  · STATE, initFirestore, listeners,
                                safeFirestore*, offline queue         risk: CRITICAL
    migration.js          D3  · stampMissingCompanyIds                risk: medium
  shell/
    tabs.js               D4  · ROLE_TABS, NAV_GROUPS, buildTabs,
                                switchTab, renderActiveTab            risk: high
    modal.js              D4  · openModal/closeModal + helpers        risk: medium
    notify.js             D4  · notify, push/sound bridge             risk: medium
    theme.js              D4  · setTheme, _updateThemeBtns            risk: low
    pwa.js                D17/D4 · splash, install prompt             risk: low   (exists: PR #34 branch)
  util/
    names.js              D18 · normalization, nameIncludes           risk: medium (22-section blast radius)
    ids.js                D18 · jobDispId, refNum badge, employee IDs risk: low
    carrier.js            D18 · cubic-feet helpers                    risk: low
  domains/
    dashboard.js          D5   jobs.js        D6   estimate.js   D7
    bol.js                D7   calendar.js    D8   travel.js     D8
    money.js              D9   payroll.js     D10  receipts.js   D11
    leads.js              D12  booking.js     D12  client-portal.js D12
    warehouse.js          D13  fleet.js       D13  loadsheets.js D13
    messaging.js          D14  stripe.js      D15  syshealth.js  D16
    tiering.js            D16  documents.js   D19 (lands via PR #35)
  ai/
    claims-scan.js        D17 · runClaimsDefenseScan + result UI (dormant)
    receipt-scan.js       D17 · scanReceiptWithAI (unauthenticated, R1)
    scribble.js           D17 · scribble pad + transcribe (unauthenticated, R1)
```

**Bridge set** [I]: during transition every module attaches its public
surface to the shared scope (assembled builds keep today's single-scope
behavior — see §8 mechanism). The bindings in §6's table are the permanent
bridge until Phase 5; `let`/`const` globals (`STATE`, `currentUser`,
`activeTab`, `COMPANY_ID`, all `COL_*`) are script-scoped, **not**
window-attached, so any move to real ES modules without the concatenation
step is a breaking change unless they are re-homed onto an explicit shared
object first. [P: language semantics + map bindings table kinds]

Per-module extraction difficulty tracks the map's coupling scores: ≤5 low,
6–14 medium, ≥15 high. Rollback for every module extraction under the
concatenation mechanism is identical: delete the file, restore the inline
span, rebuild — byte-diffable both directions (proven byte-equivalent in
PR #34's verification).

## 8. Extraction sequence

**Mechanism** [P]: build-time concatenation via `LEGACY_EXTRACT` markers
(built and byte-verified in PR #34). Source splits; `dist/index.html` remains
one script block; browser sees no change.

**Phase 0 — gates (no code moves before these):**
1. Deployment consolidation (R3): either retire the GitHub Pages workflow or
   teach it the splice step. Until then any `LEGACY_EXTRACT` marker ships to
   gh-pages as an inert comment — the exact defect that paused PR #34.
2. Service worker resolution (R2): if a worker is registered in the wild,
   returning clients are version-pinned and no extraction ever reaches them.
3. PR #35 merged and stable (sequencing decision already made — operational
   value first).

**Phase 1 — leaves** (coupling ≤2, no startup/auth involvement). A coupling
score alone is not a safety claim — a section can score 0 and still lean on
a global the score cannot see. Each leaf therefore carries its full
dependency manifest, all [P] via grep/map:

| Leaf | Globals read | Globals written | DOM | Handlers | Data | Hidden dependency |
|---|---|---|---|---|---|---|
| THEME TOGGLE (20345–82) | `window._ffThemePref`, `localStorage['fleetflow-theme']` | `window._ffThemePref`, `documentElement[data-theme]` | `#theme-btn-{dark,light,system}` | 3 static `onclick` (830–832) | none | **Yes — coupling scores 0, but `_ffThemePref` is written first by the *separate* pre-paint `<script>` block (line 108). Section-level coupling only sees the main script; cross-block edges are invisible to it by construction. Extraction must keep the pre-paint block's contract intact.** |
| PWA (6030–75) | `notify()` | `deferredInstallPrompt` (own `let`, internal-only) | `#pwa-splash`, `#install-banner` | 4 static `onclick` (672–3, 723–4) + `load`/`beforeinstallprompt` listeners | none | none found — already byte-verified as PR #34 |
| CARRIER CUBIC FEET (8214–41) | form field values | none | `nj-*`/`ej-*` carrier fields via `getElementById` | `onchange`/`onclick` in job-form markup (handler-linked per map) | none | called from EDIT JOB (map: depended-on-by) — extract file, keep global names |
| FIELD NOTES (20332–44) | `STATE.jobs`, `notify()` | `job.fieldNotes` via `saveJob()` | none (uses `prompt()`) | job-detail action row, concat `onclick` @16183 (unparsed-handler class) | Firestore via `saveJob` → `ff_jobs` | reference is in the *unparsed* handler bucket — invisible to the credited reference graph |
| EMPLOYEE ID (10984–11012) | `db`, `COL_USERS` | `ff_users.{empId}` via query + update (10998–11005 region) | none | none | Firestore `ff_users` | none found |

One or two modules per PR; test = byte-diff of `dist` output plus
smoke-load. The THEME TOGGLE row is the standing proof that every later
"safe" claim in Phase 3 must be re-verified at extraction time with this
same manifest treatment — the score is a filter, not a verdict.

**Phase 2 — extension point**: insert the guarded once-only
`fleetflow:ready` dispatch covering all four `initFirestore` completion
paths (§4); build `shell/extension-manager.js` as the sanctioned home for
Wednesday/PACER integrations. This is the only phase that adds runtime code,
and it is ~10 lines.

**Phase 3 — feature domains, ascending coupling**: productivity (3), Twilio
(3), history (3), estimate (4), P&L (4), schedule (4), photo/signature (5),
my-pay (5), portals (5–7), claims/fleet/margins (6), warehouse/messaging/
user-mgmt (7–8), load sheets/BOL/tax/sound (9), Stripe/expenses/ledger
(10–12), receipts/calendar/dashboard (12), week view (13), settings (14),
leads (15), edit-job (17), job-detail (21). Max PR size: one domain, or one
sub-slice of the big ones (receipts, settings, leads each deserve 2–3 PRs).
Each PR: byte-diff test, analyzer rerun committed, rollback = revert.

**Phase 4 — shared utilities**: names.js (22), modal.js (25) — wide blast
radius, still mechanical.

**Phase 5 — the spine, last**: TABS (40) → NOTIFICATION (43) → ROLE
HIERARCHY (35) → STATE & STORAGE (71) → FIREBASE INIT (31) → session/auth.
Only after every consumer already lives in a module. This is also the point
where the bridge set can shrink and real ES modules become discussable.

[I] Expected steady state: ~20 PRs across Phases 1–4, each reviewable in
minutes because the diff is a move plus a marker, provably inert in the
assembled output.

## 9. GitHub issue plan

Proposed issues (not created — titles and gating only; each issue body
should carry scope, acceptance criteria = byte-diff + analyzer rerun +
smoke test, rollback = revert, and its listed dependency):

| # | Title | Depends on | Prod behavior change | Risk |
|---|---|---|---|---|
| 1 | Decide deployment consolidation (Netlify vs. dual-pipeline) | — | potentially (deploy only) | high |
| 2 | Resolve service-worker registration status in production (R2) | — | possibly (cache fix) | high |
| 3 | Verify the 37 zero-reference candidates; record verdicts in `legacy-orphan-review.json` | — | none | low |
| 4 | Extract Phase-1 leaves (theme, PWA, carrier, field notes, employee IDs) | 1, 2 | none (byte-inert) | low |
| 5 | Add guarded `fleetflow:ready` dispatch + extension manager | 4 | +10 lines runtime | medium |
| 6 | Extract low-coupling domains (productivity, Twilio, history, estimate, P&L, schedule) | 4 | none | low |
| 7 | Extract portals + CRM (booking, client portal, leads — split into 3 PRs) | 6 | none | medium |
| 8 | Extract money/payroll cluster (split into 4 PRs) | 6 | none | medium |
| 9 | Extract receipts + calendar + dashboard | 6 | none | medium |
| 10 | Extract jobs cluster (job-detail, edit-job, display-id) | 9 | none | high |
| 11 | Extract shared utilities (names, modal) | 10 | none | high |
| 12 | Extract spine (tabs → notify → roles → state → firebase-init → auth) | 11 | none intended; highest scrutiny | critical |
| 13 | AI proxy service (server-side key custody per R1) — prerequisite for any extraction *feature* work, independent of decomposition | — | new backend | high |
| 14 | Reconnect claims-defense creation path (`runClaimsDefenseScan`) once photos + proxy exist | 13, PR #35 lineage | new feature | medium |

## 10. Risks and unresolved questions

- [P] R1–R7 (Bible) all still open; R2 and R3 are hard Phase-0 gates.
- [P] `let`/`const` script-scoping breaks naïve ES-module conversion (§7).
- [P] The `anyModalOpen` list is hand-duplicated at 5337, 5379, 6692 (and a
  fourth close-all variant at 16306) — already missing `modal-documents` in
  PR #35 by deliberate scope choice. Any extraction of modal or nav code
  must consolidate this list or the copies will drift further.
- [P] 24 inline `refNum||id` expressions coexist with the `jobDispId()`
  helper (2 uses) — the file's own abstraction is ignored 24 times. Cheap
  consolidation target during D6 extraction.
- [P] `ff_feedback` is queried by hardcoded literal ×3 (2862, 2918, 5268) —
  the only collection without a `COL_*` constant.
- [P] Three inline sanitization regex variants (11426, 11880, 12750) predate
  PR #35's `sanitizeFilename`.
- [I] Unknown: whether any orphan islands exist beyond the demonstrated
  claims-defense creation path. Function-level mark-and-sweep (the analyzer's
  next planned capability) settles it.
- [I] Unknown: actual Firebase rules; nothing in this blueprint can be
  validated against the real authorization model until R5 is addressed.

## 11. Evidence appendix

- Section boundaries, coupling, bindings, handlers, inventories:
  `docs/legacy-app-map.md` @ `61890b5` (regenerate:
  `node scripts/analyze-legacy-app.mjs`; deterministic — two consecutive runs
  byte-identical).
- Startup chain: `index.html` 5323, 5849, 5873, 5925, 6364, 6384, 6391,
  6431, 6493; timeout at ≈5885.
- Load/DOMContentLoaded roots: 690, 6035, 6264, 6384, 20371; SW registration
  6283 region; `beforeinstallprompt` 6049.
- Claims-defense split liveness: 4614, 4693 (zero refs each), 4774 → 10801
  (live).
- Duplication: `grep -c "refNum||j\.id\|refNum || j\.id\|refNum||job\.id"` →
  24 vs `grep -c "jobDispId("` → 2; `anyModalOpen` at 5337/5379/6692;
  `ff_feedback` at 2862/2918/5268; sanitizers at 11426/11880/12750.
- Byte-equivalence of the splice mechanism: PR #34 verification (diff of
  before/after `dist/index.html` = two marker comments only).
- AI credential absence: `grep -cE "x-api-key|sk-ant-|ANTHROPIC_API_KEY"
  index.html` → 0 (Bible R1).
