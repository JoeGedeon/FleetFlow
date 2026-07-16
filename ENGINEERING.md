# FleetFlow Engineering Standard

Version 1.0

## Purpose

This document governs human and AI-assisted engineering work in `JoeGedeon/FleetFlow`.

Production safety comes before speed. Every change must be traceable from task to branch to commit to pull request to review.

## Guiding Principles

Operational trust is more important than implementation speed.

Small, verifiable changes are preferred over large, risky changes.

Evidence always outweighs assumptions.

Protect production, preserve history, and make every change reversible.

## Repository Preflight

Before implementation begins, run:

```bash
pwd
git remote -v
git fetch origin
git branch --show-current
git rev-parse origin/main
git rev-parse HEAD
git merge-base --is-ancestor origin/main HEAD
git status --short
```

Required:

- `origin` points to `JoeGedeon/FleetFlow`.
- `git fetch origin` succeeds.
- The working tree is clean.
- The current HEAD contains the latest `origin/main`.

If any check fails, stop. No implementation begins.

## Branch Strategy

AI/Codex branches:

```text
codex/<descriptive-task-name>
```

Human branches:

```text
feature/<descriptive-task-name>
fix/<descriptive-task-name>
```

Do not commit implementation work directly to `main`.

## Scope Discipline

Make only the requested change.

- Do not include unrelated cleanup.
- Do not perform opportunistic refactors.
- Do not modify deployment unless explicitly requested.
- Stop and report ambiguity rather than guessing.

## Evidence Standard

Report only work that can be verified.

Do not claim:

- a branch exists unless it exists on GitHub;
- a commit exists unless it is visible on GitHub;
- a pull request exists unless a GitHub PR URL is available;
- a deployment occurred unless it can be verified;
- a test passed unless it actually ran.

When work cannot be completed, state exactly where execution stopped and why.

## Delivery Requirements

A task is considered delivered only when a GitHub Pull Request URL is available.

**No PR URL = No Delivery.**

A delivered task must include:

- remote branch;
- GitHub-visible commit SHA;
- GitHub PR number;
- GitHub PR URL;
- changed-file list;
- tests or checks run;
- test or check results;
- rollback instructions.

If push or PR creation fails, state: **DELIVERY INCOMPLETE**.

## Production Safety

The root `index.html` is the current production application.

- Do not replace or restructure it without explicit approval.
- Do not change Netlify production configuration without explicit approval.
- Do not deploy without explicit approval.
- Do not run Firebase or Firestore migrations without backup, dry run, review, and rollback planning.
- Do not mutate historical Good Friends records without explicit migration approval.

## Testing Requirements

Run task-appropriate checks, such as:

```bash
npm ci
npm run build
npm test
git diff --check
```

If a check cannot run, report the exact reason.

Never claim a check passed if it did not run.

## Pull Request Checklist

Every pull request must include:

- summary;
- files changed;
- tests or checks run;
- test or check results;
- risk notes;
- rollback instructions;
- screenshots for UI changes;
- confirmation that production was not deployed unless explicitly approved.

Every pull request must answer:

1. What changed?
2. Why did it change?
3. How do we know it worked?
4. What operational capability now exists that did not exist before?

## Decision Log

When a pull request changes architecture, workflow, deployment behavior, data model, security posture, or operational behavior, document the reason for the change.

Future engineers should understand not only what changed, but why it changed.

Code shows what changed. Git shows when it changed. The decision log explains why it changed.

## Rollback Standard

Every implementation pull request must include a clear rollback plan appropriate to the change.

## FleetFlow Architecture Guardrails

- Good Friends and ERSA data must remain isolated by workspace.
- Historical Good Friends records must be preserved unless a reviewed migration explicitly authorizes change.
- React/Vite is not the production application until explicitly promoted.
- Matrack remains the official ELD system of record.
- Document extraction drafts must not automatically write payroll, billing, compliance, or official records.

## PACER Integration Guardrail

FleetFlow integrations with PACER must use versioned, workspace-scoped operational events.

PACER may observe, analyze, correlate, and recommend. It must not directly mutate production records without an explicit human approval gate and an auditable authorized action.

Every learning loop must preserve:

- source event;
- recommendation;
- human decision;
- authorized action;
- resulting outcome;
- workspace identity;
- audit history.

Unapproved document extractions, unofficial ELD interpretations, and cross-workspace private data must not be treated as authoritative PACER knowledge.

## One Pull Request = One Business Outcome

Each pull request must deliver one clear business outcome.

Good examples:

- Add Engineering Standard
- Add Workspace Selector
- Add ERSA Workspace Isolation
- Add Legacy Good Friends Diagnostic
- Add Document Intake Inbox
- Add Matrack Read-Only Adapter

Avoid broad mixed pull requests that combine unrelated outcomes.
