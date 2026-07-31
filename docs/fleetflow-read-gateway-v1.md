# FleetFlow Read Gateway v1

**Status:** Accepted architecture boundary  
**Scope:** Read-only access for Wednesday and explicitly approved external consumers  
**Not in scope:** OpenAI Voice, PACER memory, operational writes, or K.E.L. execution

The Read Gateway and Context Engine are related but separate responsibilities:

- the **Read Gateway** decides which records and fields may be read; and
- the **Context Engine** describes the authorized current screen state in one stable,
  read-only Context Packet.

## Decision

FleetFlow is the system of record and document authority. It must continue to load,
authenticate, navigate, and complete operational work when Wednesday, PACER, or K.E.L.
is absent or unavailable.

Wednesday is a FleetFlow-native reader, guide, narrator, and user-facing assistant.
It reads FleetFlow only through an authenticated, tenant-scoped read boundary. PACER is
an optional consumer of that same boundary with a narrower policy. FleetFlow never
queries PACER and does not use PACER for authentication, authorization, navigation, or
core behavior.

```text
FleetFlow
  ├── Wednesday reads FleetFlow through the Read Gateway
  └── PACER optionally reads approved FleetFlow facts through the Read Gateway

PACER does not become a dependency of FleetFlow.
FleetFlow does not query PACER.
```

## System responsibilities

| System | Authority |
| --- | --- |
| FleetFlow | Operational system of record, document authority, authentication, tenant isolation, authorization, and final validation of every write. |
| Wednesday | FleetFlow-native read-only guide, narrator, and assistant grounded in the active company, user role, screen, record, and approved documents. |
| PACER | Optional cross-system memory, pattern recognition, policy context, and audit intelligence. It stores interpretation and continuity, never replacement records. |
| K.E.L. | Future approved execution layer for typed writes after policy checks and explicit human confirmation. |

## Non-negotiable independence invariant

FleetFlow core must not import, await, call, or require Wednesday, PACER, or K.E.L. for:

- login or logout;
- route navigation;
- jobs, documents, users, payroll, inventory, calendar, receipts, or warehouse work;
- document storage and retrieval;
- operational writes; or
- startup and error recovery.

Optional consumers initialize after authentication and FleetFlow readiness. Their
absence, delay, timeout, or failure must be contained outside core startup.

## Gateway trust boundary

The Read Gateway is server-side. It must not trust company, user, role, resource type,
or document authorization supplied only by the browser.

A Context Packet describes the result of authorization; it never establishes identity,
tenant, role, or access. The trusted sequence is:

```text
authenticated FleetFlow session
  → server verifies company access
  → server establishes the active tenant
  → tenant-scoped queries execute
  → Context Engine builds a packet
  → Wednesday or PACER consumes the packet
```

Neither a company selector nor any packet field may be treated as authorization input.

For every request it must:

1. Validate a server-verifiable FleetFlow session.
2. Derive the immutable company, user, and role from that session.
3. Resolve the requested record inside the derived tenant.
4. Apply resource and field allowlists for both the user and the named consumer.
5. Deny cross-tenant, unknown, deleted, quarantined, or unscanned resources.
6. Return the smallest authorized representation with stable source citations.
7. Record a security audit event without copying the protected content into the log.

Client-provided `companyId`, `username`, role, storage path, collection name, or URL is
never authorization. Raw storage credentials, unrestricted collection access, and
arbitrary query execution are never returned.

## V1 read resources

V1 may expose allowlisted fields from:

- jobs;
- documents that completed validation and security scanning;
- calendar records;
- inventory;
- receipts with payment credentials and account details removed;
- load sheets;
- warehouse logs;
- company configuration; and
- approved user profile fields.

V1 excludes:

- payroll;
- passwords, tokens, credentials, or authentication internals;
- bank, card, or payment details;
- Social Security numbers, government identifiers, or tax identifiers;
- signatures and signature images;
- unrestricted attachments or storage browsing;
- private employee fields; and
- any field without an explicit resource-and-role policy.

An excluded or unconfigured field is denied by default. Redaction is not a substitute
for an allowlist.

## Document Reader pipeline

```text
Upload to FleetFlow
  → store in FleetFlow-controlled storage
  → create FleetFlow document metadata
  → validate type, size, integrity, and malware/security status
  → extract readable text in an isolated worker
  → apply tenant, role, document, and field authorization
  → return authorized content and citations to Wednesday
  → optionally send separately approved facts to PACER
```

The Document Reader accepts an opaque FleetFlow document ID, not a storage path or
arbitrary URL. It returns no content until scanning and extraction succeed. Unsupported,
encrypted, corrupt, quarantined, or unapproved documents produce a typed denial or
unavailable result rather than partial guesses.

Extracted content remains governed by the original document's tenant, role, retention,
and deletion policy. Deleting or restricting the source invalidates derived access.

## Response contract

Successful reads return a bounded envelope such as:

```json
{
  "requestId": "read_opaque_id",
  "resource": {
    "type": "document",
    "id": "doc_opaque_id",
    "version": "immutable_version"
  },
  "content": {
    "fields": {},
    "textSegments": []
  },
  "citations": [
    {
      "sourceType": "fleetflow-document",
      "sourceId": "doc_opaque_id",
      "version": "immutable_version",
      "locator": "page:2"
    }
  ],
  "policy": {
    "consumer": "wednesday",
    "redactionsApplied": true
  }
}
```

Every factual segment must be traceable to a FleetFlow record version and locator.
Wednesday must distinguish verified facts from explanation and say that information is
unavailable when the gateway supplies no evidence.

Errors use typed codes such as `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`,
`NOT_READY`, `QUARANTINED`, and `UNSUPPORTED`; they do not reveal whether a resource
exists in another tenant.

## Context Engine and Context Packet v1

FleetFlow modules must not expose arbitrary globals, DOM fragments, rendered HTML, or
module-specific internal state to Wednesday. A module instead publishes a Context Packet
that conforms to [`fleetflow-context-packet-v1.schema.json`](fleetflow-context-packet-v1.schema.json).

Every packet answers the same questions:

- Where is the authenticated user?
- What authorized entity or selection is active?
- What verified facts summarize the screen?
- Which items need attention?
- Which capabilities may be proposed to this user?
- Which immutable FleetFlow sources support those facts?

The minimum envelope contains a version, module, screen, opaque context ID, server-issued
context epoch, generated timestamp, selection, summary, attention items, allowed actions,
and citations. Optional entity references use opaque FleetFlow IDs and versions. Packet
generation occurs after the Read Gateway has applied tenant, role, resource, and field
policies.

Example Calendar packet:

```json
{
  "contextVersion": "1.0",
  "contextId": "ctx_opaque_id",
  "contextEpoch": 42,
  "generatedAt": "2026-07-30T12:00:00.000Z",
  "module": "calendar",
  "screen": "month",
  "selection": { "month": 7, "year": 2026 },
  "summary": {
    "scheduledJobs": 18,
    "completedJobs": 9
  },
  "attentionItems": [
    {
      "code": "schedule_conflict",
      "severity": "warning",
      "message": "Two authorized schedule items need review.",
      "citationIds": ["calendar-july-2026"]
    }
  ],
  "allowedActions": ["open_job", "review_schedule"],
  "citations": [
    {
      "id": "calendar-july-2026",
      "sourceType": "fleetflow-calendar",
      "sourceId": "calendar_opaque_id",
      "version": "immutable_version",
      "locator": "month:2026-07"
    }
  ]
}
```

`summary` and `selection` are bounded, module-defined maps whose values must already be
authorized and safe for the named consumer. They must not contain raw documents,
credentials, payroll, payment details, signatures, government IDs, unrestricted user
objects, HTML, or executable content.

`allowedActions` describes capabilities the authenticated user may be offered. It is not
authorization to execute them. Wednesday may explain or propose an allowed action, but
every future write still requires the separate confirmation and FleetFlow validation path.

The Context Engine is read-only and side-effect free. Generating a packet cannot fetch
PACER memory, call a model, mutate FleetFlow, or make core wait for an optional consumer.
Packets are ephemeral snapshots: consumers must discard them on route change, context
invalidation, logout, or session expiry and request a new packet rather than assuming the
screen is unchanged.

### Tenant switching and context epochs

Changing the active company is a server-authorized security transition, not a display
preference. FleetFlow performs it as one ordered boundary:

1. Verify the Creator's authorization for the requested company.
2. Suspend new operational requests and cancel outstanding reads.
3. Clear all tenant-scoped caches and invalidate existing Context Packets.
4. Terminate Wednesday's operational context and clear optional PACER context.
5. Establish the new active tenant in the verified server session.
6. Increment the session's monotonic `contextEpoch`.
7. Reload tenant-scoped data and generate fresh packets carrying the new epoch.
8. Resume operational requests only after the new tenant context is ready.

The server is the sole issuer of `contextEpoch`; browser code and consumers cannot choose
or advance it. An epoch is scoped to the authenticated server session and its established
tenant context. Its numeric value has no meaning outside that scope: another login,
browser session, tenant context, or server lifecycle may legitimately use the same value.

Wednesday and PACER accept a packet only when both conditions hold:

```text
packet.contextEpoch === currentSession.contextEpoch
AND the packet was produced under the current authenticated server session
```

The trusted FleetFlow runtime supplies the current session epoch and packet provenance.
Consumers must use exact equality; they must never infer freshness with ordering logic
such as `packet.contextEpoch > previousContextEpoch`. A numerically greater epoch is not
newer, safer, or more authorized. Packets and pending proposals that do not exactly match
the current authenticated session and epoch are rejected.

FleetFlow rotates the session epoch whenever authorized context is invalidated, including:

- an active-tenant switch;
- logout or session termination;
- an authentication refresh that changes access;
- a Creator permission change;
- tenant membership removal; or
- any policy, role, or authorization event that invalidates the current context.

Rotation invalidates every packet and proposal issued under the prior epoch even when the
visible company has not changed. The epoch remains only a revocation and freshness token;
it is not chronology, tenant identity, proof of authorization, or permission to read or
write.

## Consumer policies

### Wednesday

Wednesday may request authorized content for the active FleetFlow workspace, route,
record, or explicitly selected document. It must:

- read before answering questions about operational facts;
- cite the FleetFlow source used;
- respect the authenticated user's role;
- avoid inferring missing values;
- remain read-only in v1; and
- stop transient work on logout, session expiry, exit, or route/context invalidation.

### PACER

PACER access is optional and separately authorized. It receives only explicitly selected
facts, summaries, references, and identifiers through a consumer-specific allowlist.
It receives no raw storage access, unrestricted tenant query, or automatic copy of every
document.

PACER memory records its interpretation alongside FleetFlow source identifiers,
versions, event IDs, and timestamps. FleetFlow remains authoritative when memory and
source disagree. PACER unavailability cannot alter FleetFlow or Wednesday's local
read capability.

## Future writes

The Read Gateway never writes operational data. A future write follows a separate path:

```text
PACER or Wednesday proposes a typed action
  → policy and permission check
  → explicit human confirmation
  → K.E.L. sends an authenticated FleetFlow API request
  → FleetFlow validates and writes
  → outcome is returned for audit
```

FleetFlow retains final authority. A proposal is never treated as confirmation, and the
model, browser, PACER, and K.E.L. cannot bypass FleetFlow validation.

## Required security and contract tests

Implementation is blocked from production until tests prove:

- identity and tenant are derived server-side;
- cross-tenant reads are indistinguishable from unavailable resources;
- every resource and field is denied unless allowlisted;
- each role receives only its approved fields;
- payroll, credentials, payment details, signatures, government IDs, and unrestricted
  attachments are excluded;
- unscanned, quarantined, corrupt, and unsupported documents return typed failures;
- citations identify immutable FleetFlow source versions and locators;
- every module Context Packet conforms to the shared v1 schema;
- packet summaries and selections contain only fields approved by the Read Gateway;
- allowed actions are never treated as write authorization;
- context epochs are server-issued and session-scoped, consumers require an exact match,
  and ordering comparisons are prohibited;
- epoch rotation invalidates stale packets and proposals after tenant, session,
  membership, role, permission, or policy changes;
- packets are invalidated on route change, logout, and session expiry;
- PACER receives no data without an explicit consumer policy;
- PACER, Wednesday, and gateway failures do not affect FleetFlow core routes;
- logout and session expiry immediately invalidate reads and transient content;
- audit events contain identity, policy decision, source reference, and outcome but no
  protected document body; and
- no endpoint performs operational writes.

Adversarial tests must cover forged tenant IDs, forged roles, guessed document IDs,
storage-path injection, arbitrary URLs, unsupported resource types, oversized files,
malicious extracted text, stale sessions, and attempts to request excluded fields.

## Delivery sequence

1. Define server-verifiable FleetFlow session validation and the resource/role policy
   matrix.
2. Add the server-side read envelope, deny-by-default policy engine, and audit events
   using synthetic fixtures only.
3. Add the shared Context Packet producer interface and module adapters using authorized
   synthetic fixtures only.
4. Add document scanning, isolated extraction, citations, retention, and invalidation.
5. Connect Wednesday as the first read-only consumer while preserving the existing
   deterministic guide and browser narration fallback.
6. Add PACER as an optional, more restricted consumer.
7. Build `PACER Voice Gateway v1` only after this boundary passes security review and
   deployed adversarial tests.

No production OpenAI credential, microphone path, PACER dependency, or operational
write belongs in FleetFlow Read Gateway v1.
