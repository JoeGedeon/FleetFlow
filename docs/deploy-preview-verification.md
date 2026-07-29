# FleetFlow deploy-preview verification

This checklist is the final human gate for the protected legacy build. A green
build is necessary, but it does not authorize a merge by itself.

## Preconditions

- Review the preview for the PR commit, not a branch alias or production URL.
- Confirm Netlify reports `npm run build && npm run validate:dist` as successful.
- Use a real, active FleetFlow test account. Never place credentials in PR
  comments, screenshots, logs, or this repository.
- Open browser developer tools before loading the preview and preserve the
  console log across navigation.

## Artifact gate

Record the command output in the PR review:

```bash
npm run verify:artifact
```

The command must report one extension marker, zero Wednesday feature-runtime
references, and the approved production login fingerprint. Any mismatch is a
hard stop.

## Browser verification

1. Open the deploy-preview URL in a private browser window.
2. Confirm the FleetFlow login page renders without missing controls, an
   indefinite splash screen, or console errors.
3. Log in with the designated test account and confirm the expected role and
   company appear.
4. Visit Dashboard, Jobs, Calendar, Warehouse, Payroll, and Documents. Confirm
   each view renders and remains usable after navigating away and back.
5. Confirm there is no Wednesday launcher, panel, network request, stylesheet,
   script, or console message.
6. Confirm the console has no uncaught exception or unhandled rejection from
   initial load through the end of navigation.
7. Log out and confirm FleetFlow returns to the login screen.

## Evidence and decision

Record the preview URL, exact commit SHA, tester, UTC timestamp, account role
(not identity), browser/version, artifact-gate output, routes checked, and
console result in the PR review.

- **Pass:** approve for merge; do not merge unless the reviewed commit still
  matches the preview commit.
- **Fail:** block the PR and attach sanitized reproduction steps. Do not deploy
  or work around a failure by weakening the protected-core validator.

