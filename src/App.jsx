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

      {/* ROLE SWITCHER */}
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

      <p>
        <strong>Status:</strong> {job.status}
      </p>

      {/* DRIVER VIEW */}
      {role === 'driver' && (
        <>
          {job.status === JobStatus.SURVEY && job.permissions.driverCanEdit && (
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
            <p>Loading Authorized. Driver may begin loading.</p>
          )}

          {job.status !== JobStatus.SURVEY &&
            job.status !== JobStatus.LOADING && (
              <p>Waiting for office approval.</p>
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

          {job.status === JobStatus.AWAITING_SIGNATURE &&
            job.clientSigned && (
              <button
                onClick={() =>
                  MoveMastersAPI.authorizeLoading(job.id).then(setJob)
                }
              >
                Authorize Loading
              </button>
            )}

          {job.status === JobStatus.AWAITING_SIGNATURE &&
            !job.clientSigned && (
              <p>Waiting for client signature.</p>
            )}
        </>
      )}

      {/* CLIENT VIEW */}
      {role === 'client' && (
        <>
          {job.permissions.clientCanSign && (
            <button
              onClick={() =>
                MoveMastersAPI.signByClient(job.id).then(setJob)
              }
            >
              Sign & Accept Updated Price
            </button>
          )}

          {!job.permissions.clientCanSign &&
            job.status === JobStatus.AWAITING_SIGNATURE && (
              <p>Signature received. Awaiting office authorization.</p>
            )}

          {job.status === JobStatus.LOADING && (
            <p>Loading in progress.</p>
          )}
        </>
      )}
    </div>
  );
}
