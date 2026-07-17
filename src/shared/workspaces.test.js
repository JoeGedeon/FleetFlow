import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DefaultWorkspaceId,
  WorkspaceIds,
  WorkspaceStatus,
  Workspaces,
  createWorkspaceScopedRecord,
  getActiveWorkspaces,
  getWorkspace
} from './workspaces.js';

test('defines stable identities for the supported operating companies', () => {
  assert.equal(Workspaces[WorkspaceIds.GOOD_FRIENDS].name, 'Good Friends Moving');
  assert.equal(Workspaces[WorkspaceIds.ERSA].name, 'ERSA Logistics');
  assert.equal(DefaultWorkspaceId, WorkspaceIds.GOOD_FRIENDS);
});

test('keeps the future-company workspace reserved', () => {
  assert.equal(Workspaces[WorkspaceIds.FUTURE_COMPANY].status, WorkspaceStatus.RESERVED);
  assert.ok(!getActiveWorkspaces().includes(Workspaces[WorkspaceIds.FUTURE_COMPANY]));
});

test('returns a workspace by id and null for an unknown id', () => {
  assert.equal(getWorkspace(WorkspaceIds.ERSA), Workspaces[WorkspaceIds.ERSA]);
  assert.equal(getWorkspace('unknown'), null);
});

test('lists only active workspaces', () => {
  assert.deepEqual(
    getActiveWorkspaces().map(workspace => workspace.id),
    [WorkspaceIds.GOOD_FRIENDS, WorkspaceIds.ERSA]
  );
});

test('workspace definitions and identifiers cannot be mutated', () => {
  assert.ok(Object.isFrozen(WorkspaceIds));
  assert.ok(Object.isFrozen(Workspaces));
  assert.ok(Object.values(Workspaces).every(Object.isFrozen));
});

test('scopes a new record without mutating the source record', () => {
  const source = { id: 'JOB-001' };
  const scoped = createWorkspaceScopedRecord(source, WorkspaceIds.ERSA);

  assert.deepEqual(scoped, { id: 'JOB-001', workspaceId: WorkspaceIds.ERSA });
  assert.deepEqual(source, { id: 'JOB-001' });
});

test('requires an explicit, recognized workspace for new records', () => {
  assert.throws(
    () => createWorkspaceScopedRecord({ id: 'JOB-001' }),
    { message: 'Unknown workspace: undefined' }
  );
  assert.throws(
    () => createWorkspaceScopedRecord({ id: 'JOB-001' }, 'unknown'),
    { message: 'Unknown workspace: unknown' }
  );
});
