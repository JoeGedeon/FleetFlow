import { useEffect, useState } from 'react';
import { MoveMastersAPI } from './api/moveMastersApi';
import { JobStatus } from './shared/jobSchema';

export default function App() {
  const [job, setJob] = useState(null);
  const [role, setRole] = useState('driver');

  useEffect(() => {
    MoveMastersAPI.getJob('FLEETFLOW-001').then(setJob);
  }, []);

  if (!job) return <div>Loading…</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Fleet Flow</h1>

      {['driver', 'office', 'client'].map(r => (
        <button key={r} onClick={() => setRole(r)}>{r}</button>
      ))}

      <p><strong>Status:</strong> {job.status}</p>

      {/* DRIVER */}
      {role === 'driver' && (
        <>
          {job.status === JobStatus.IN_WAREHOUSE && (
            <button onClick={() =>
              MoveMastersAPI.warehouseIntake(job.id, {
                facilityId: 'WH-22',
                vaultId: 'VAULT-7',
                intakePhotos: ['intake.jpg']
              }).then(setJob)
            }>
              Confirm Warehouse Intake
            </button>
          )}

          {job.status === JobStatus.UNLOAD_AUTHORIZED && (
            <button onClick={() =>
              MoveMastersAPI.completeUnload(job.id).then(setJob)
            }>
              Unload & Complete Job
            </button>
          )}
        </>
      )}

      {/* OFFICE */}
      {role === 'office' && (
        <>
          {job.status === JobStatus.AWAITING_OUTTAKE && (
            <button onClick={() =>
              MoveMastersAPI.authorizeOuttake(job.id).then(setJob)
            }>
              Release From Warehouse
            </button>
          )}

          {job.status === JobStatus.PAYMENT_PENDING && (
            <button onClick={() =>
              MoveMastersAPI.confirmPayment(job.id).then(setJob)
            }>
              Confirm Payment
            </button>
          )}
        </>
      )}

      {/* CLIENT */}
      {role === 'client' && (
        <>
          {job.status === JobStatus.OUT_FOR_DELIVERY && (
            <p>Out for delivery.</p>
          )}
          {job.status === JobStatus.PAYMENT_PENDING && (
            <p>Payment required before unloading.</p>
          )}
          {job.status === JobStatus.COMPLETED && (
            <p>Move complete. Thank you.</p>
          )}
        </>
      )}
    </div>
  );
}
