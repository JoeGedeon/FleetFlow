export const JobContract = {
  meta: {
    orderNumber: '',
    pickupDate: '',
    deliveryDate: '',
    status: 'survey', // survey | pricing | authorized | loading | transit | storage | delivery_gate | completed
  },

  parties: {
    client: {
      name: '',
      phone: '',
      signature: null,
      signedAt: null
    },
    driver: {
      id: '',
      name: '',
      commissionRate: 0.15 // visible to driver, editable by office
    },
    office: {
      reviewer: ''
    }
  },

  inventory: {
    driverSheet: [],   // primary capture
    officeSheet: [],   // editable authority
    clientSheet: []    // read-only mirror
  },

  volume: {
    estimatedCF: 0,
    actualCF: 0,
    extraCF: 0
  },

  accessorials: {
    stairs: { origin: 0, destination: 0 },
    longCarry: { origin: 0, destination: 0 },
    bulkyItems: 0,
    packing: 0
  },

  pricing: {
    cfRate: 0,
    accessorialTotal: 0,
    packingTotal: 0,
    fuelSurchargePct: 0,
    discountPct: 0,
    grandTotal: 0,
    balanceDue: 0
  },

  payments: {
    deposit: 0,
    pickupPaid: 0,
    deliveryPaid: 0
  },

  evidence: {
    originPhotos: [],
    loadPhotos: [],
    emptyHousePhotos: [],
    deliveryPhotos: [],
    storageIntakePhotos: []
  }
};
