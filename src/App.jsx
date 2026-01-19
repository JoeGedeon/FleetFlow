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

  return (
    <div style={{ padding: 20 }}>
      <h1>Fleet Flow</h1>

      <div style={{ marginBottom: 10 }}>
        {['driver', 'office', 'client'].map(r => (
          <button key={r} onClick={() => setRole(r)} style={{ marginRight: 5 }}>
            {r}
          </button>
        ))}
      </div>

      <p><strong>Status:</strong> {job.status}</p>

      {/* DRIVER */}
      {role === 'driver' && (
        <>
          {job.status === JobStatus.LOADING && (
            <button
              onClick={() =>
                MoveMastersAPI.submitLoadingEvidence(job.id, {
                  loadedTruckPhotos: ['photo1.jpg'],
                  emptyOriginPhotos: ['photo2.jpg']
                }).then(setJob)
              }
            >
              Submit Load Complete
            </button>
          )}

          {job.status === JobStatus.AWAITING_DISPATCH && (
            <p>Load submitted. Awaiting office dispatch decision.</p>
          )}

          {job.status === JobStatus.OUT_FOR_DELIVERY && (
            <p>Proceed to delivery.</p>
          )}

          {job.status === JobStatus.IN_WAREHOUSE && (
            <p>Proceed to warehouse intake.</p>
          )}
        </>
      )}

      {/* OFFICE */}
      {role === 'office' && (
        <>
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
                style={{ marginLeft: 10 }}
              >
                Route to Direct Delivery
              </button>
            </>
          )}

          {job.status === JobStatus.IN_WAREHOUSE && (
            <p>Job is in warehouse custody.</p>
          )}

          {job.status === JobStatus.OUT_FOR_DELIVERY && (
            <p>Job dispatched for delivery.</p>
          )}
        </>
      )}

      {/* CLIENT */}
      {role === 'client' && (
        <>
          {job.status === JobStatus.AWAITING_DISPATCH && (
            <p>Loading completed. Dispatch decision pending.</p>
          )}

          {job.status === JobStatus.OUT_FOR_DELIVERY && (
            <p>Your items are en route.</p>
          )}

          {job.status === JobStatus.IN_WAREHOUSE && (
            <p>Your items are in secure storage.</p>
          )}
        </>
      )}
    </div>
  );
}
