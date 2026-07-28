# Issue #39 Implementation Plan

This branch implements the dashboard Documents workspace and Estimate Sheet visual rebalance described in Issue #39.

## Required code changes

- Add a prominent Documents workspace/card to the Command dashboard.
- Reuse `openDocumentsModal(null)` for global/backlog uploads.
- Display counts derived from `STATE.documents`:
  - total
  - unassigned (`jobId == null`)
  - linked (`jobId != null`)
  - recent uploads
- Preserve the existing Estimate Sheet and Job Detail upload entrances.
- Rebalance the Estimate Sheet desktop layout without changing calculations, BOL generation, job selection, or upload targeting.

## Verification

- Dashboard upload writes `jobId: null`.
- Estimate Sheet dropdown switch still re-points uploads to the newly selected job.
- Job Detail upload remains job-linked.
- Laptop and tablet layouts remain usable.
- Main script parses.
- Analyzer output is regenerated and deterministic.

This file records the implementation scope only. Production code changes are still required before opening the implementation pull request.
