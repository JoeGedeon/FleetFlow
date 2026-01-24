import { createJob, JobStatus } from '../shared/jobSchema';

let JOB_DB = {
  'FLEETFLOW-001': createJob('FLEETFLOW-001')
};

/* ================= NORMALIZATION ================= */

const normalizeJob = job => {
  if (!Array.isArray(job.inventory)) {
    job.inventory = [];
  }

  if (!job.inventoryTotals) {
    job.inventoryTotals = {
      estimatedCubicFeet: 0,
      revisedCubicFeet: 0,
      finalCubicFeet: 0
    };
  }

  return job;
};

/* ================= LABOR CALCULATION ================= */

const calculateLabor = job => {
  const revenue = job.billing.approvedTotal || 0;

  job.labor = job.labor.map(worker => {
    let payout = 0;

    if (worker.payType === 'percent') {
      payout = (revenue * worker.rate) / 100;
    }
    if (worker.payType === 'flat') {
      payout = worker.rate;
    }
    if (worker.payType === 'hourly') {
      payout = worker.rate * (worker.hours || 0);
    }

    return { ...worker, payout };
  });

  return job;
};

/* ================= PRICING CALCULATION ================= */
const getBaseRatePerCubicFoot = ({ region, season }) => {
  const RATE_TABLE = {
    FL: {
      standard: 4.25,
      peak: 5.25
    },
    TX: {
      standard: 4.75,
      peak: 5.75
    },
    CA: {
      standard: 7.5,
      peak: 9.0
    }
  };

  return RATE_TABLE[region]?.[season] || 5.0;
};

const calculateBasePricing = job => {
  const ratePerCubicFoot = 8.5;

  const cf = job.inventoryTotals?.finalCubicFeet || 0;

  const basePrice = cf * ratePerCubicFoot;

  job.billing.approvedTotal = Math.round(basePrice * 100) / 100;

  return job;
};

/* ================= API ================= */

export const MoveMastersAPI = {
  /* ---------- CORE ---------- */

  getJob(jobId) {
    return Promise.resolve(normalizeJob(JOB_DB[jobId]));
  },

  /* ---------- SURVEY & PRICING ---------- */

  submitFieldUpdate(jobId, payload) {
    const job = JOB_DB[jobId];
    job.proposedChanges = payload;
    job.status = JobStatus.PENDING_APPROVAL;
    job.permissions.driverCanEdit = false;
    return Promise.resolve(normalizeJob(job));
  },

 /* ---------- INVENTORY ---------- */

addInventoryItem(jobId, item) {
  const job = JOB_DB[jobId];

  if (!Array.isArray(job.inventory)) {
    job.inventory = [];
  }

  job.inventory.push({
    ...item,
    estimatedCubicFeet: item.estimatedCubicFeet || 0,
    revisedCubicFeet: item.revisedCubicFeet || 0,
    qty: item.qty || 1
  });

  return Promise.resolve(normalizeJob(job));
},

updateInventoryItem(jobId, itemId, updates) {
  const job = JOB_DB[jobId];

  job.inventory = job.inventory.map(item =>
    item.id === itemId ? { ...item, ...updates } : item
  );

  return Promise.resolve(normalizeJob(job));
},

updateInventoryTotals(jobId) {
  const job = JOB_DB[jobId];

  const items = Array.isArray(job.inventory) ? job.inventory : [];

  const totalEstimated = items.reduce(
    (sum, i) => sum + (i.estimatedCubicFeet || 0) * (i.qty || 1),
    0
  );

  const totalRevised = items.reduce(
    (sum, i) => sum + (i.revisedCubicFeet || 0) * (i.qty || 1),
    0
  );

  job.inventoryTotals = {
    estimatedCubicFeet: totalEstimated,
    revisedCubicFeet: totalRevised,
    finalCubicFeet: totalRevised > 0 ? totalRevised : totalEstimated
  };

  return Promise.resolve(normalizeJob(job));
},

  
  approvePricing(jobId) {
  let job = JOB_DB[jobId];

  job = calculateBasePricing(job);

  job.status = JobStatus.AWAITING_SIGNATURE;
  job.permissions.clientCanSign = true;

  return Promise.resolve(normalizeJob(job));
},

  signByClient(jobId) {
    const job = JOB_DB[jobId];
    job.clientSigned = true;
    job.clientSignedAt = new Date().toISOString();
    job.permissions.clientCanSign = false;
    return Promise.resolve(normalizeJob(job));
  },

  authorizeLoading(jobId) {
    const job = JOB_DB[jobId];
    job.status = JobStatus.LOADING;
    job.permissions.driverCanEdit = true;
    return Promise.resolve(normalizeJob(job));
  },

  /* ---------- LOADING ---------- */

  submitLoadingEvidence(jobId, evidence) {
    const job = JOB_DB[jobId];
    job.loadingEvidence = evidence;
    job.status = JobStatus.AWAITING_DISPATCH;
    return Promise.resolve(normalizeJob(job));
  },

  /* ---------- ROUTING ---------- */

  routeToWarehouse(jobId) {
    const job = JOB_DB[jobId];
    job.status = JobStatus.EN_ROUTE_TO_WAREHOUSE;
    return Promise.resolve(normalizeJob(job));
  },

  arriveAtWarehouse(jobId) {
    const job = JOB_DB[jobId];
    job.warehouse = {
      ...job.warehouse,
      inboundAt: new Date().toISOString(),
      inboundBy: 'driver'
    };
    job.status = JobStatus.IN_WAREHOUSE;
    return Promise.resolve(normalizeJob(job));
  },

  routeToDelivery(jobId) {
    const job = JOB_DB[jobId];
    job.status = JobStatus.OUT_FOR_DELIVERY;
    return Promise.resolve(normalizeJob(job));
  },

  /* ---------- DRIVER → WAREHOUSE HANDSHAKE ---------- */

  driverArrivesAtWarehouse(jobId) {
    const job = JOB_DB[jobId];
    job.warehouse = {
      ...job.warehouse,
      inboundAt: new Date().toISOString(),
      inboundBy: 'driver'
    };
    job.status = JobStatus.IN_WAREHOUSE;
    return Promise.resolve(normalizeJob(job));
  },

  /* ---------- 🏬 WAREHOUSE INBOUND ---------- */

  warehouseInbound(jobId, payload) {
    const job = JOB_DB[jobId];
    job.warehouse = {
      ...job.warehouse,
      ...payload,
      inboundAt: new Date().toISOString(),
      inboundBy: payload.by || 'warehouse'
    };
    job.status = JobStatus.AWAITING_WAREHOUSE_DISPATCH;
    return Promise.resolve(normalizeJob(job));
  },

  /* ---------- 🧠 OFFICE DISPATCH FROM WAREHOUSE ---------- */

  dispatchFromWarehouse(jobId) {
    const job = JOB_DB[jobId];
    job.status = JobStatus.AWAITING_OUTTAKE;
    return Promise.resolve(normalizeJob(job));
  },

  /* ---------- 🏬 WAREHOUSE OUTBOUND ---------- */

  warehouseOutbound(jobId, payload) {
    const job = JOB_DB[jobId];
    job.warehouse = {
      ...job.warehouse,
      ...payload,
      outboundAt: new Date().toISOString(),
      outboundBy: payload.by || 'warehouse'
    };
    job.status = JobStatus.OUT_FOR_DELIVERY;
    return Promise.resolve(normalizeJob(job));
  },

  /* ---------- DELIVERY ARRIVAL & PAYMENT ---------- */

  arriveAtDestination(jobId) {
    const job = JOB_DB[jobId];
    job.arrivedAt = new Date().toISOString();
    job.status = JobStatus.PAYMENT_PENDING;
    return Promise.resolve(normalizeJob(job));
  },

  confirmPayment(jobId) {
    const job = JOB_DB[jobId];
    job.billing.paymentReceived = true;
    job.status = JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION;
    return Promise.resolve(normalizeJob(job));
  },

  /* ---------- CLIENT UNLOAD AUTH ---------- */

  confirmDeliveryByClient(jobId) {
    const job = JOB_DB[jobId];
    job.deliveryConfirmedByClient = true;
    job.deliveryConfirmedAt = new Date().toISOString();
    job.status = JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE;
    return Promise.resolve(normalizeJob(job));
  },

  /* ---------- DRIVER CLOSEOUT ---------- */

  submitDeliveryEvidence(jobId, evidence) {
    const job = JOB_DB[jobId];
    job.deliveryEvidence = evidence;
    return Promise.resolve(normalizeJob(job));
  },

  signOffByDriver(jobId) {
    const job = calculateLabor(JOB_DB[jobId]);
    job.driverSigned = true;
    job.driverSignedAt = new Date().toISOString();
    job.status = JobStatus.COMPLETED;
    return Promise.resolve(normalizeJob(job));
  },

  /* ---------- LABOR ---------- */

  addHelper(jobId, helper) {
    const job = JOB_DB[jobId];
    job.labor.push(helper);
    return Promise.resolve(normalizeJob(job));
  },

  /* ---------- JOB COMMUNICATIONS ---------- */

  addJobMessage(jobId, message) {
    const job = JOB_DB[jobId];
    job.communications.push({
      id: Date.now(),
      fromRole: message.fromRole,
      toRole: message.toRole,
      text: message.text,
      timestamp: new Date().toISOString()
    });
    return Promise.resolve(normalizeJob(job));
  }
};
