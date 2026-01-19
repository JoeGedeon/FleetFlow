export const JobStatus = {
  SURVEY: 'survey',
  PENDING_APPROVAL: 'pending_approval',
  AWAITING_SIGNATURE: 'awaiting_client_signature',
  LOADING: 'loading',
  AWAITING_DISPATCH: 'awaiting_dispatch_decision',

  IN_WAREHOUSE: 'in_warehouse',
  AWAITING_OUTTAKE: 'awaiting_outtake',
  OUT_FOR_DELIVERY: 'out_for_delivery',

  PAYMENT_PENDING: 'payment_pending',
  UNLOAD_AUTHORIZED: 'unload_authorized',
  COMPLETED: 'completed'
};

export function createJob(jobId) {
  return {
    id: jobId,
    status: JobStatus.SURVEY,

    proposedChanges: {},

    billing: {
      approvedTotal: null,
      approvedBy: null,
      paymentReceived: false
    },

    permissions: {
      driverCanEdit: true,
      clientCanSign: false
    },

    clientSigned: false,

    loadingEvidence: null,

    warehouse: {
      facilityId: null,
      vaultId: null,
      intakePhotos: [],
      outtakePhotos: []
    },

    // 👇 NEW
    labor: [
      {
        id: 'driver-1',
        role: 'driver',
        name: 'Lead Driver',
        payType: 'percent', // percent | hourly | flat
        rate: 15, // percent
        payout: 0
      }
    ]
  };
}
