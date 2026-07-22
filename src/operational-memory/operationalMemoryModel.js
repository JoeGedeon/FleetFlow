export const OperationalMemoryQueueStage = Object.freeze({
  IMPORT: 'import',
  REVIEW: 'review',
  COMMIT: 'commit',
});

export const ConfidenceState = Object.freeze({
  UNKNOWN: 'unknown',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  HUMAN_VERIFIED: 'human_verified',
});

export const ApprovalState = Object.freeze({
  UNREVIEWED: 'unreviewed',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMMITTED: 'committed',
});

export const OperationalFeedEligibility = Object.freeze({
  NOT_ELIGIBLE: 'not_eligible',
  PENDING_VERIFICATION: 'pending_verification',
  READY: 'ready',
  PUBLISHED: 'published',
  FAILED: 'failed',
});

const QUEUE_STAGE_VALUES = new Set(Object.values(OperationalMemoryQueueStage));
const CONFIDENCE_VALUES = new Set(Object.values(ConfidenceState));
const APPROVAL_VALUES = new Set(Object.values(ApprovalState));
const FEED_VALUES = new Set(Object.values(OperationalFeedEligibility));

export function isQueueStage(value) {
  return QUEUE_STAGE_VALUES.has(value);
}

export function isConfidenceState(value) {
  return CONFIDENCE_VALUES.has(value);
}

export function isApprovalState(value) {
  return APPROVAL_VALUES.has(value);
}

export function isOperationalFeedEligibility(value) {
  return FEED_VALUES.has(value);
}

export function createOperationalMemoryQueueRecord({
  id,
  workspaceId,
  title,
  queueStage = OperationalMemoryQueueStage.IMPORT,
  confidence = ConfidenceState.UNKNOWN,
  approvalStatus = ApprovalState.UNREVIEWED,
  feedEligibility = OperationalFeedEligibility.NOT_ELIGIBLE,
  evidenceReferences = [],
  committed = false,
  publishedAt = null,
} = {}) {
  if (!id || typeof id !== 'string') {
    throw new Error('Operational Memory queue records require an id.');
  }

  if (!workspaceId || typeof workspaceId !== 'string') {
    throw new Error('Operational Memory queue records require a workspaceId.');
  }

  if (!title || typeof title !== 'string') {
    throw new Error('Operational Memory queue records require a title.');
  }

  if (!isQueueStage(queueStage)) {
    throw new Error(`Unknown Operational Memory queue stage: ${queueStage}`);
  }

  if (!isConfidenceState(confidence)) {
    throw new Error(`Unknown confidence state: ${confidence}`);
  }

  if (!isApprovalState(approvalStatus)) {
    throw new Error(`Unknown approval state: ${approvalStatus}`);
  }

  if (!isOperationalFeedEligibility(feedEligibility)) {
    throw new Error(`Unknown Operational Feed eligibility state: ${feedEligibility}`);
  }

  if (!Array.isArray(evidenceReferences)) {
    throw new Error('evidenceReferences must be an array.');
  }

  return Object.freeze({
    id,
    workspaceId,
    title,
    queueStage,
    confidence,
    approvalStatus,
    feedEligibility,
    evidenceReferences: Object.freeze([...evidenceReferences]),
    committed: Boolean(committed),
    publishedAt,
  });
}

export function isVerifiedQueueRecord(record) {
  return Boolean(
    record &&
      (record.confidence === ConfidenceState.HUMAN_VERIFIED ||
        record.approvalStatus === ApprovalState.APPROVED ||
        record.approvalStatus === ApprovalState.COMMITTED)
  );
}

export function isCommittedQueueRecord(record) {
  return Boolean(record?.committed || record?.approvalStatus === ApprovalState.COMMITTED);
}

export function isEligibleForOperationalFeed(record) {
  if (!record) return false;

  return (
    isVerifiedQueueRecord(record) &&
    isCommittedQueueRecord(record) &&
    record.feedEligibility === OperationalFeedEligibility.READY
  );
}

export function hasBeenPublishedToOperationalFeed(record) {
  return Boolean(
    record &&
      (record.feedEligibility === OperationalFeedEligibility.PUBLISHED || record.publishedAt)
  );
}

export function getEvidenceReferences(record) {
  return Array.isArray(record?.evidenceReferences) ? [...record.evidenceReferences] : [];
}

export function groupRecordsByQueueStage(records = []) {
  if (!Array.isArray(records)) {
    throw new Error('Operational Memory records must be an array.');
  }

  return records.reduce(
    (queues, record) => {
      if (!isQueueStage(record?.queueStage)) {
        throw new Error(`Unknown Operational Memory queue stage: ${record?.queueStage}`);
      }

      queues[record.queueStage].push(record);
      return queues;
    },
    {
      [OperationalMemoryQueueStage.IMPORT]: [],
      [OperationalMemoryQueueStage.REVIEW]: [],
      [OperationalMemoryQueueStage.COMMIT]: [],
    }
  );
}
