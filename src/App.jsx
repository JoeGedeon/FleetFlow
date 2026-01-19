import { useEffect, useState } from 'react';
import { MoveMastersAPI } from './api/moveMastersApi';
import { JobStatus } from './shared/jobSchema';

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
