import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ApprovalState,
  ConfidenceState,
  OperationalFeedEligibility,
  OperationalMemoryQueueStage,
  createOperationalMemoryQueueRecord,
  getEvidenceReferences,
  groupRecordsByQueueStage,
  hasBeenPublishedToOperationalFeed,
  isCommittedQueueRecord,
  isEligibleForOperationalFeed,
  isVerifiedQueueRecord,
} from './operationalMemoryModel.js';

const baseInput = {
  id: 'evidence-001',
  workspaceId: 'workspace-001',
  title: '2019 Moving Contract',
};

test('creates a deterministic import queue record with safe defaults', () => {
  const record = createOperationalMemoryQueueRecord(baseInput);

  assert.equal(record.queueStage, OperationalMemoryQueueStage.IMPORT);
  assert.equal(record.confidence, ConfidenceState.UNKNOWN);
  assert.equal(record.approvalStatus, ApprovalState.UNREVIEWED);
  assert.equal(record.feedEligibility, OperationalFeedEligibility.NOT_ELIGIBLE);
  assert.equal(record.committed, false);
});

test('rejects unknown queue, confidence, approval, and feed states', () => {
  assert.throws(
    () => createOperationalMemoryQueueRecord({ ...baseInput, queueStage: 'mystery' }),
    /Unknown Operational Memory queue stage/
  );
  assert.throws(
    () => createOperationalMemoryQueueRecord({ ...baseInput, confidence: 'certain-ish' }),
    /Unknown confidence state/
  );
  assert.throws(
    () => createOperationalMemoryQueueRecord({ ...baseInput, approvalStatus: 'rubber_stamped' }),
    /Unknown approval state/
  );
  assert.throws(
    () => createOperationalMemoryQueueRecord({ ...baseInput, feedEligibility: 'send_it' }),
    /Unknown Operational Feed eligibility state/
  );
});

test('requires verified and committed memory before Operational Feed eligibility', () => {
  const ready = createOperationalMemoryQueueRecord({
    ...baseInput,
    queueStage: OperationalMemoryQueueStage.COMMIT,
    confidence: ConfidenceState.HUMAN_VERIFIED,
    approvalStatus: ApprovalState.COMMITTED,
    feedEligibility: OperationalFeedEligibility.READY,
    committed: true,
  });

  assert.equal(isVerifiedQueueRecord(ready), true);
  assert.equal(isCommittedQueueRecord(ready), true);
  assert.equal(isEligibleForOperationalFeed(ready), true);

  const unverified = createOperationalMemoryQueueRecord({
    ...baseInput,
    feedEligibility: OperationalFeedEligibility.READY,
    committed: true,
  });

  assert.equal(isEligibleForOperationalFeed(unverified), false);
});

test('publication state and evidence references remain observable', () => {
  const record = createOperationalMemoryQueueRecord({
    ...baseInput,
    feedEligibility: OperationalFeedEligibility.PUBLISHED,
    evidenceReferences: ['contract.pdf', 'bol.pdf'],
  });

  assert.equal(hasBeenPublishedToOperationalFeed(record), true);
  assert.deepEqual(getEvidenceReferences(record), ['contract.pdf', 'bol.pdf']);
});

test('groups records into import, review, and commit queues', () => {
  const records = [
    createOperationalMemoryQueueRecord(baseInput),
    createOperationalMemoryQueueRecord({
      ...baseInput,
      id: 'evidence-002',
      queueStage: OperationalMemoryQueueStage.REVIEW,
    }),
    createOperationalMemoryQueueRecord({
      ...baseInput,
      id: 'evidence-003',
      queueStage: OperationalMemoryQueueStage.COMMIT,
    }),
  ];

  const queues = groupRecordsByQueueStage(records);

  assert.equal(queues.import.length, 1);
  assert.equal(queues.review.length, 1);
  assert.equal(queues.commit.length, 1);
});
