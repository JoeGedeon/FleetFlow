import { useEffect, useState } from 'react';
import { MoveMastersAPI } from './api/moveMastersApi';
import { JobStatus } from './shared/jobSchema';

/* ================= JOB COMMUNICATIONS ================= */

function JobCommunications({ job, role, onSend }) {
  const [text, setText] = useState('');

  const visibleMessages = job.communications.filter(msg =>
    msg.fromRole === role ||
    msg.toRole === role ||
    role === 'office'
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

      {role !== 'office' && (
        <>
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
            Send to Office
          </button>
        </>
      )}
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

  const roleButtonStyle = r => ({
    marginRight: 8,
    padding: '6px 12px',
    borderRadius: 20,
    border: '1px solid #000',
    cursor: 'pointer',
    backgroundColor: role === r ? '#000' : '#fff',
    color: role === r ? '#fff' : '#000',
    fontWeight: role === r ? 'bold' : 'normal'
  });

  const helper = job.labor.find(w => w.role === 'helper');

  return (
    <div style={{ padding: 20 }}>
      <h1>Fleet Flow</h1>

      {/* ROLE SWITCHER */}
      <div style={{ marginBottom: 16 }}>
        {['driver', 'helper', 'office', 'client'].map(r => (
          <button
            key={r}
            onClick={() => setRole(r)}
            style={roleButtonStyle(r)}
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

      {job.status === JobStatus.LOADING && (
  <div style={{
    marginBottom: 12,
    padding: 10,
    border: '2px solid green',
    backgroundColor: '#e8fbe8',
    color: 'green',
    fontWeight: 'bold'
  }}>
    ✔ LOAD AUTHORIZED — You may begin loading
  </div>
)}
      
      {role === 'driver' && (
        <>
          {job.status === JobStatus.SURVEY && (
            <button
              onClick={() =>
                MoveMastersAPI.submitFieldUpdate(job.id, {
                  cfDelta: 120,
                  stairs: 1,
                  bulky: 0
                }).then(setJob)
              }
            >
              Submit Survey to Office
            </button>
          )}

          {job.status === JobStatus.LOADING && (
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
          )}

          {job.status === JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE && (
            <>
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
                style={{ marginLeft: 10 }}
                onClick={() =>
                  MoveMastersAPI.signOffByDriver(job.id).then(setJob)
                }
              >
                Driver Sign & Close Contract
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

      {job.status === JobStatus.OUT_FOR_DELIVERY && (
  <div style={{ marginTop: 12 }}>
    <div style={{
      marginBottom: 10,
      padding: 10,
      border: '2px solid green',
      backgroundColor: '#e8fbe8',
      color: 'green',
      fontWeight: 'bold'
    }}>
      ✔ OUT FOR DELIVERY — Proceed to destination
    </div>
  </div>
)}

      {/* ================= HELPER ================= */}

      {role === 'helper' && (
        <>
          <p><strong>Your Pay:</strong> ${helper?.payout || 0}</p>
          <p>
            {job.status === JobStatus.LOADING ||
            job.status === JobStatus.OUT_FOR_DELIVERY ? (
              <span style={{ color: 'green', fontWeight: 'bold' }}>
                Cleared to Work
              </span>
            ) : (
              <span style={{ color: 'gray' }}>
                Awaiting Authorization
              </span>
            )}
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
                style={{ marginLeft: 10 }}
                onClick={() =>
                  MoveMastersAPI.routeToDelivery(job.id).then(setJob)
                }
              >
                Route to Direct Delivery
              </button>
            </>
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


      {job.status === JobStatus.AWAITING_OUTTAKE && (
  <button
    onClick={() =>
      MoveMastersAPI.authorizeOuttake(job.id).then(setJob)
    }
  >
    Release From Warehouse
  </button>
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
              Sign & Accept Updated Price
            </button>
          )}

          {job.status === JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION && (
            <button
              onClick={() =>
                MoveMastersAPI.confirmDeliveryByClient(job.id).then(setJob)
              }
            >
              Confirm Items Delivered
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

{job.status === JobStatus.OUT_FOR_DELIVERY && (
  <button
    onClick={() =>
      MoveMastersAPI.confirmDeliveryByClient(job.id).then(setJob)
    }
  >
    Confirm Items Delivered
  </button>
)}
