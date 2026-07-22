import { useMemo, useState } from 'react';
import {
  ConfidenceState,
  OperationalFeedEligibility,
  OperationalMemoryQueueStage,
  groupRecordsByQueueStage,
} from './operationalMemoryModel';

const QUEUE_DEFINITIONS = [
  {
    id: OperationalMemoryQueueStage.IMPORT,
    label: 'Import Queue',
    emptyTitle: 'No evidence waiting to be staged',
    emptyBody: 'Uploaded contracts and other evidence will enter Operational Memory here.',
  },
  {
    id: OperationalMemoryQueueStage.REVIEW,
    label: 'Review Queue',
    emptyTitle: 'Nothing requires review',
    emptyBody: 'Staged records will wait here until an authorized user verifies their fields.',
  },
  {
    id: OperationalMemoryQueueStage.COMMIT,
    label: 'Commit Queue',
    emptyTitle: 'Nothing is ready to commit',
    emptyBody: 'Approved records will appear here before they become verified operational memory.',
  },
];

function QueueCard({ definition, records, isActive, onSelect }) {
  return (
    <button
      type="button"
      className={`operational-memory-queue-card ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(definition.id)}
      aria-pressed={isActive}
    >
      <span>{definition.label}</span>
      <strong>{records.length}</strong>
    </button>
  );
}

function EmptyQueue({ definition }) {
  return (
    <div className="operational-memory-empty-state" role="status">
      <div className="operational-memory-empty-icon" aria-hidden="true">◎</div>
      <h3>{definition.emptyTitle}</h3>
      <p>{definition.emptyBody}</p>
    </div>
  );
}

export default function OperationalMemoryWorkspace({ workspaceName, records = [] }) {
  const [activeQueue, setActiveQueue] = useState(OperationalMemoryQueueStage.IMPORT);
  const queues = useMemo(() => groupRecordsByQueueStage(records), [records]);
  const activeDefinition =
    QUEUE_DEFINITIONS.find(definition => definition.id === activeQueue) ?? QUEUE_DEFINITIONS[0];
  const activeRecords = queues[activeDefinition.id];

  return (
    <section className="operational-memory-workspace" aria-labelledby="operational-memory-title">
      <header className="operational-memory-header">
        <div>
          <p className="operational-memory-eyebrow">Operational Memory</p>
          <h2 id="operational-memory-title">Evidence becomes verified business memory here.</h2>
          <p>
            {workspaceName
              ? `Workspace: ${workspaceName}`
              : 'Select a workspace to scope Operational Memory.'}
          </p>
        </div>
        <div className="operational-memory-trust-summary" aria-label="Trust model status">
          <span>Confidence: {ConfidenceState.HUMAN_VERIFIED.replace('_', ' ')}</span>
          <span>Feed: {OperationalFeedEligibility.NOT_ELIGIBLE.replace('_', ' ')}</span>
        </div>
      </header>

      <nav className="operational-memory-queues" aria-label="Operational Memory queues">
        {QUEUE_DEFINITIONS.map(definition => (
          <QueueCard
            key={definition.id}
            definition={definition}
            records={queues[definition.id]}
            isActive={activeDefinition.id === definition.id}
            onSelect={setActiveQueue}
          />
        ))}
      </nav>

      <div className="operational-memory-panel panel">
        <div className="operational-memory-panel-heading">
          <div>
            <p className="operational-memory-eyebrow">Current stage</p>
            <h3>{activeDefinition.label}</h3>
          </div>
          <span className="status-chip">{activeRecords.length} records</span>
        </div>

        {activeRecords.length === 0 ? (
          <EmptyQueue definition={activeDefinition} />
        ) : (
          <div className="operational-memory-record-list">
            {activeRecords.map(record => (
              <article key={record.id} className="operational-memory-record">
                <div>
                  <strong>{record.title}</strong>
                  <p>{record.evidenceReferences.length} evidence references</p>
                </div>
                <div className="operational-memory-record-status">
                  <span>{record.confidence.replaceAll('_', ' ')}</span>
                  <span>{record.approvalStatus.replaceAll('_', ' ')}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <footer className="operational-memory-policy-note">
        <strong>Platform policy:</strong> no external component may silently mutate Operational
        Memory. Operational Feed publishing remains reserved for a later slice.
      </footer>
    </section>
  );
}
