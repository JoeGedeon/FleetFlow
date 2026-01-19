import { useState } from 'react';

export function useJobStore() {
  const [job, setJob] = useState({
    id: 'JOB-001',
    status: 'survey', // survey → loading → delivery → completed
    inventory: [],
    clientSigned: false,
    paymentReceived: false
  });

  const addInventoryItem = (name) => {
    setJob(prev => ({
      ...prev,
      inventory: [
        ...prev.inventory,
        {
          id: Date.now(),
          name,
          qty: 1,
          photos: []
        }
      ]
    }));
  };

  const updateStatus = (nextStatus) => {
    setJob(prev => ({ ...prev, status: nextStatus }));
  };

  return {
    job,
    addInventoryItem,
    updateStatus
  };
}
