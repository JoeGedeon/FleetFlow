import { WorkspaceStatus, getWorkspace } from './workspaces.js';

export function selectActiveWorkspace(workspaceId) {
  if (!workspaceId) {
    throw new Error('Workspace selection is required');
  }

  const workspace = getWorkspace(workspaceId);

  if (!workspace) {
    throw new Error(`Unknown workspace: ${workspaceId}`);
  }

  if (workspace.status !== WorkspaceStatus.ACTIVE) {
    throw new Error(`Workspace is not active: ${workspaceId}`);
  }

  return workspace;
}
