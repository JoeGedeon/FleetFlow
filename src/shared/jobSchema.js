export const JobStatus = {
  SURVEY: 'survey',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED_AWAITING_SIGNATURE: 'approved_awaiting_signature',
  LOADING_AUTHORIZED: 'loading_authorized',
  TRANSIT: 'transit',
  COMPLETED: 'completed'
};

export function createJob(jobId) {
  return {
    id: jobId,
    status: JobStatus.SURVEY,

    inventory: [],
    proposedChanges: {
      cfDelta: 0,
      stairs: 0,
      bulky: 0
    },

    billing: {
      approvedTotal: null,
      approvedBy: null
    },

    permissions: {
      driverCanEdit: true,
      clientCanSign: false
    },

    clientSigned: false
  };
}
