import React from 'react';
import './DriverEarnings.css';

export default function DriverEarningsPanel({ job }) {
  const earnings = job?.driverEarnings || 0;

  return (
    <div className="driver-earnings-panel">
      <h3>Driver Earnings</h3>
      <p>Total: ${earnings.toLocaleString()}</p>
    </div>
  );
}
