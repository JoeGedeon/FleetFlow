export const JobStatus = {
  SURVEY: 'survey',
  PENDING_APPROVAL: 'pending_approval',
  AWAITING_SIGNATURE: 'awaiting_client_signature',
  LOADING: 'loading',
  AWAITING_DISPATCH: 'awaiting_dispatch_decision',

  EN_ROUTE_TO_WAREHOUSE: 'en_route_to_warehouse',

  IN_WAREHOUSE: 'in_warehouse',
  AWAITING_WAREHOUSE_DISPATCH: 'awaiting_warehouse_dispatch',
  AWAITING_OUTTAKE: 'awaiting_outtake',

  OUT_FOR_DELIVERY: 'out_for_delivery',
  PAYMENT_PENDING: 'payment_pending',

  UNLOAD_AUTHORIZED: 'unload_authorized',

  DELIVERY_AWAITING_CLIENT_CONFIRMATION: 'delivery_awaiting_client_confirmation',
  DELIVERY_AWAITING_DRIVER_EVIDENCE: 'delivery_awaiting_driver_evidence',

  COMPLETED: 'completed'
};

export function createJob(jobId) {
  return {
    id: jobId,
    status: JobStatus.SURVEY,

    /* ================= PRICING INPUTS ================= */

    pricingInputs: {
      region: 'FL',
      season: 'standard',

      baselineCubicFeet: 0,
      finalCubicFeet: 0,

      accessorials: {
        longCarry: false,
        stairs: false,
        elevator: false,
        bulkyItems: false,
        shuttle: false,
        storageHandling: false
      }
    },

    /* ================= SURVEY & INVENTORY ================= */

    proposedChanges: {},

    inventory: [],

    inventoryTotals: {
      estimatedCubicFeet: 0,
      revisedCubicFeet: 0,
      finalCubicFeet: 0
    },

    /* ================= BILLING ================= */

    billing: {
      approvedTotal: null,
      paymentReceived: false
    },

    /* ================= PAYMENTS & LEDGER ================= */

    payments: {
      totalDue: 0,
      paidToDate: 0,
      balanceRemaining: 0,

      ledger: [
        /*
        {
          id: 'txn-001',
          amount: 500,
          type: 'deposit',        // deposit | pickup | storage | final | adjustment
          method: 'credit_card',  // credit_card | cash | ach | zelle | check
          recordedBy: 'office',   // office | driver | system
          note: 'Booking deposit',
          recordedAt: '2024-01-15T14:22:00Z'
        }
        */
      ]
    },

    /* ================= ACCESSORIAL DETAILS ================= */

    accessorials: {
      longCarryFeet: 0,
      stairs: 0,
      elevator: false,
      bulkyItems: [],
      shuttleRequired: false,
      notes: ''
    },

    /* ================= PERMISSIONS ================= */

    permissions: {
      driverCanEdit: true,
      clientCanSign: false,

      officeCanAuthorizeUnload: false,
      driverCanUnload: false
    },

    /* ================= CLIENT SIGNATURE ================= */

    clientSigned: false,
    clientSignedAt: null,

    /* ================= LOADING ================= */

    loadingEvidence: null,

    /* ================= DELIVERY ================= */

    arrivedAt: null,

    deliveryConfirmedByClient: false,
    deliveryConfirmedAt: null,

    deliveryEvidence: null,

    driverSigned: false,
    driverSignedAt: null,

    /* ================= UNLOAD AUTHORIZATION ================= */

    unloadAuthorizedByOffice: false,
    unloadAuthorizedAt: null,
    unloadAuthorizedBy: null,

    /* ================= WAREHOUSE ================= */

    warehouse: {
      facilityId: null,
      vaultId: null,

      intakePhotos: [],
      outtakePhotos: [],

      inboundAt: null,
      outboundAt: null,

      inboundBy: null,
      outboundBy: null,

      inventoryNotes: ''
    },

    /* ================= COMMUNICATIONS ================= */

    communications: [],

    /* ================= LABOR ================= */

    labor: [
      {
        id: 'driver-1',
        role: 'driver',
        name: 'Lead Driver',
        payType: 'percent',
        rate: 15,
        payout: 0
      }
    ]
  };
}
