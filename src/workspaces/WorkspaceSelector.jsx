import { useWorkspace } from './WorkspaceContext.jsx';

export default function WorkspaceSelector({ canSelect = false }) {
  const {
    activeWorkspaces,
    clearWorkspace,
    selectWorkspace,
    selectedWorkspace,
    selectionError
  } = useWorkspace();

  return (
    <section className="workspace-selector" aria-label="Workspace selection">
      <div>
        <div className="workspace-selector-label">Current Workspace</div>
        <div className="workspace-selector-current">
          {selectedWorkspace ? selectedWorkspace.name : 'No workspace selected'}
        </div>
      </div>

      <div className="workspace-selector-controls">
        <select
          aria-label="Select active workspace"
          disabled={!canSelect}
          value={selectedWorkspace?.id || ''}
          onChange={event => selectWorkspace(event.target.value)}
        >
          <option value="" disabled>Select workspace…</option>
          {activeWorkspaces.map(workspace => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
        <button type="button" disabled={!canSelect || !selectedWorkspace} onClick={clearWorkspace}>
          Clear
        </button>
      </div>

      {!canSelect && (
        <p className="workspace-selector-note">Only authorized office users can change workspace context.</p>
      )}
      {selectionError && <p className="workspace-selector-error">{selectionError}</p>}
    </section>
  );
}
