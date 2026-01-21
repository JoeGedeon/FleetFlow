import './progressTracker.css';
import { JobStatus } from '../shared/jobSchema';

const STATUS_FLOW = [
  JobStatus.SURVEY,
  JobStatus.PENDING_APPROVAL,
  JobStatus.AWAITING_SIGNATURE,
  JobStatus.LOADING,
  JobStatus.AWAITING_DISPATCH,
  JobStatus.IN_WAREHOUSE,
  JobStatus.AWAITING_WAREHOUSE_DISPATCH,
  JobStatus.AWAITING_OUTTAKE,
  JobStatus.OUT_FOR_DELIVERY,
  JobStatus.PAYMENT_PENDING,
  JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION,
  JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE,
  JobStatus.COMPLETED
];

const LABELS = {
  survey: 'Survey',
  pending_approval: 'Office Approval',
  awaiting_client_signature: 'Client Signature',
  loading: 'Loading',
  awaiting_dispatch_decision: 'Dispatch Decision',
  in_warehouse: 'In Warehouse',
  awaiting_warehouse_dispatch: 'Warehouse Dispatch',
  awaiting_outtake: 'Warehouse Release',
  out_for_delivery: 'Out for Delivery',
  payment_pending: 'Payment Pending',
  delivery_awaiting_client_confirmation: 'Client Sign-Off',
  delivery_awaiting_driver_evidence: 'Driver Evidence',
  completed: 'Completed'
};

export default function ProgressTracker({ currentStatus }) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);

  return (
    <div className="progress-tracker">
      {STATUS_FLOW.map((status, index) => {
        const isComplete = index < currentIndex;
        const isActive = index === currentIndex;

        return (
          <div
            key={status}
            className={`progress-step
              ${isComplete ? 'complete' : ''}
              ${isActive ? 'active' : ''}
            `}
          >
            <div className="step-indicator">
              {isComplete ? '✓' : index + 1}
            </div>

            <div className="step-label">
              {LABELS[status] || status}
            </div>
          </div>
        );
      })}
    </div>
  );
}
