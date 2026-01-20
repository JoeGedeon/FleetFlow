import './styles/app.css';
import { useEffect, useState } from 'react';
import { MoveMastersAPI } from './api/moveMastersApi';
import { JobStatus } from './shared/jobSchema';

/* ================= JOB COMMUNICATIONS ================= */

function JobCommunications({ job, role, onSend }) {
  const [text, setText] = useState('');

  const visibleMessages = job.communications.filter(
    msg => msg.fromRole === role || msg.toRole === role || role === 'office'
  );

  return (
    <div style={{ marginTop: 20, border: '1px solid #999', padding: 10 }}>
      <h4>Job Communications</h4>

      <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 10 }}>
        {visibleMessages.map(m => (
          <div key={m.id} style={{ fontSize: 12, marginBottom: 6 }}>
            <strong>{m.fromRole}:</strong> {m.text}
          </div>
        ))}
      </div>

      <textarea
        rows={2}
        value={text}
        placeholder="Enter job-related message"
        onChange={e => setText(e.target.value)}
        style={{ width: '100%' }}
      />

      <button
        disabled={!text.trim()}
        onClick={() => {
          onSend(text);
          setText('');
        }}
        style={{ marginTop: 6 }}
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
        {['driver', 'helper', 'office', 'client'].map(r => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={role === r ? 'active' : ''}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>

      <p>
        <strong>Status:</strong>{' '}
        {job.status === JobStatus.COMPLETED ? 'Delivered' : job.status}
      </p>

      {/* ================= DRIVER ================= */}

      {role === 'driver' && (
        <>
          {job.status === JobStatus.SURVEY && (
            <button
              onClick={() =>
                MoveMastersAPI.submitFieldUpdate(job.id, { cfDelta: 120 }).then(setJob)
              }
            >
              Submit Survey to Office
            </button>
          )}

          {job.status === JobStatus.LOADING && (
            <>
              <div className="auth-box">✔ LOAD AUTHORIZED</div>
              <button
                onClick={() =>
                  MoveMastersAPI.submitLoadingEvidence(job.id, {
                    loadedTruckPhotos: ['loaded.jpg'],
                    emptyOriginPhotos: ['empty.jpg']
                  }).then(setJob)
                }
              >
                Submit Load Complete
              </button>
            </>
          )}

          {job.status === JobStatus.IN_WAREHOUSE && (
            <button
              onClick={() =>
                MoveMastersAPI.warehouseIntake(job.id, {
                  facilityId: 'WH-22',
                  vaultId: 'VAULT-7',
                  intakePhotos: ['intake.jpg']
                }).then(setJob)
              }
            >
              Confirm Warehouse Intake
            </button>
          )}

          {job.status === JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE && (
            <>
              <div className="auth-box">📸 DELIVERY COMPLETE</div>

              <button
                onClick={() =>
                  MoveMastersAPI.submitDeliveryEvidence(job.id, {
                    inPlacePhotos: ['placed.jpg'],
                    assembledPhotos: ['assembled.jpg'],
                    emptyTruckPhotos: ['empty_truck.jpg']
                  }).then(setJob)
                }
              >
                Submit Delivery Evidence
              </button>

              <button
                onClick={() =>
                  MoveMastersAPI.signOffByDriver(job.id).then(setJob)
                }
              >
                Driver Sign & Close
              </button>
            </>
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
            <button
              onClick={() =>
                MoveMastersAPI.approvePricing(job.id, 3850).then(setJob)
              }
            >
              Approve Pricing & Send to Client
            </button>
          )}

          {job.status === JobStatus.AWAITING_SIGNATURE && job.clientSigned && (
            <button
              onClick={() =>
                MoveMastersAPI.authorizeLoading(job.id).then(setJob)
              }
            >
              Authorize Loading
            </button>
          )}

          {/* 🔴 THIS IS WHAT YOU WERE MISSING */}
          {job.status === JobStatus.AWAITING_DISPATCH && (
            <>
              <button
                onClick={() =>
                  MoveMastersAPI.routeToWarehouse(job.id).then(setJob)
                }
              >
                Route to Warehouse
              </button>

              <button
                onClick={() =>
                  MoveMastersAPI.routeToDelivery(job.id).then(setJob)
                }
              >
                Route to Direct Delivery
              </button>
            </>
          )}

          {job.status === JobStatus.AWAITING_OUTTAKE && (
            <button
              onClick={() =>
                MoveMastersAPI.authorizeOuttake(job.id).then(setJob)
              }
            >
              Release From Warehouse
            </button>
          )}

          {job.status === JobStatus.PAYMENT_PENDING && (
            <button
              onClick={() =>
                MoveMastersAPI.confirmPayment(job.id).then(setJob)
              }
            >
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

      {/* ================= CLIENT ================= */}

      {role === 'client' && (
        <>
          {job.status === JobStatus.AWAITING_SIGNATURE && !job.clientSigned && (
            <button
              onClick={() =>
                MoveMastersAPI.signByClient(job.id).then(setJob)
              }
            >
              Sign & Accept Price
            </button>
          )}

          {job.status === JobStatus.OUT_FOR_DELIVERY && (
            <button
              onClick={() =>
                MoveMastersAPI.confirmDeliveryByClient(job.id).then(setJob)
              }
            >
              Confirm Delivery
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
