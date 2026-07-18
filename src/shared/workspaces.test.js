import test from 'node:test';
import assert from 'node:assert/strict';

import {
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
});

test('keeps the future-company workspace reserved', () => {
  assert.equal(Workspaces[WorkspaceIds.FUTURE_COMPANY].status, WorkspaceStatus.RESERVED);
  assert.ok(!getActiveWorkspaces().includes(Workspaces[WorkspaceIds.FUTURE_COMPANY]));
});

test('returns a workspace by id and null for unknown or inherited ids', () => {
  assert.equal(getWorkspace(WorkspaceIds.ERSA), Workspaces[WorkspaceIds.ERSA]);
  assert.equal(getWorkspace('unknown'), null);
  assert.equal(getWorkspace('__proto__'), null);
  assert.equal(getWorkspace('toString'), null);
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
  assert.equal(Object.getPrototypeOf(Workspaces), null);
  assert.ok(Object.values(Workspaces).every(Object.isFrozen));
});

test('scopes a new record without mutating the source record', () => {
  const source = { id: 'JOB-001' };
  const scoped = createWorkspaceScopedRecord(source, WorkspaceIds.ERSA);

  assert.deepEqual(scoped, { id: 'JOB-001', workspaceId: WorkspaceIds.ERSA });
  assert.deepEqual(source, { id: 'JOB-001' });
});

test('refuses to overwrite existing workspace ownership', () => {
  const source = { id: 'JOB-001', workspaceId: WorkspaceIds.GOOD_FRIENDS };

  assert.throws(
    () => createWorkspaceScopedRecord(source, WorkspaceIds.ERSA),
    { message: 'Record already has a workspace id' }
  );
  assert.deepEqual(source, { id: 'JOB-001', workspaceId: WorkspaceIds.GOOD_FRIENDS });
});

test('requires a record object before assigning workspace ownership', () => {
  for (const record of [null, undefined, 'JOB-001', 1, []]) {
    assert.throws(
      () => createWorkspaceScopedRecord(record, WorkspaceIds.GOOD_FRIENDS),
      { name: 'TypeError', message: 'Record must be an object' }
    );
  }
});

test('requires an explicit, recognized workspace for new records', () => {
  assert.throws(
    () => createWorkspaceScopedRecord({ id: 'JOB-001' }),
    { message: 'Workspace id is required' }
  );
test('requires an explicit workspace for new records', () => {
  assert.throws(
    () => createWorkspaceScopedRecord({ id: 'JOB-001' }),
    { message: 'Workspace ID is required' }
  );
  assert.throws(
    () => createWorkspaceScopedRecord({ id: 'JOB-001' }, null),
    { message: 'Workspace ID is required' }
  );
});

test('rejects unknown, inherited, and inactive workspace identities', () => {
  assert.throws(
    () => createWorkspaceScopedRecord({ id: 'JOB-001' }, 'unknown'),
    { message: 'Unknown workspace: unknown' }
  );
  assert.throws(
    () => createWorkspaceScopedRecord({ id: 'JOB-001' }, '__proto__'),
    { message: 'Unknown workspace: __proto__' }
  );
});

test('prevents records from being assigned to a reserved workspace', () => {
  assert.throws(
    () => createWorkspaceScopedRecord({ id: 'JOB-001' }, WorkspaceIds.FUTURE_COMPANY),
    { message: `Workspace is not active: ${WorkspaceIds.FUTURE_COMPANY}` }
  );
  assert.throws(
    () => createWorkspaceScopedRecord({ id: 'JOB-001' }, WorkspaceIds.FUTURE_COMPANY),
    { message: `Inactive workspace: ${WorkspaceIds.FUTURE_COMPANY}` }
  );
});

test('rejects invalid record inputs', () => {
  for (const record of [null, undefined, 42, 'record', true, []]) {
    assert.throws(
      () => createWorkspaceScopedRecord(record, WorkspaceIds.ERSA),
      { message: 'Record must be a non-null, non-array object' }
    );
  }
});

test('prevents workspace ownership reassignment without mutating the source', () => {
  const source = { id: 'JOB-001', workspaceId: WorkspaceIds.GOOD_FRIENDS };

  assert.throws(
    () => createWorkspaceScopedRecord(source, WorkspaceIds.ERSA),
    { message: 'Record already has workspace ownership' }
  );
  assert.deepEqual(source, { id: 'JOB-001', workspaceId: WorkspaceIds.GOOD_FRIENDS });
});
