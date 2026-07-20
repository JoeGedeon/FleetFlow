import test from 'node:test';
import assert from 'node:assert/strict';

import { JobStatus } from './jobSchema.js';
import { WorkspaceIds } from './workspaces.js';
import { createWorkspaceJob } from './workspaceJobCreation.js';

test('rejects job creation without a selected workspace', () => {
  assert.throws(
    () => createWorkspaceJob({ id: 'JOB-001' }),
    { message: 'Workspace id is required' }
  );
});

test('attaches the active selected workspace to a new job automatically', () => {
  const job = createWorkspaceJob({ id: 'JOB-001', client: 'Acme Move' }, WorkspaceIds.ERSA);

  assert.equal(job.id, 'JOB-001');
  assert.equal(job.client, 'Acme Move');
  assert.equal(job.status, JobStatus.SURVEY);
  assert.equal(job.workspaceId, WorkspaceIds.ERSA);
});

test('rejects reserved, unknown, and inherited workspace values', () => {
  assert.throws(
    () => createWorkspaceJob({ id: 'JOB-001' }, WorkspaceIds.FUTURE_COMPANY),
    { message: `Workspace is not active: ${WorkspaceIds.FUTURE_COMPANY}` }
  );
  assert.throws(
    () => createWorkspaceJob({ id: 'JOB-001' }, 'unknown'),
    { message: 'Unknown workspace: unknown' }
  );
  assert.throws(
    () => createWorkspaceJob({ id: 'JOB-001' }, '__proto__'),
    { message: 'Unknown workspace: __proto__' }
  );
});

test('rejects user-supplied workspace ownership', () => {
  assert.throws(
    () => createWorkspaceJob({ id: 'JOB-001', workspaceId: WorkspaceIds.GOOD_FRIENDS }, WorkspaceIds.ERSA),
    { message: 'Record already has a workspace id' }
  );
});

test('does not mutate the job input object', () => {
  const jobInput = { id: 'JOB-001', client: 'Acme Move' };

  createWorkspaceJob(jobInput, WorkspaceIds.GOOD_FRIENDS);

  assert.deepEqual(jobInput, { id: 'JOB-001', client: 'Acme Move' });
});

test('requires a job input object with an id', () => {
  for (const input of [null, undefined, 'JOB-001', 1, []]) {
    assert.throws(
      () => createWorkspaceJob(input, WorkspaceIds.GOOD_FRIENDS),
      { name: 'TypeError', message: 'Job input must be an object' }
    );
  }

  assert.throws(
    () => createWorkspaceJob({}, WorkspaceIds.GOOD_FRIENDS),
    { message: 'Job id is required' }
  );
});
