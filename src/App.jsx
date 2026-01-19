import { useEffect, useState } from 'react';
import { MoveMastersAPI } from './api/moveMastersApi';

export default function App() {
  const [job, setJob] = useState(null);
  const [role, setRole] = useState('driver');

  useEffect(() => {
    MoveMastersAPI.getJob('FLEETFLOW-001').then(setJob);
  }, []);

  if (!job) return <p>Connecting to MoveMasters.OS…</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Fleet Flow</h1>

      <div>
        {['driver', 'office', 'client'].map(r => (
          <button key={r} onClick={() => setRole(r)}>
            {r}
          </button>
        ))}
      </div>

      <p>Status: {job.status}</p>

      {role === 'driver' && job.permissions.driverCanEdit && (
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

      {role === 'office' && job.status === 'loading' && (
        <button
          onClick={() =>
            MoveMastersAPI.approveChanges(job.id, 3850).then(setJob)
          }
        >
          Approve & Send Back to Field
        </button>
      )}


      {role === 'client' && job.permissions.clientCanSign && (
  <button
    onClick={() =>
      MoveMastersAPI.signByClient(job.id).then(setJob)
    }
  >
    Sign & Authorize Move
  </button>
)}
      )}
    </div>
  );
}
