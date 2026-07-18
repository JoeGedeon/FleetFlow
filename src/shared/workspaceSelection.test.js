import test from 'node:test';
import assert from 'node:assert/strict';

import { WorkspaceIds, Workspaces } from './workspaces.js';
import { selectActiveWorkspace } from './workspaceSelection.js';

test('selects an explicitly requested active workspace', () => {
  assert.equal(selectActiveWorkspace(WorkspaceIds.GOOD_FRIENDS), Workspaces[WorkspaceIds.GOOD_FRIENDS]);
  assert.equal(selectActiveWorkspace(WorkspaceIds.ERSA), Workspaces[WorkspaceIds.ERSA]);
});

test('requires an explicit workspace selection', () => {
  assert.throws(
    () => selectActiveWorkspace(),
    { message: 'Workspace selection is required' }
  );
});

test('rejects unknown or inherited workspace identifiers', () => {
  assert.throws(
    () => selectActiveWorkspace('unknown'),
    { message: 'Unknown workspace: unknown' }
  );
  assert.throws(
    () => selectActiveWorkspace('__proto__'),
    { message: 'Unknown workspace: __proto__' }
  );
});

test('rejects reserved workspace selection', () => {
  assert.throws(
    () => selectActiveWorkspace(WorkspaceIds.FUTURE_COMPANY),
    { message: `Workspace is not active: ${WorkspaceIds.FUTURE_COMPANY}` }
  );
});
