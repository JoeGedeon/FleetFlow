// src/api/moveMastersApi.js
// Firestore-backed API — wraps all operations against the shared movemastersos project.
// All mutations write to Firestore; reads come from Firestore so both MM.OS and FleetFlow
// see the same data in real time.

import { createJob, JobStatus } from '../shared/jobSchema';
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  serverTimestamp, collection, query, where, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

const JOBS = 'jobs';

/* ================= HELPERS ================= */

const safeDate = v => {
  if (!v) return new Date().toISOString();
  if (typeof v === 'string') return v;
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return new Date().toISOString();
};

// Firestore does not accept undefined values — strip them out
const clean = obj => JSON.parse(JSON.stringify(obj, (k, v) => v === undefined ? null : v));

/* ================= NORMALIZATION ================= */

const normalizeJob = job => {
  if (!job) return null;

  if (!Array.isArray(job.inventory))    { job.inventory = []; }
  if (!job.inventoryTotals) {
    job.inventoryTotals = { estimatedCubicFeet: 0, revisedCubicFeet: 0, finalCubicFeet: 0 };
  }
  if (!Array.isArray(job.paymentLedger)) { job.paymentLedger = []; }

  const totalPaid = job.paymentLedger.reduce((sum, p) => sum + (p.amount || 0), 0);
  job.billing.totalPaid           = totalPaid;
  job.billing.balanceRemaining    = job.billing.approvedTotal !== null
    ? Math.max(job.billing.approvedTotal - totalPaid, 0)
    : null;
  job.billing.isPaidInFull        = job.billing.balanceRemaining === 0 && job.billing.approvedTotal !== null;
  job.billing.pricingPhase        = job.clientSigned ? 'finalized'
    : job.status === JobStatus.PENDING_APPROVAL ? 'field_review' : 'estimated';

  job.permissions = {
    driverCanEdit:           job.status === JobStatus.SURVEY,
    clientCanSign:           job.status === JobStatus.AWAITING_SIGNATURE,
    officeCanAuthorizeUnload: job.status === JobStatus.PAYMENT_PENDING && job.billing.isPaidInFull === true,
    driverCanUnload:         job.status === JobStatus.UNLOAD_AUTHORIZED
  };

  return job;
};

/* ================= LABOR ================= */

const calculateLabor = job => {
  const revenue = job.billing.approvedTotal || 0;
  job.labor = job.labor.map(worker => {
    let payout = 0;
    if (worker.payType === 'percent') payout = (revenue * worker.rate) / 100;
    if (worker.payType === 'flat')    payout = worker.rate;
    if (worker.payType === 'hourly')  payout = worker.rate * (worker.hours || 0);
    return { ...worker, payout };
  });
  return job;
};

/* ================= PRICING ================= */

const calculateAccessorialPricing = job => {
  const a = job.accessorials || {};
  let total = 0;
  if (a.longCarryFeet && a.longCarryFeet > 75) total += (a.longCarryFeet - 75) * 1.25;
  if (a.stairs  && a.stairs  > 0) total += a.stairs  * 75;
  if (a.elevator)                 total += 50;
  if (Array.isArray(a.bulkyItems)) total += a.bulkyItems.length * 100;
  if (a.shuttleRequired)          total += 300;
  if (a.storageHandling)          total += 200;
  return Math.round(total * 100) / 100;
};

const calculatePricingBreakdown = job => {
  const breakdown = {
    base: { cubicFeet: job.inventoryTotals.finalCubicFeet, ratePerCubicFoot: 8.5, amount: 0 },
    accessorials: [], subtotal: 0, finalTotal: 0,
    calculatedAt: new Date().toISOString()
  };
  breakdown.base.amount  = breakdown.base.cubicFeet * breakdown.base.ratePerCubicFoot;
  breakdown.subtotal    += breakdown.base.amount;
  if (job.accessorials.longCarryFeet > 0) {
    const amount = job.accessorials.longCarryFeet * 1.25;
    breakdown.accessorials.push({ type: 'long_carry', units: job.accessorials.longCarryFeet, rate: 1.25, amount });
    breakdown.subtotal += amount;
  }
  if (job.accessorials.stairs > 0) {
    const amount = job.accessorials.stairs * 75;
    breakdown.accessorials.push({ type: 'stairs', units: job.accessorials.stairs, rate: 75, amount });
    breakdown.subtotal += amount;
  }
  if (job.accessorials.elevator) {
    const amount = 150;
    breakdown.accessorials.push({ type: 'elevator', amount });
    breakdown.subtotal += amount;
  }
  breakdown.finalTotal          = Math.round(breakdown.subtotal * 100) / 100;
  job.billing.pricingBreakdown  = breakdown;
  job.billing.approvedTotal     = breakdown.finalTotal;
  return job;
};

/* ================= FIRESTORE READ / WRITE ================= */

// Fetch job from Firestore; fall back to creating a new in-memory default if missing
const fetchJob = async jobId => {
  const ref  = doc(db, JOBS, jobId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    // Deserialize Firestore Timestamps to ISO strings
    const job  = {
      ...data,
      createdAt:  safeDate(data.createdAt),
      updatedAt:  safeDate(data.updatedAt),
      // Ensure nested arrays are present
      inventory:     data.inventory     || [],
      paymentLedger: data.paymentLedger || [],
      labor:         data.labor         || [],
      communications: data.communications || []
    };
    return normalizeJob(job);
  }
  // Job doesn't exist in Firestore — seed it from the default schema
  const newJob = createJob(jobId);
  await setDoc(ref, clean({ ...newJob, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  return normalizeJob(newJob);
};

// Write entire job back to Firestore
const saveJob = async job => {
  const ref = doc(db, JOBS, job.id);
  const toWrite = clean({ ...job, updatedAt: serverTimestamp() });
  await setDoc(ref, toWrite, { merge: true });
  return normalizeJob(job);
};

// Partial update (only changed fields)
const patchJob = async (jobId, patch) => {
  const ref = doc(db, JOBS, jobId);
  await updateDoc(ref, clean({ ...patch, updatedAt: serverTimestamp() }));
  return fetchJob(jobId);
};

/* ================= API ================= */

export const MoveMastersAPI = {

  /* ---------- CORE ---------- */
  async getJob(jobId) {
    return fetchJob(jobId);
  },

  // Subscribe to real-time updates for a job
  subscribeToJob(jobId, callback) {
    const ref = doc(db, JOBS, jobId);
    return onSnapshot(ref, snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      const job  = normalizeJob({
        ...data,
        createdAt:      safeDate(data.createdAt),
        updatedAt:      safeDate(data.updatedAt),
        inventory:      data.inventory      || [],
        paymentLedger:  data.paymentLedger  || [],
        labor:          data.labor          || [],
        communications: data.communications || []
      });
      callback(job);
    });
  },

  /* ---------- SURVEY & PRICING ---------- */
  async submitFieldUpdate(jobId, payload) {
    const job = await fetchJob(jobId);
    job.proposedChanges = payload;
    job.status          = JobStatus.PENDING_APPROVAL;
    job.permissions.driverCanEdit = false;
    return saveJob(job);
  },

  /* ---------- INVENTORY ---------- */
  async addInventoryItem(jobId, item) {
    const job = await fetchJob(jobId);
    if (job.loadingEvidence) return normalizeJob(job);
    if (!Array.isArray(job.inventory)) job.inventory = [];
    job.inventory.push({ ...item, estimatedCubicFeet: item.estimatedCubicFeet || 0, revisedCubicFeet: item.revisedCubicFeet || 0, qty: item.qty || 1 });
    return saveJob(job);
  },

  async updateInventoryItem(jobId, itemId, updates) {
    const job = await fetchJob(jobId);
    if (job.loadingEvidence) return normalizeJob(job);
    job.inventory = job.inventory.map(i => i.id === itemId ? { ...i, ...updates } : i);
    return saveJob(job);
  },

  async updateInventoryTotals(jobId) {
    const job   = await fetchJob(jobId);
    const items = Array.isArray(job.inventory) ? job.inventory : [];
    job.inventoryTotals = {
      estimatedCubicFeet: items.reduce((s, i) => s + (i.estimatedCubicFeet || 0) * (i.qty || 1), 0),
      revisedCubicFeet:   items.reduce((s, i) => s + (i.revisedCubicFeet   || 0) * (i.qty || 1), 0),
      finalCubicFeet: 0
    };
    job.inventoryTotals.finalCubicFeet = job.inventoryTotals.revisedCubicFeet > 0
      ? job.inventoryTotals.revisedCubicFeet
      : job.inventoryTotals.estimatedCubicFeet;
    return saveJob(job);
  },

  async approvePricing(jobId) {
    let job = await fetchJob(jobId);
    if (job.clientSigned) return normalizeJob(job);
    job = calculatePricingBreakdown(job);
    job.status = JobStatus.AWAITING_SIGNATURE;
    job.permissions.clientCanSign = true;
    return saveJob(job);
  },

  async signByClient(jobId) {
    const job = await fetchJob(jobId);
    job.clientSigned   = true;
    job.clientSignedAt = new Date().toISOString();
    job.permissions.clientCanSign = false;
    return saveJob(job);
  },

  async authorizeLoading(jobId) {
    const job = await fetchJob(jobId);
    job.status = JobStatus.LOADING;
    job.permissions.driverCanEdit = true;
    return saveJob(job);
  },

  /* ---------- LOADING ---------- */
  async submitLoadingEvidence(jobId, evidence) {
    const job = await fetchJob(jobId);
    job.loadingEvidence = evidence;
    job.status          = JobStatus.AWAITING_DISPATCH;
    return saveJob(job);
  },

  /* ---------- ROUTING ---------- */
  async routeToWarehouse(jobId) {
    return patchJob(jobId, { status: JobStatus.EN_ROUTE_TO_WAREHOUSE });
  },

  async arriveAtWarehouse(jobId) {
    return patchJob(jobId, {
      'warehouse.inboundAt': new Date().toISOString(),
      'warehouse.inboundBy': 'driver',
      status: JobStatus.IN_WAREHOUSE
    });
  },

  async routeToDelivery(jobId) {
    return patchJob(jobId, { status: JobStatus.OUT_FOR_DELIVERY });
  },

  async driverArrivesAtWarehouse(jobId) {
    return patchJob(jobId, {
      'warehouse.inboundAt': new Date().toISOString(),
      'warehouse.inboundBy': 'driver',
      status: JobStatus.IN_WAREHOUSE
    });
  },

  /* ---------- WAREHOUSE INBOUND ---------- */
  async warehouseInbound(jobId, payload) {
    const job = await fetchJob(jobId);
    job.warehouse = { ...job.warehouse, ...payload, inboundAt: new Date().toISOString(), inboundBy: payload.by || 'warehouse' };
    job.status    = JobStatus.AWAITING_WAREHOUSE_DISPATCH;
    return saveJob(job);
  },

  /* ---------- OFFICE DISPATCH FROM WAREHOUSE ---------- */
  async dispatchFromWarehouse(jobId) {
    return patchJob(jobId, { status: JobStatus.AWAITING_OUTTAKE });
  },

  /* ---------- WAREHOUSE OUTBOUND ---------- */
  async warehouseOutbound(jobId, payload) {
    const job = await fetchJob(jobId);
    job.warehouse = { ...job.warehouse, ...payload, outboundAt: new Date().toISOString(), outboundBy: payload.by || 'warehouse' };
    job.status    = JobStatus.OUT_FOR_DELIVERY;
    return saveJob(job);
  },

  /* ---------- DELIVERY ARRIVAL & PAYMENT ---------- */
  async arriveAtDestination(jobId) {
    return patchJob(jobId, { arrivedAt: new Date().toISOString(), status: JobStatus.PAYMENT_PENDING });
  },

  async confirmPayment(jobId) {
    return patchJob(jobId, { 'billing.paymentReceived': true, status: JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION });
  },

  async recordPayment(jobId, payment) {
    const job = await fetchJob(jobId);
    if (!job.paymentLedger) job.paymentLedger = [];
    job.paymentLedger.push({
      id:         Date.now(),
      amount:     payment.amount,
      method:     payment.method     || 'unknown',
      note:       payment.note       || '',
      receivedAt: new Date().toISOString(),
      receivedBy: payment.receivedBy || 'office'
    });
    return saveJob(job);
  },

  /* ---------- OFFICE DELIVERY ADJUSTMENTS ---------- */
  async updateDeliveryAccessorials(jobId, updates) {
    const job = await fetchJob(jobId);
    if (job.status !== JobStatus.PAYMENT_PENDING && job.status !== JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION) {
      return normalizeJob(job);
    }
    if (!job.deliveryAccessorials) {
      job.deliveryAccessorials = { longCarryFeet: 0, stairs: 0, elevator: false, bulkyItems: [], shuttleRequired: false, notes: '' };
    }
    job.deliveryAccessorials = { ...job.deliveryAccessorials, ...updates };
    return saveJob(job);
  },

  async approveDeliveryAdjustments(jobId) {
    let job = await fetchJob(jobId);
    if (job.status !== JobStatus.PAYMENT_PENDING || !job.billing.isPaidInFull) return normalizeJob(job);
    job.accessorials = { ...job.accessorials, ...job.deliveryAccessorials };
    job = calculatePricingBreakdown(job);
    job.status = JobStatus.UNLOAD_AUTHORIZED;
    return saveJob(job);
  },

  /* ---------- CLIENT UNLOAD AUTH ---------- */
  async confirmDeliveryByClient(jobId) {
    return patchJob(jobId, {
      deliveryConfirmedByClient: true,
      deliveryConfirmedAt:       new Date().toISOString(),
      status:                    JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE
    });
  },

  /* ---------- DRIVER CLOSEOUT ---------- */
  async submitDeliveryEvidence(jobId, evidence) {
    return patchJob(jobId, { deliveryEvidence: evidence });
  },

  async signOffByDriver(jobId) {
    const job = calculateLabor(await fetchJob(jobId));
    job.driverSigned   = true;
    job.driverSignedAt = new Date().toISOString();
    job.status         = JobStatus.COMPLETED;
    return saveJob(job);
  },

  /* ---------- LABOR ---------- */
  async addHelper(jobId, helper) {
    const job = await fetchJob(jobId);
    job.labor.push(helper);
    return saveJob(job);
  },

  /* ---------- COMMUNICATIONS ---------- */
  async addJobMessage(jobId, message) {
    const job = await fetchJob(jobId);
    job.communications.push({
      id:        Date.now(),
      fromRole:  message.fromRole,
      toRole:    message.toRole,
      text:      message.text,
      timestamp: new Date().toISOString()
    });
    return saveJob(job);
  }
};
