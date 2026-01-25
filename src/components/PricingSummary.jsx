export default function PricingSummary({ job, role }) {
  if (!job || !job.billing) return null;

  const canSeePricing =
    role === 'office' ||
    role === 'client' ||
    role === 'driver';

  if (!canSeePricing) return null;

  const total = job.billing.approvedTotal;
  const estimated = job.inventoryTotals?.estimatedCubicFeet;
  const final = job.inventoryTotals?.finalCubicFeet;

  return (
    <div className="pricing-summary">
      <h3>Job Pricing</h3>

      <p>
        <strong>Total Price:</strong>{' '}
        {total !== null ? `$${total.toLocaleString()}` : 'Pending approval'}
      </p>

      {estimated !== final && final > 0 && (
        <p>
          <em>Price reflects revised inventory</em>
        </p>
      )}

      {job.billing.pricingBreakdown && role === 'office' && (
        <div className="pricing-breakdown">
          <h4>Pricing Breakdown</h4>

          <p>
            <strong>Base:</strong>{' '}
            {job.billing.pricingBreakdown.base.cubicFeet} CF × $
            {job.billing.pricingBreakdown.base.ratePerCubicFoot}
            {' = $'}
            {job.billing.pricingBreakdown.base.amount.toLocaleString()}
          </p>

          {job.billing.pricingBreakdown.accessorials.length > 0 && (
            <>
              <h5>Accessorials</h5>
              <ul>
                {job.billing.pricingBreakdown.accessorials.map((a, idx) => (
                  <li key={idx}>
                    {a.type.replace('_', ' ')} — ${a.amount.toLocaleString()}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p>
            <strong>Final Total:</strong>{' '}
            ${job.billing.pricingBreakdown.finalTotal.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
