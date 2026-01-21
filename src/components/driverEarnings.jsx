import './driverEarnings.css';

export default function DriverEarnings({ labor, status }) {
  if (!labor || labor.length === 0) return null;

  const driver = labor.find(w => w.role === 'driver');

  if (!driver) return null;

  const isLocked = status === 'completed';

  return (
    <div className="earnings-panel">
      <h4>Driver Earnings</h4>

      <div className="earnings-row">
        <span>Pay Type</span>
        <span>{driver.payType}</span>
      </div>

      <div className="earnings-row">
        <span>Rate</span>
        <span>
          {driver.payType === 'percent'
            ? `${driver.rate}%`
            : `$${driver.rate}`}
        </span>
      </div>

      <div className="earnings-row">
        <strong>Total Payout</strong>
        <strong>${driver.payout}</strong>
      </div>

      <div
        className={`earnings-status ${
          isLocked ? 'locked' : 'pending'
        }`}
      >
        {isLocked ? 'Finalized' : 'Pending Completion'}
      </div>
    </div>
  );
}
