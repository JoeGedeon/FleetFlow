import { createJob } from './jobSchema.js';
import { createWorkspaceScopedRecord } from './workspaces.js';

export function createWorkspaceJob(jobInput, workspaceId) {
  if (jobInput === null || typeof jobInput !== 'object' || Array.isArray(jobInput)) {
    throw new TypeError('Job input must be an object');
  }

  if (!jobInput.id) {
    throw new Error('Job id is required');
  }

  const baseJob = createJob(jobInput.id);

  return createWorkspaceScopedRecord({
    ...baseJob,
    ...jobInput
  }, workspaceId);
}
