import { createJob, JobStatus } from '../shared/jobSchema';

let JOB_DB = {
  'FLEETFLOW-001': createJob('FLEETFLOW-001')
};

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

export const MoveMastersAPI = {
  getJob(jobId) {
    return Promise.resolve(JOB_DB[jobId]);
  },

  submitFieldUpdate(jobId, payload) {
    const job = JOB_DB[jobId];
    job.proposedChanges = payload;
    job.status = JobStatus.PENDING_APPROVAL;
    job.permissions.driverCanEdit = false;
    return Promise.resolve(job);
  },

  approvePricing(jobId, total) {
    const job = JOB_DB[jobId];
    job.billing.approvedTotal = total;
    job.status = JobStatus.AWAITING_SIGNATURE;
    job.permissions.clientCanSign = true;
    return Promise.resolve(job);
  },

  signByClient(jobId) {
    const job = JOB_DB[jobId];
    job.clientSigned = true;
    job.permissions.clientCanSign = false;
    return Promise.resolve(job);
  },

  authorizeLoading(jobId) {
    const job = JOB_DB[jobId];
    job.status = JobStatus.LOADING;
    job.permissions.driverCanEdit = true;
    return Promise.resolve(job);
  },

  submitLoadingEvidence(jobId, evidence) {
    const job = JOB_DB[jobId];
    job.loadingEvidence = evidence;
    job.status = JobStatus.AWAITING_DISPATCH;
    job.permissions.driverCanEdit = false;
    return Promise.resolve(job);
  },

  routeToWarehouse(jobId) {
    const job = JOB_DB[jobId];
    job.status = JobStatus.IN_WAREHOUSE;
    return Promise.resolve(job);
  },

  warehouseIntake(jobId, intake) {
    const job = JOB_DB[jobId];
    job.warehouse = intake;
    job.status = JobStatus.AWAITING_OUTTAKE;
    return Promise.resolve(job);
  },

  authorizeOuttake(jobId) {
    const job = JOB_DB[jobId];
    job.status = JobStatus.OUT_FOR_DELIVERY;
    return Promise.resolve(job);
  },

  // 🔒 DELIVERY CONFIRMATION GATES

  confirmDeliveryByClient(jobId) {
    const job = JOB_DB[jobId];
    job.deliveryConfirmedByClient = true;
    job.status = JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE;
    return Promise.resolve(job);
  },

  submitDeliveryEvidence(jobId, evidence) {
    const job = JOB_DB[jobId];
    job.deliveryEvidence = evidence;
    return Promise.resolve(job);
  },

  signOffByDriver(jobId) {
    const job = calculateLabor(JOB_DB[jobId]);
    job.driverSigned = true;
    job.status = JobStatus.COMPLETED;
    return Promise.resolve(job);
  },

  confirmPayment(jobId) {
    const job = JOB_DB[jobId];
    job.billing.paymentReceived = true;
    job.status = JobStatus.UNLOAD_AUTHORIZED;
    return Promise.resolve(job);
  },

  completeUnload(jobId) {
    const job = calculateLabor(JOB_DB[jobId]);
    job.status = JobStatus.COMPLETED;
    return Promise.resolve(job);
  },

  addHelper(jobId, helper) {
    const job = JOB_DB[jobId];
    job.labor.push(helper);
    return Promise.resolve(job);
  },

  // 📎 JOB COMMUNICATIONS
  addJobMessage(jobId, message) {
    const job = JOB_DB[jobId];

    job.communications.push({
      id: Date.now(),
      fromRole: message.fromRole,
      fromId: message.fromId || null,
      toRole: message.toRole,
      text: message.text,
      timestamp: new Date().toISOString()
    });

    return Promise.resolve(job);
  },

  getJobMessages(jobId) {
    return Promise.resolve(JOB_DB[jobId].communications);
  }
};
