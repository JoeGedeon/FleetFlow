import { useEffect, useState } from 'react';
import { MoveMastersAPI } from './api/moveMastersApi';
import { JobStatus } from './shared/jobSchema';

export default function App() {
  const [job, setJob] = useState(null);
  const [role, setRole] = useState('driver');

  useEffect(() => {
    MoveMastersAPI.getJob('FLEETFLOW-001').then(setJob);
  }, []);

  if (!job) {
    return <div style={{ padding: 20 }}>Connecting to MoveMasters.OS…</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Fleet Flow</h1>

      <div style={{ marginBottom: 10 }}>
        {['driver', 'office', 'client'].map(r => (
          <button
            key={r}
            onClick={() => setRole(r)}
            style={{ marginRight: 5 }}
          >
            {r}
          </button>
        ))}
      </div>

      <p><strong>Status:</strong> {job.status}</p>

      {/* DRIVER */}
      {role === 'driver' &&
        job.status === JobStatus.SURVEY &&
        job.permissions.driverCanEdit && (
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

      {role === 'driver' &&
        job.status === JobStatus.LOADING_AUTHORIZED && (
          <p>Loading Authorized. Driver may begin loading.</p>
        )}

      {/* OFFICE */}
      {role === 'office' &&
        job.status === JobStatus.PENDING_APPROVAL && (
          <button
            onClick={() =>
              MoveMastersAPI.approvePricing(job.id, 3850).then(setJob)
            }
          >
            Approve Pricing & Send to Client
          </button>
        )}

      {role === 'office' &&
        job.status === JobStatus.APPROVED_AWAITING_SIGNATURE &&
        job.clientSigned && (
          <button
            onClick={() =>
              MoveMastersAPI.authorizeLoading(job.id).then(setJob)
            }
          >
            Authorize Loading
          </button>
        )}

      {/* CLIENT */}
      {role === 'client' &&
        job.permissions.clientCanSign && (
          <button
            onClick={() =>
              MoveMastersAPI.signByClient(job.id).then(setJob)
            }
          >
            Sign & Accept Updated Price
          </button>
        )}
    </div>
  );
}
