import React from 'react';

export default function PricingSummary({ job, role }) {
  if (!job || !job.billing) return null;

  const { approvedTotal, pricingBreakdown } = job.billing;
  const { inventoryTotals } = job;

  return (
    <div className="pricing-summary">
      <h3>Job Pricing</h3>

      <p>
        <strong>Current Total:</strong>{' '}
        {approvedTotal !== null
          ? `$${approvedTotal.toLocaleString()}`
          : 'Calculating…'}
      </p>

      {inventoryTotals?.estimatedCubicFeet !==
        inventoryTotals?.finalCubicFeet && (
        <p>
          <em>Price reflects revised inventory</em>
        </p>
      )}

      {/* OFFICE-ONLY DETAILED BREAKDOWN */}
      {role === 'office' && pricingBreakdown && (
        <div className="pricing-breakdown">
          <h4>Pricing Breakdown</h4>

          <p>
            <strong>Base:</strong>{' '}
            {pricingBreakdown.base.cubicFeet} CF × $
            {pricingBreakdown.base.ratePerCubicFoot}
            {' = $'}
            {pricingBreakdown.base.amount.toLocaleString()}
          </p>

          {pricingBreakdown.accessorials?.length > 0 && (
            <>
              <h5>Accessorials</h5>
              <ul>
                {pricingBreakdown.accessorials.map((a, idx) => (
                  <li key={idx}>
                    {a.type.replace('_', ' ')} — $
                    {a.amount.toLocaleString()}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p>
            <strong>Subtotal:</strong>{' '}
            ${pricingBreakdown.subtotal.toLocaleString()}
          </p>

          <p>
            <strong>Final Total:</strong>{' '}
            ${pricingBreakdown.finalTotal.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
