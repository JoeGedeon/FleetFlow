import './driverEarnings.css';

export default function DriverEarningsPanel({ job }) {
  const driver = job.labor.find(w => w.role === 'driver');
  const helpers = job.labor.filter(w => w.role === 'helper');

  if (!driver) return null;

  const locked = job.status === 'completed';

  return (
    <div className="earnings-panel">
      <h3>Driver Earnings</h3>

      <div className="earnings-row">
        <span>Total Job Revenue</span>
        <strong>${job.billing.approvedTotal || 0}</strong>
      </div>

      <div className="earnings-row">
        <span>Your Commission</span>
        <strong>${driver.payout}</strong>
      </div>

      {helpers.length > 0 && (
        <>
          <h4>Helper Payouts</h4>
          {helpers.map(h => (
            <div key={h.id} className="earnings-row sub">
              <span>{h.name}</span>
              <span>${h.payout}</span>
            </div>
          ))}
        </>
      )}

      <div className={`earnings-status ${locked ? 'locked' : 'pending'}`}>
        {locked ? 'Earnings Locked' : 'Estimated – Pending Completion'}
      </div>
    </div>
  );
}
