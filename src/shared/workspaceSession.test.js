import test from 'node:test';
import assert from 'node:assert/strict';

import { WorkspaceIds, Workspaces } from './workspaces.js';
import {
  clearSelectedWorkspace,
  restoreSelectedWorkspace,
  saveSelectedWorkspace,
  workspaceSelectionStorageKey
} from './workspaceSession.js';

function createMemoryStorage(initialEntries = []) {
  const values = new Map(initialEntries);

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

test('restores an active workspace from session storage', () => {
  const storage = createMemoryStorage([[workspaceSelectionStorageKey, WorkspaceIds.ERSA]]);

  assert.equal(restoreSelectedWorkspace(storage), Workspaces[WorkspaceIds.ERSA]);
});

test('keeps refresh state explicitly unselected when no workspace is stored', () => {
  const storage = createMemoryStorage();

  assert.equal(restoreSelectedWorkspace(storage), null);
});

test('persists only validated active workspace selections', () => {
  const storage = createMemoryStorage();

  const workspace = saveSelectedWorkspace(WorkspaceIds.GOOD_FRIENDS, storage);

  assert.equal(workspace, Workspaces[WorkspaceIds.GOOD_FRIENDS]);
  assert.equal(storage.getItem(workspaceSelectionStorageKey), WorkspaceIds.GOOD_FRIENDS);
});

test('rejects invalid session workspace values through active selection rules', () => {
  const storage = createMemoryStorage([[workspaceSelectionStorageKey, WorkspaceIds.FUTURE_COMPANY]]);

  assert.throws(
    () => restoreSelectedWorkspace(storage),
    { message: `Workspace is not active: ${WorkspaceIds.FUTURE_COMPANY}` }
  );
});

test('clears the persisted workspace selection', () => {
  const storage = createMemoryStorage([[workspaceSelectionStorageKey, WorkspaceIds.ERSA]]);

  clearSelectedWorkspace(storage);

  assert.equal(storage.getItem(workspaceSelectionStorageKey), null);
});
