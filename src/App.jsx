import { useEffect, useState } from 'react';
import { MoveMastersAPI } from './api/moveMastersApi';
import { JobStatus } from './shared/jobSchema';

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
    </div>
  );
}

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

  const totalLaborCost = job.labor?.reduce(
    (sum, worker) => sum + (worker.payout || 0),
    0
  ) || 0;

  return (
    <div style={{ padding: 20 }}>
      <h1>Fleet Flow</h1>

      {/* ROLE SWITCHER */}
      <div style={{ marginBottom: 16 }}>
        {['driver', 'office', 'client'].map(r => (
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
        <strong>Status:</strong> {job.status}
      </p>

      {/* ================= LABOR PANEL (NEW) ================= */}
      <div style={{ marginTop: 20, padding: 12, border: '1px solid #ccc' }}>
        <h3>Labor Breakdown</h3>

        {job.labor && job.labor.length > 0 ? (
          job.labor.map(worker => (
            <div key={worker.id} style={{ marginBottom: 4 }}>
              {worker.name} ({worker.role}) — $
              {(worker.payout || 0).toFixed(2)}
            </div>
          ))
        ) : (
          <p>No labor assigned.</p>
        )}

        <p style={{ marginTop: 8 }}>
          <strong>Total Labor Cost:</strong> ${totalLaborCost.toFixed(2)}
        </p>

        {/* OFFICE ONLY: ADD HELPER */}
        {role === 'office' && (
          <button
            style={{ marginTop: 10 }}
            onClick={() =>
              MoveMastersAPI.addHelper(job.id, {
                id: `helper-${Date.now()}`,
                role: 'helper',
                name: 'Helper',
                payType: 'flat',
                rate: 150,
                payout: 0
              }).then(setJob)
            }
          >
            Add Helper ($150 Flat)
          </button>
        )}
      </div>
      {/* ===================================================== */}

      {/* DRIVER VIEW */}
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

          {job.status === JobStatus.AWAITING_DISPATCH && (
            <p>Load submitted. Awaiting office dispatch decision.</p>
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

          {job.status === JobStatus.UNLOAD_AUTHORIZED && (
            <button
              onClick={() =>
                MoveMastersAPI.completeUnload(job.id).then(setJob)
              }
            >
              Unload & Complete Job
            </button>
          )}
        </>
      )}

      {/* OFFICE VIEW */}
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

          {job.status === JobStatus.AWAITING_SIGNATURE && !job.clientSigned && (
            <p>Waiting for client signature.</p>
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
        </>
      )}

      {/* CLIENT VIEW */}
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

          {job.status === JobStatus.AWAITING_SIGNATURE && job.clientSigned && (
            <p>Signature received. Awaiting office authorization.</p>
          )}

          {job.status === JobStatus.OUT_FOR_DELIVERY && (
            <p>Your items are out for delivery.</p>
          )}

          {job.status === JobStatus.COMPLETED && (
            <p>Move complete. Thank you.</p>
          )}
        </>
      )}
    </div>
  );
}
