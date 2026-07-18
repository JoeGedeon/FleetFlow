import { selectActiveWorkspace } from './workspaceSelection.js';

export const workspaceSelectionStorageKey = 'fleetflow.selectedWorkspaceId';

export function restoreSelectedWorkspace(storage = globalThis.sessionStorage) {
  const workspaceId = storage?.getItem(workspaceSelectionStorageKey) || '';

  if (!workspaceId) {
    return null;
  }

  return selectActiveWorkspace(workspaceId);
}

export function saveSelectedWorkspace(workspaceId, storage = globalThis.sessionStorage) {
  const workspace = selectActiveWorkspace(workspaceId);
  storage.setItem(workspaceSelectionStorageKey, workspace.id);
  return workspace;
}

export function clearSelectedWorkspace(storage = globalThis.sessionStorage) {
  storage.removeItem(workspaceSelectionStorageKey);
}
