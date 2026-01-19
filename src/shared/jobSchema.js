export const JobStatus = {
  SURVEY: 'survey',
  LOADING: 'loading',
  TRANSIT: 'transit',
  DELIVERY: 'delivery',
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
    }
  };
}
