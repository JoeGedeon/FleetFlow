import './styles/app.css';
import { useEffect, useState } from 'react';
import { MoveMastersAPI } from './api/moveMastersApi';
import { JobStatus } from './shared/jobSchema';

/* ================= STATUS FLOW ================= */
const STATUS_FLOW = [
  JobStatus.SURVEY,
  JobStatus.PENDING_APPROVAL,
  JobStatus.AWAITING_SIGNATURE,
  JobStatus.LOADING,
  JobStatus.AWAITING_DISPATCH,

  JobStatus.EN_ROUTE_TO_WAREHOUSE,
  JobStatus.IN_WAREHOUSE,
  JobStatus.AWAITING_WAREHOUSE_DISPATCH,
  JobStatus.AWAITING_OUTTAKE,

  JobStatus.OUT_FOR_DELIVERY,
  JobStatus.PAYMENT_PENDING,
  JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION,
  JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE,
  JobStatus.COMPLETED
];

/* ================= JOB COMMUNICATIONS ================= */

function ProgressTracker({ currentStatus }) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);

  return (
    <div className="progress-tracker">
      {STATUS_FLOW.map((status, index) => (
        <div
          key={status}
          className={`progress-step
            ${index <= currentIndex ? 'complete' : ''}
            ${index === currentIndex ? 'active' : ''}`}
        >
          <span className="dot" />
          <span className="label">{status.replace(/_/g, ' ')}</span>
        </div>
      ))}
    </div>
  );
}

function JobCommunications({ job, role, onSend }) {
  const [text, setText] = useState('');

  const visibleMessages = job.communications.filter(
    msg => msg.fromRole === role || msg.toRole === role || role === 'office'
  );

  return (
    <div className="job-comm">
      <h4>Job Communications</h4>

      <div className="messages">
        {visibleMessages.map(m => (
          <div key={m.id} className="message">
            <strong>{m.fromRole}:</strong> {m.text}
          </div>
        ))}
      </div>

      <textarea
        rows={2}
        value={text}
        placeholder="Enter job-related message"
        onChange={e => setText(e.target.value)}
      />

      <button
        disabled={!text.trim()}
        onClick={() => {
          onSend(text);
          setText('');
        }}
      >
        Send Message
      </button>
    </div>
  );
}

/* ================= MAIN APP ================= */

export default function App() {
  const [job, setJob] = useState(null);
  const [role, setRole] = useState('driver');

  useEffect(() => {
    MoveMastersAPI.getJob('FLEETFLOW-001').then(setJob);
  }, []);

  if (!job) return <div style={{ padding: 20 }}>Connecting…</div>;

  const helper = job.labor.find(w => w.role === 'helper');

  return (
    <div className="app-container">
      <h1>FleetFLOW</h1>

      {/* ROLE SWITCHER */}
      <div className="role-switcher">
        {['driver', 'helper', 'office', 'warehouse', 'client'].map(r => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={role === r ? 'active' : ''}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="status-bar">
        <span className="status-chip">
          {job.status === JobStatus.COMPLETED ? 'Delivered' : job.status}
        </span>
      </div>

      <ProgressTracker currentStatus={job.status} />

      {/* ================= DRIVER ================= */}

      {role === 'driver' && (
        <>
          {job.status === JobStatus.SURVEY && (
            <button onClick={() =>
              MoveMastersAPI.submitFieldUpdate(job.id, { cfDelta: 120 }).then(setJob)
            }>
              Submit Survey to Office
            </button>
          )}

          {job.status === JobStatus.LOADING && (
            <>
              <div className="auth-box">✔ LOAD AUTHORIZED</div>
              <button onClick={() =>
                MoveMastersAPI.submitLoadingEvidence(job.id, {
                  loadedTruckPhotos: ['loaded.jpg'],
                  emptyOriginPhotos: ['empty.jpg']
                }).then(setJob)
              }>
                Submit Load Complete
              </button>
            </>
          )}

          {job.status === JobStatus.OUT_FOR_DELIVERY && (
            <button onClick={() =>
              MoveMastersAPI.arriveAtDestination(job.id).then(setJob)
            }>
              Truck Arrived
            </button>
          )}

          {job.status === JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE && (
            <>
              <div className="auth-box">📸 DELIVERY IN PROGRESS</div>

              <button onClick={() =>
                MoveMastersAPI.submitDeliveryEvidence(job.id, {
                  inPlacePhotos: ['placed.jpg'],
                  assembledPhotos: ['assembled.jpg'],
                  emptyTruckPhotos: ['empty_truck.jpg']
                }).then(setJob)
              }>
                Submit Delivery Evidence
              </button>

              <button onClick={() =>
                MoveMastersAPI.signOffByDriver(job.id).then(setJob)
              }>
                Driver Sign & Close
              </button>
            </>
          )}
             {job.status === JobStatus.EN_ROUTE_TO_WAREHOUSE && (
  <button onClick={() =>
    MoveMastersAPI.arriveAtWarehouse(job.id).then(setJob)
  }>
    Arrive at Warehouse
  </button>
)}
          <JobCommunications
            job={job}
            role="driver"
            onSend={text =>
              MoveMastersAPI.addJobMessage(job.id, {
                fromRole: 'driver',
                toRole: 'office',
                text
              }).then(setJob)
            }
          />
        </>
      )}

      {role === 'driver' && (
  <>
    ...
    <DriverEarningsPanel job={job} />
  </>
)}

      {/* ================= HELPER ================= */}

      {role === 'helper' && (
        <>
          <p><strong>Your Pay:</strong> ${helper?.payout || 0}</p>
          <p className={`helper-status ${job.status === JobStatus.LOADING ? 'green' : 'gray'}`}>
            {job.status === JobStatus.LOADING ? 'Cleared to Work' : 'Awaiting Authorization'}
          </p>

          <JobCommunications
            job={job}
            role="helper"
            onSend={text =>
              MoveMastersAPI.addJobMessage(job.id, {
                fromRole: 'helper',
                toRole: 'office',
                text
              }).then(setJob)
            }
          />
        </>
      )}

      {/* ================= OFFICE ================= */}

      {role === 'office' && (
        <>
          {job.status === JobStatus.PENDING_APPROVAL && (
            <button onClick={() =>
              MoveMastersAPI.approvePricing(job.id, 3850).then(setJob)
            }>
              Approve Pricing & Send to Client
            </button>
          )}

          {job.status === JobStatus.AWAITING_SIGNATURE && job.clientSigned && (
            <button onClick={() =>
              MoveMastersAPI.authorizeLoading(job.id).then(setJob)
            }>
              Authorize Loading
            </button>
          )}

          {job.status === JobStatus.AWAITING_DISPATCH && (
            <>
              <button onClick={() =>
                MoveMastersAPI.routeToWarehouse(job.id).then(setJob)
              }>
                Route to Warehouse
              </button>

              <button onClick={() =>
                MoveMastersAPI.routeToDelivery(job.id).then(setJob)
              }>
                Route to Direct Delivery
              </button>
            </>
          )}
             {/* OFFICE DISPATCH FROM WAREHOUSE */}
{job.status === JobStatus.AWAITING_WAREHOUSE_DISPATCH && (
  <button onClick={() =>
    MoveMastersAPI.dispatchFromWarehouse(job.id).then(setJob)
  }>
    Dispatch Load From Warehouse
  </button>
)}
          {job.status === JobStatus.PAYMENT_PENDING && (
            <button onClick={() =>
              MoveMastersAPI.confirmPayment(job.id).then(setJob)
            }>
              Confirm Payment
            </button>
          )}

          <JobCommunications
            job={job}
            role="office"
            onSend={text =>
              MoveMastersAPI.addJobMessage(job.id, {
                fromRole: 'office',
                toRole: 'driver',
                text
              }).then(setJob)
            }
          />
        </>
      )}

      {/* ================= WAREHOUSE ================= */}

      {role === 'warehouse' && (
        <>
          {job.status === JobStatus.IN_WAREHOUSE && (
            <button onClick={() =>
              MoveMastersAPI.warehouseInbound(job.id, {
                facilityId: 'WH-22',
                vaultId: 'VAULT-7',
                intakePhotos: ['intake.jpg'],
                by: 'warehouse'
              }).then(setJob)
            }>
              Confirm Inbound Intake
            </button>
          )}

          {job.status === JobStatus.AWAITING_OUTTAKE && (
            <button onClick={() =>
              MoveMastersAPI.warehouseOutbound(job.id, {
                outtakePhotos: ['outtake.jpg'],
                by: 'warehouse'
              }).then(setJob)
            }>
              Release Load to Driver
            </button>
          )}

          <JobCommunications
            job={job}
            role="warehouse"
            onSend={text =>
              MoveMastersAPI.addJobMessage(job.id, {
                fromRole: 'warehouse',
                toRole: 'office',
                text
              }).then(setJob)
            }
          />
        </>
      )}

      {/* ================= CLIENT ================= */}

      {role === 'client' && (
        <>
          {job.status === JobStatus.AWAITING_SIGNATURE && !job.clientSigned && (
            <button onClick={() =>
              MoveMastersAPI.signByClient(job.id).then(setJob)
            }>
              Sign & Accept Price
            </button>
          )}

          {job.status === JobStatus.OUT_FOR_DELIVERY && (
            <button onClick={() =>
              MoveMastersAPI.arriveAtDestination(job.id).then(setJob)
            }>
              Truck Arrived
            </button>
          )}

          {job.status === JobStatus.UNLOAD_AUTHORIZED && (
            <button onClick={() =>
              MoveMastersAPI.confirmDeliveryByClient(job.id).then(setJob)
            }>
              Sign Delivery Completion
            </button>
          )}
             {/* CLIENT DELIVERY SIGNATURE — FINAL HANDSHAKE */}
{job.status === JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION && (
  <button onClick={() =>
    MoveMastersAPI.confirmDeliveryByClient(job.id).then(setJob)
  }>
    Sign Delivery Completion
  </button>
)}
          {job.status === JobStatus.COMPLETED && (
            <p>Move complete. Thank you.</p>
          )}

          <JobCommunications
            job={job}
            role="client"
            onSend={text =>
              MoveMastersAPI.addJobMessage(job.id, {
                fromRole: 'client',
                toRole: 'office',
                text
              }).then(setJob)
            }
          />
        </>
      )}
    </div>
  );
}
