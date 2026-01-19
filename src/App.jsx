import { useState } from 'react';
import { useJobStore } from './state/useJobStore';
import InventoryPanel from './components/InventoryPanel';

export default function App() {
  const [role, setRole] = useState('driver');
  const { job, addInventoryItem, updateStatus } = useJobStore();

  return (
    <div style={{ padding: '20px' }}>
      <h1>FreeFlow Dashboard</h1>

      <div>
        <strong>Role:</strong>
        {['driver', 'office', 'client'].map(r => (
          <button key={r} onClick={() => setRole(r)}>
            {r}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '10px' }}>
        <strong>Status:</strong> {job.status}
      </div>

      {role === 'driver' && job.status === 'survey' && (
        <InventoryPanel
          inventory={job.inventory}
          addItem={addInventoryItem}
        />
      )}

      {role === 'office' && (
        <button onClick={() => updateStatus('loading')}>
          Approve Survey
        </button>
      )}

      {job.status === 'loading' && (
        <p>Loading phase active</p>
      )}
    </div>
  );
}
