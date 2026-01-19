export const JobStatus = {
  SURVEY: 'survey',
  PENDING_APPROVAL: 'pending_approval',
  AWAITING_SIGNATURE: 'awaiting_client_signature',
  LOADING: 'loading',
  AWAITING_DISPATCH: 'awaiting_dispatch_decision',
  IN_WAREHOUSE: 'in_warehouse',
  OUT_FOR_DELIVERY: 'out_for_delivery',
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

    clientSigned: false,

    loadingEvidence: {
      loadedTruckPhotos: [],
      emptyOriginPhotos: [],
      submittedAt: null
    }
  };
}
