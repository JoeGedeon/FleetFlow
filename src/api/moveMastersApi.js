import { createJob, JobStatus } from '../shared/jobSchema';

let JOB_DB = {
  'FLEETFLOW-001': createJob('FLEETFLOW-001')
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
    job.permissions.clientCanSign = false;

    return Promise.resolve(job);
  },

  approvePricing(jobId, approvedTotal) {
    const job = JOB_DB[jobId];

    job.billing.approvedTotal = approvedTotal;
    job.billing.approvedBy = 'office';
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

    if (!job.clientSigned) {
      throw new Error('Client must sign before loading can begin');
    }

    job.status = JobStatus.LOADING;
    job.permissions.driverCanEdit = true;

    return Promise.resolve(job);
  }
};
