import React from 'react';
import './progressTracker.css';

export default function ProgressTracker({ currentStatus, statusFlow }) {
  const currentIndex = statusFlow.indexOf(currentStatus);

  return (
    <div className="progress-tracker">
      {statusFlow.map((status, index) => (
        <div
          key={status}
          className={`progress-step ${index <= currentIndex ? 'complete' : ''} ${index === currentIndex ? 'active' : ''}`}
        >
          <span className="dot" />
          <span className="label">{status.replace(/_/g, ' ')}</span>
        </div>
      ))}
    </div>
  );
}
