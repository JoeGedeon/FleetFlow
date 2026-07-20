import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getActiveWorkspaces } from '../shared/workspaces.js';
import {
  clearSelectedWorkspace,
  restoreSelectedWorkspace,
  saveSelectedWorkspace,
  workspaceSelectionStorageKey
} from '../shared/workspaceSession.js';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children, storage = window.sessionStorage }) {
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [selectionError, setSelectionError] = useState('');
  const activeWorkspaces = useMemo(() => getActiveWorkspaces(), []);

  useEffect(() => {
    try {
      setSelectedWorkspace(restoreSelectedWorkspace(storage));
    } catch (error) {
      clearSelectedWorkspace(storage);
      setSelectionError(error.message);
    }
  }, [storage]);

  const selectWorkspace = workspaceId => {
    const workspace = saveSelectedWorkspace(workspaceId, storage);
    setSelectedWorkspace(workspace);
    setSelectionError('');
    return workspace;
  };

  const clearWorkspace = () => {
    setSelectedWorkspace(null);
    setSelectionError('');
    clearSelectedWorkspace(storage);
  };

  const value = useMemo(() => ({
    activeWorkspaces,
    clearWorkspace,
    hasWorkspaceSelection: Boolean(selectedWorkspace),
    selectWorkspace,
    selectedWorkspace,
    selectionError
  }), [activeWorkspaces, selectedWorkspace, selectionError]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }

  return context;
}

export { workspaceSelectionStorageKey };
