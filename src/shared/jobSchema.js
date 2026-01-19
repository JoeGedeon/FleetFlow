export const JobStatus = {
  SURVEY: 'survey',
  PENDING_APPROVAL: 'pending_approval',
  AWAITING_SIGNATURE: 'awaiting_client_signature',
  LOADING: 'loading',
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
