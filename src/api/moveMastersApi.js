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
    job.status = JobStatus.LOADING;

    job.permissions.driverCanEdit = false;

    return Promise.resolve(job);
  },

  approveChanges(jobId, approvedTotal) {
    const job = JOB_DB[jobId];

    job.billing.approvedTotal = approvedTotal;
    job.billing.approvedBy = 'office';
    job.permissions.clientCanSign = true;

    return Promise.resolve(job);
  }
};

signByClient(jobId) {
  const job = JOB_DB[jobId];

  job.status = 'transit';
  job.permissions.clientCanSign = false;

  return Promise.resolve(job);
}
