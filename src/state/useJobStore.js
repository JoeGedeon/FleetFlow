import { useState } from 'react';

/* ================= STATUS DEFINITIONS ================= */
export const JobStatus = {
  SURVEY_IN_PROGRESS: 'SURVEY_IN_PROGRESS',
  OFFICE_REVIEW_PRICING: 'OFFICE_REVIEW_PRICING',
  CLIENT_APPROVAL_PENDING: 'CLIENT_APPROVAL_PENDING',
  PICKUP_PAYMENT_REQUIRED: 'PICKUP_PAYMENT_REQUIRED',
  LOADING_AUTHORIZED: 'LOADING_AUTHORIZED',
  LOADING_IN_PROGRESS: 'LOADING_IN_PROGRESS',
  LOAD_COMPLETE_PENDING_REVIEW: 'LOAD_COMPLETE_PENDING_REVIEW',
  PICKUP_CONFIRMED: 'PICKUP_CONFIRMED',
  ROUTING_DECISION_PENDING: 'ROUTING_DECISION_PENDING',
  EN_ROUTE_TO_WAREHOUSE: 'EN_ROUTE_TO_WAREHOUSE',
  WAREHOUSE_INTAKE_PENDING: 'WAREHOUSE_INTAKE_PENDING',
  IN_STORAGE: 'IN_STORAGE',
  STORAGE_PAYMENT_REQUIRED: 'STORAGE_PAYMENT_REQUIRED',
  STORAGE_RELEASE_AUTHORIZED: 'STORAGE_RELEASE_AUTHORIZED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  ARRIVED_AT_DESTINATION: 'ARRIVED_AT_DESTINATION',
  DELIVERY_PAYMENT_REQUIRED: 'DELIVERY_PAYMENT_REQUIRED',
  UNLOAD_AUTHORIZED: 'UNLOAD_AUTHORIZED',
  UNLOADING_IN_PROGRESS: 'UNLOADING_IN_PROGRESS',
  DELIVERY_EVIDENCE_PENDING: 'DELIVERY_EVIDENCE_PENDING',
  CLIENT_DELIVERY_CONFIRMATION_PENDING: 'CLIENT_DELIVERY_CONFIRMATION_PENDING',
  OFFICE_CLOSEOUT_PENDING: 'OFFICE_CLOSEOUT_PENDING',
  COMPLETED: 'COMPLETED'
};

/* ================= STATUS FLOW & BATON ================= */
const STATUS_TRANSITIONS = {
  SURVEY_IN_PROGRESS: ['OFFICE_REVIEW_PRICING'],
  OFFICE_REVIEW_PRICING: ['CLIENT_APPROVAL_PENDING'],
  CLIENT_APPROVAL_PENDING: ['PICKUP_PAYMENT_REQUIRED'],
  PICKUP_PAYMENT_REQUIRED: ['LOADING_AUTHORIZED'],
  LOADING_AUTHORIZED: ['LOADING_IN_PROGRESS'],
  LOADING_IN_PROGRESS: ['LOAD_COMPLETE_PENDING_REVIEW'],
  LOAD_COMPLETE_PENDING_REVIEW: ['PICKUP_CONFIRMED'],
  PICKUP_CONFIRMED: ['ROUTING_DECISION_PENDING'],
  ROUTING_DECISION_PENDING: ['EN_ROUTE_TO_WAREHOUSE', 'OUT_FOR_DELIVERY'],
  EN_ROUTE_TO_WAREHOUSE: ['WAREHOUSE_INTAKE_PENDING'],
  WAREHOUSE_INTAKE_PENDING: ['IN_STORAGE'],
  IN_STORAGE: ['STORAGE_PAYMENT_REQUIRED', 'STORAGE_RELEASE_AUTHORIZED'],
  STORAGE_PAYMENT_REQUIRED: ['STORAGE_RELEASE_AUTHORIZED'],
  STORAGE_RELEASE_AUTHORIZED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['ARRIVED_AT_DESTINATION'],
  ARRIVED_AT_DESTINATION: ['DELIVERY_PAYMENT_REQUIRED'],
  DELIVERY_PAYMENT_REQUIRED: ['UNLOAD_AUTHORIZED'],
  UNLOAD_AUTHORIZED: ['UNLOADING_IN_PROGRESS'],
  UNLOADING_IN_PROGRESS: ['DELIVERY_EVIDENCE_PENDING'],
  DELIVERY_EVIDENCE_PENDING: ['CLIENT_DELIVERY_CONFIRMATION_PENDING'],
  CLIENT_DELIVERY_CONFIRMATION_PENDING: ['OFFICE_CLOSEOUT_PENDING'],
  OFFICE_CLOSEOUT_PENDING: ['COMPLETED']
};

const BATON_OWNER = {
  SURVEY_IN_PROGRESS: 'driver',
  OFFICE_REVIEW_PRICING: 'office',
  CLIENT_APPROVAL_PENDING: 'client',
  PICKUP_PAYMENT_REQUIRED: 'office',
  LOADING_AUTHORIZED: 'office',
  LOADING_IN_PROGRESS: 'driver',
  LOAD_COMPLETE_PENDING_REVIEW: 'office',
  PICKUP_CONFIRMED: 'office',
  ROUTING_DECISION_PENDING: 'office',
  EN_ROUTE_TO_WAREHOUSE: 'driver',
  WAREHOUSE_INTAKE_PENDING: 'warehouse',
  IN_STORAGE: 'system',
  STORAGE_PAYMENT_REQUIRED: 'office',
  STORAGE_RELEASE_AUTHORIZED: 'office',
  OUT_FOR_DELIVERY: 'driver',
  ARRIVED_AT_DESTINATION: 'driver',
  DELIVERY_PAYMENT_REQUIRED: 'office',
  UNLOAD_AUTHORIZED: 'office',
  UNLOADING_IN_PROGRESS: 'driver',
  DELIVERY_EVIDENCE_PENDING: 'driver',
  CLIENT_DELIVERY_CONFIRMATION_PENDING: 'client',
  OFFICE_CLOSEOUT_PENDING: 'office'
};

/* ================= HOOK ================= */
export function useJobStore() {
  const [job, setJob] = useState({
    id: 'JOB-001',
    status: JobStatus.SURVEY_IN_PROGRESS,
    inventory: [],
    clientSigned: false,
    payments: {
      pickup: false,
      storage: false,
      delivery: false
    },
    storageDays: 0,
    loadPhotos: [],
    deliveryPhotos: []
  });

  const addInventoryItem = (name) => {
    setJob(prev => ({
      ...prev,
      inventory: [
        ...prev.inventory,
        { id: Date.now(), name, qty: 1, photos: [] }
      ]
    }));
  };

  /* ========== VALIDATE TRANSITION ========== */
  const canTransition = (nextStatus, role) => {
    const allowedNext = STATUS_TRANSITIONS[job.status] || [];
    const owner = BATON_OWNER[job.status];

    if (!allowedNext.includes(nextStatus)) return false;
    if (owner !== role) return false;

    // Payment enforcement
    if (nextStatus === JobStatus.LOADING_AUTHORIZED && !job.payments.pickup) return false;
    if (nextStatus === JobStatus.STORAGE_RELEASE_AUTHORIZED && job.storageDays > 30 && !job.payments.storage) return false;
    if (nextStatus === JobStatus.UNLOAD_AUTHORIZED && !job.payments.delivery) return false;

    // Evidence enforcement
    if (nextStatus === JobStatus.LOAD_COMPLETE_PENDING_REVIEW && job.loadPhotos.length === 0) return false;
    if (nextStatus === JobStatus.DELIVERY_EVIDENCE_PENDING && job.deliveryPhotos.length === 0) return false;

    return true;
  };

  /* ========== UPDATE STATUS ========== */
  const updateStatus = (nextStatus, role) => {
    if (canTransition(nextStatus, role)) {
      setJob(prev => ({ ...prev, status: nextStatus }));
      return true;
    } else {
      console.warn(`Transition from ${job.status} to ${nextStatus} blocked for role ${role}`);
      return false;
    }
  };

  /* ========== PAYMENT HANDLERS ========== */
  const recordPayment = (type) => {
    if (!['pickup', 'storage', 'delivery'].includes(type)) return false;
    setJob(prev => ({
      ...prev,
      payments: { ...prev.payments, [type]: true }
    }));
  };

  /* ========== PHOTO EVIDENCE ========== */
  const addLoadPhotos = (photos) => {
    setJob(prev => ({ ...prev, loadPhotos: [...prev.loadPhotos, ...photos] }));
  };

  const addDeliveryPhotos = (photos) => {
    setJob(prev => ({ ...prev, deliveryPhotos: [...prev.deliveryPhotos, ...photos] }));
  };

  return {
    job,
    addInventoryItem,
    updateStatus,
    recordPayment,
    addLoadPhotos,
    addDeliveryPhotos,
    canTransition
  };
}
