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

export const Workspaces = Object.freeze({
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

export const DefaultWorkspaceId = WorkspaceIds.GOOD_FRIENDS;

export function getWorkspace(workspaceId) {
  return Workspaces[workspaceId] ?? null;
}

export function getActiveWorkspaces() {
  return Object.values(Workspaces).filter(workspace => workspace.status === WorkspaceStatus.ACTIVE);
}

export function createWorkspaceScopedRecord(record, workspaceId) {
  const workspace = getWorkspace(workspaceId);

  if (!workspace) {
    throw new Error(`Unknown workspace: ${workspaceId}`);
  }

  return {
    ...record,
    workspaceId: workspace.id
  };
}
