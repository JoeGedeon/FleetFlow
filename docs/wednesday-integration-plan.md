# Wednesday Integration Plan

Wednesday is not currently part of FleetFlow's live runtime. Earlier startup-path injections were rolled back after breaking login/startup. The safe integration path is post-initialization and event-driven.

## Required behavior

- Load only after FleetFlow authentication and core initialization complete.
- Never block splash, login, Firestore listeners, or primary navigation.
- Observe operational events rather than owning startup.
- Surface document-upload signals, missing paperwork, signature gaps, and review needs.
- Start read-only. No automatic writes or job-state changes.
- Use a visible Wednesday panel/status indicator so users can tell when it is active.

## Initial event sources

- `fleetflow:ready`
- document uploaded
- document unassigned
- missing signature
- job closeout incomplete
- payment or carrier-balance inconsistency

## Hard constraints

- Separate PR from dashboard Documents work.
- No startup/login injection.
- No direct production action without human approval.
- Must have a kill switch and rollback path.
