import { createJob } from './jobSchema.js';
import { createWorkspaceScopedRecord } from './workspaces.js';

const workflowControlledFields = new Set([
  'status',
  'pricingInputs',
  'proposedChanges',
  'inventory',
  'inventoryTotals',
  'billing',
  'payments',
  'accessorials',
  'permissions',
  'clientSigned',
  'clientSignedAt',
  'loadingEvidence',
  'arrivedAt',
  'deliveryConfirmedByClient',
  'deliveryConfirmedAt',
  'deliveryEvidence',
  'driverSigned',
  'driverSignedAt',
  'unloadAuthorizedByOffice',
  'unloadAuthorizedAt',
  'unloadAuthorizedBy',
  'warehouse',
  'communications',
  'labor',
  'workspaceId'
]);

export function getWorkspaceJobDocumentId(jobId, workspaceId) {
  if (!workspaceId) {
    throw new Error('Workspace id is required');
  }

  if (!jobId) {
    throw new Error('Job id is required');
  }

  if (String(jobId).includes('/')) {
    throw new Error('Job id cannot contain a slash');
  }

  return `${workspaceId}__${jobId}`;
}

export function createWorkspaceJob(jobInput, workspaceId) {
  if (jobInput === null || typeof jobInput !== 'object' || Array.isArray(jobInput)) {
    throw new TypeError('Job input must be an object');
  }

  if (!jobInput.id) {
    throw new Error('Job id is required');
  }

  for (const field of Object.keys(jobInput)) {
    if (workflowControlledFields.has(field)) {
      if (field === 'workspaceId') {
        throw new Error('Record already has a workspace id');
      }

      throw new Error(`Job creation cannot set workflow field: ${field}`);
    }
  }

  const documentId = getWorkspaceJobDocumentId(jobInput.id, workspaceId);
  const baseJob = createJob(documentId);
  const { id: jobNumber, ...creationFields } = jobInput;

  return createWorkspaceScopedRecord({
    ...baseJob,
    ...creationFields,
    jobNumber
  }, workspaceId);
}
