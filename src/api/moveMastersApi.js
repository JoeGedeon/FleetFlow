import { createJob, JobStatus } from '../shared/jobSchema';

let JOB_DB = {
  'FLEETFLOW-001': createJob('FLEETFLOW-001')
};

/* ================= NORMALIZATION ================= */

const normalizeJob = job => {
  if (!Array.isArray(job.inventory)) {
    job.inventory = [];
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
      cubicFeet: item.cubicFeet || 0
    });

    return Promise.resolve(normalizeJob(job));
  },

  approvePricing(jobId, total) {
    const job = JOB_DB[jobId];
    job.billing.approvedTotal = total;
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
