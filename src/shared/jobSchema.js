export const JobStatus = {
  SURVEY: 'survey',
  PENDING_APPROVAL: 'pending_approval',
  AWAITING_SIGNATURE: 'awaiting_client_signature',
  LOADING: 'loading',
  AWAITING_DISPATCH: 'awaiting_dispatch_decision',

  IN_WAREHOUSE: 'in_warehouse',
  AWAITING_OUTTAKE: 'awaiting_outtake',
  OUT_FOR_DELIVERY: 'out_for_delivery',

  // 🔒 DELIVERY CLOSE LOOP
  DELIVERY_AWAITING_DRIVER_EVIDENCE: 'delivery_awaiting_driver_evidence',
  DELIVERY_AWAITING_CLIENT_CONFIRMATION: 'delivery_awaiting_client_confirmation',

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

    // 🔑 PRICING SIGNATURE
    clientSigned: false,

    loadingEvidence: null,

    // 🔒 DELIVERY CONFIRMATION FIELDS
    deliveryConfirmedByClient: false,
    clientFinalSigned: false, // ← FINAL RECEIPT ACKNOWLEDGMENT (THIS IS THE MISSING HANDSHAKE)
    deliveryEvidence: null,
    driverSigned: false,

    warehouse: {
      facilityId: null,
      vaultId: null,
      intakePhotos: [],
      outtakePhotos: []
    },

    // 📎 JOB COMMUNICATIONS (BUSINESS NOTES)
    communications: [],

    // 👷 LABOR (ISOLATED PER PERSON)
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
