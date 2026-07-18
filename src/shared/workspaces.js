export const WorkspaceType = Object.freeze({
  OPERATING_COMPANY: 'operating_company',
  FUTURE_COMPANY: 'future_company'
});

export const WorkspaceStatus = Object.freeze({
  ACTIVE: 'active',
  RESERVED: 'reserved'
});

export const WorkspaceIds = Object.freeze({
  GOOD_FRIENDS: 'good-friends',
  ERSA: 'ersa',
  FUTURE_COMPANY: 'future-company'
});

const workspaceRegistry = Object.assign(Object.create(null), {
  [WorkspaceIds.GOOD_FRIENDS]: Object.freeze({
    id: WorkspaceIds.GOOD_FRIENDS,
    name: 'Good Friends Moving',
    type: WorkspaceType.OPERATING_COMPANY,
    status: WorkspaceStatus.ACTIVE,
    recordNamespace: 'good_friends',
    preservesHistoricalRecords: true
  }),
  [WorkspaceIds.ERSA]: Object.freeze({
    id: WorkspaceIds.ERSA,
    name: 'ERSA Logistics',
    type: WorkspaceType.OPERATING_COMPANY,
    status: WorkspaceStatus.ACTIVE,
    recordNamespace: 'ersa',
    preservesHistoricalRecords: true
  }),
  [WorkspaceIds.FUTURE_COMPANY]: Object.freeze({
    id: WorkspaceIds.FUTURE_COMPANY,
    name: 'Future Company',
    type: WorkspaceType.FUTURE_COMPANY,
    status: WorkspaceStatus.RESERVED,
    recordNamespace: 'future_company',
    preservesHistoricalRecords: true
  })
});

export const Workspaces = Object.freeze(workspaceRegistry);

export function getWorkspace(workspaceId) {
  return Object.hasOwn(Workspaces, workspaceId) ? Workspaces[workspaceId] : null;
}

export function getActiveWorkspaces() {
  return Object.values(Workspaces).filter(workspace => workspace.status === WorkspaceStatus.ACTIVE);
}

export function createWorkspaceScopedRecord(record, workspaceId) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    throw new TypeError('Record must be an object');
  }

  if (Object.hasOwn(record, 'workspaceId')) {
    throw new Error('Record already has a workspace id');
  }

  if (!workspaceId) {
    throw new Error('Workspace id is required');
    throw new TypeError('Record must be a non-null, non-array object');
  }

  if (Object.hasOwn(record, 'workspaceId')) {
    throw new Error('Record already has workspace ownership');
  }

  if (workspaceId === undefined || workspaceId === null || workspaceId === '') {
    throw new Error('Workspace ID is required');
  }

  const workspace = getWorkspace(workspaceId);

  if (!workspace) {
    throw new Error(`Unknown workspace: ${workspaceId}`);
  }

  if (workspace.status !== WorkspaceStatus.ACTIVE) {
    throw new Error(`Workspace is not active: ${workspaceId}`);
    throw new Error(`Inactive workspace: ${workspaceId}`);
  }

  return {
    ...record,
    workspaceId: workspace.id
  };
}
