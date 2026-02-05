import React from 'react';

export default function PricingSummary({ job, role }) {
  if (!job?.billing) return null;

  return (
    <div className="pricing-summary">
      <h3>Pricing Summary ({role})</h3>
      <p>Estimated Total: ${job.billing.approvedTotal?.toLocaleString() || 'Calculating...'}</p>
      {job.billing.pricingBreakdown && (
        <div className="breakdown">
          <p><strong>Base:</strong> ${job.billing.pricingBreakdown.base.amount}</p>
          {job.billing.pricingBreakdown.accessorials.length > 0 && (
            <ul>
              {job.billing.pricingBreakdown.accessorials.map((a, i) => (
                <li key={i}>{a.type.replace('_', ' ')} — ${a.amount}</li>
              ))}
            </ul>
          )}
          <p><strong>Final Total:</strong> ${job.billing.pricingBreakdown.finalTotal}</p>
        </div>
      )}
    </div>
  );
}
