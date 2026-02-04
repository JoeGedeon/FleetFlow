import ‘./styles/app.css’;
import { useEffect, useState } from ‘react’;
import { MoveMastersAPI } from ‘./api/moveMastersApi’;
import { JobStatus } from ‘./shared/jobSchema’;
import DriverEarningsPanel from ‘./components/DriverEarningsPanel’;
import InventoryPanel from ‘./components/InventoryPanel’;
import PricingSummary from ‘./components/PricingSummary’;

/* ================= STATUS FLOW ================= */
const STATUS_FLOW = [
JobStatus.SURVEY,
JobStatus.PENDING_APPROVAL,
JobStatus.AWAITING_SIGNATURE,
JobStatus.LOADING,
JobStatus.AWAITING_DISPATCH,
JobStatus.EN_ROUTE_TO_WAREHOUSE,
JobStatus.IN_WAREHOUSE,
JobStatus.AWAITING_WAREHOUSE_DISPATCH,
JobStatus.AWAITING_OUTTAKE,
JobStatus.OUT_FOR_DELIVERY,
JobStatus.PAYMENT_PENDING,
JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION,
JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE,
JobStatus.COMPLETED
];

/* ================= BATON DISPLAY ================= */
function BatonDisplay({ currentStatus, role }) {
const currentIndex = STATUS_FLOW.indexOf(currentStatus);

// Determine whose turn it is based on status
const getActiveRole = (status) => {
switch (status) {
case JobStatus.SURVEY:
return ‘driver’;
case JobStatus.PENDING_APPROVAL:
return ‘office’;
case JobStatus.AWAITING_SIGNATURE:
return ‘client’;
case JobStatus.LOADING:
return ‘driver’;
case JobStatus.AWAITING_DISPATCH:
return ‘office’;
case JobStatus.EN_ROUTE_TO_WAREHOUSE:
return ‘driver’;
case JobStatus.IN_WAREHOUSE:
return ‘warehouse’;
case JobStatus.AWAITING_WAREHOUSE_DISPATCH:
return ‘office’;
case JobStatus.AWAITING_OUTTAKE:
return ‘warehouse’;
case JobStatus.OUT_FOR_DELIVERY:
return ‘driver’;
case JobStatus.PAYMENT_PENDING:
return ‘office’;
case JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION:
return ‘client’;
case JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE:
return ‘driver’;
case JobStatus.COMPLETED:
return null;
default:
return null;
}
};

const activeRole = getActiveRole(currentStatus);
const isMyTurn = activeRole === role;

return (
<div style={{
padding: 16,
marginBottom: 20,
border: `3px solid ${isMyTurn ? '#22c55e' : '#94a3b8'}`,
borderRadius: 8,
backgroundColor: isMyTurn ? ‘#f0fdf4’ : ‘#f8fafc’
}}>
<div style={{ display: ‘flex’, justifyContent: ‘space-between’, alignItems: ‘center’ }}>
<div>
<h3 style={{ margin: 0, color: isMyTurn ? ‘#15803d’ : ‘#475569’ }}>
{isMyTurn ? ‘🏃 YOUR TURN’ : ‘⏳ Waiting’}
</h3>
<p style={{ margin: ‘4px 0 0 0’, fontSize: 14, color: ‘#64748b’ }}>
{currentStatus.replace(/_/g, ’ ’)}
</p>
</div>
<div style={{ textAlign: ‘right’ }}>
<div style={{ fontSize: 12, color: ‘#64748b’ }}>Current Actor</div>
<div style={{ fontSize: 16, fontWeight: ‘bold’, textTransform: ‘uppercase’ }}>
{activeRole || ‘COMPLETED’}
</div>
</div>
</div>
</div>
);
}

/* ================= PROGRESS TRACKER ================= */
function ProgressTracker({ currentStatus }) {
const currentIndex = STATUS_FLOW.indexOf(currentStatus);

return (
<div className="progress-tracker">
{STATUS_FLOW.map((status, index) => (
<div
key={status}
className={`progress-step ${index <= currentIndex ? 'complete' : ''} ${index === currentIndex ? 'active' : ''}`}
>
<span className="dot" />
<span className="label">{status.replace(/_/g, ’ ’)}</span>
</div>
))}
</div>
);
}

/* ================= PAYMENT GATE COMPONENT ================= */
function PaymentGate({ job, setJob, paymentType, label, onPaymentComplete }) {
const [amount, setAmount] = useState(’’);
const [processing, setProcessing] = useState(false);

const payment = job.payments?.[paymentType];

if (!payment) {
return null; // Payment not configured for this job yet
}

const handleCollectPayment = async () => {
if (!amount || parseFloat(amount) <= 0) {
alert(‘Please enter a valid payment amount’);
return;
}

```
setProcessing(true);

try {
  await MoveMastersAPI.collectPayment(job.id, {
    type: paymentType,
    amount: parseFloat(amount),
    timestamp: new Date().toISOString()
  });
  
  // Refresh job data
  const updatedJob = await MoveMastersAPI.getJob(job.id);
  setJob(updatedJob);
  
  // Execute callback if provided
  if (onPaymentComplete) {
    await onPaymentComplete();
  }
} catch (error) {
  alert('Payment collection failed: ' + error.message);
} finally {
  setProcessing(false);
}
```

};

if (payment.paid) {
return (
<div style={{
padding: 16,
backgroundColor: ‘#f0fdf4’,
border: ‘2px solid #22c55e’,
borderRadius: 8,
marginBottom: 12
}}>
<h4 style={{ margin: ‘0 0 8px 0’, color: ‘#15803d’ }}>
✓ {label} Collected
</h4>
<p style={{ margin: 0, fontSize: 14, color: ‘#64748b’ }}>
Amount: ${payment.amount.toFixed(2)}
<br />
Paid: {new Date(payment.timestamp).toLocaleString()}
</p>
</div>
);
}

return (
<div style={{
padding: 16,
backgroundColor: ‘#fef2f2’,
border: ‘2px solid #ef4444’,
borderRadius: 8,
marginBottom: 12
}}>
<h4 style={{ margin: ‘0 0 8px 0’, color: ‘#991b1b’ }}>
💳 {label} Required
</h4>
<p style={{ margin: ‘0 0 12px 0’, fontSize: 14, color: ‘#64748b’ }}>
Payment must be collected before proceeding to next step.
</p>
<div style={{ display: ‘flex’, gap: 8 }}>
<input
type=“number”
min=“0”
step=“0.01”
placeholder=“Amount ($)”
value={amount}
onChange={e => setAmount(e.target.value)}
style={{ flex: 1, padding: 8 }}
disabled={processing}
/>
<button
onClick={handleCollectPayment}
disabled={processing}
style={{
padding: ‘8px 16px’,
backgroundColor: ‘#22c55e’,
color: ‘white’,
border: ‘none’,
borderRadius: 4,
cursor: processing ? ‘not-allowed’ : ‘pointer’
}}
>
{processing ? ‘Processing…’ : ‘Collect Payment’}
</button>
</div>
</div>
);
}

/* ================= SIGNATURE PAD COMPONENT ================= */
function SignaturePad({ label, onSign, buttonText = “Sign” }) {
const [signature, setSignature] = useState(’’);
const [isSigning, setIsSigning] = useState(false);

const handleSign = async () => {
if (!signature.trim()) {
alert(‘Please enter your name to sign’);
return;
}

```
setIsSigning(true);
try {
  await onSign({
    name: signature,
    timestamp: new Date().toISOString()
  });
  setSignature('');
} catch (error) {
  alert('Signature failed: ' + error.message);
} finally {
  setIsSigning(false);
}
```

};

return (
<div style={{
padding: 16,
border: ‘2px solid #3b82f6’,
borderRadius: 8,
marginTop: 12,
marginBottom: 12
}}>
<h4 style={{ margin: ‘0 0 8px 0’ }}>{label}</h4>
<div style={{ display: ‘flex’, gap: 8 }}>
<input
type=“text”
placeholder=“Type your full name”
value={signature}
onChange={e => setSignature(e.target.value)}
style={{ flex: 1, padding: 8 }}
disabled={isSigning}
/>
<button
onClick={handleSign}
disabled={isSigning}
style={{
padding: ‘8px 16px’,
backgroundColor: ‘#3b82f6’,
color: ‘white’,
border: ‘none’,
borderRadius: 4,
cursor: isSigning ? ‘not-allowed’ : ‘pointer’
}}
>
{isSigning ? ‘Signing…’ : buttonText}
</button>
</div>
</div>
);
}

/* ================= JOB COMMUNICATIONS ================= */
function JobCommunications({ job, role, onSend }) {
const [text, setText] = useState(’’);

const visibleMessages = job.communications.filter(
msg => msg.fromRole === role || msg.toRole === role || role === ‘office’
);

return (
<div className="job-comm">
<h4>Job Communications</h4>

```
  <div className="messages">
    {visibleMessages.map(m => (
      <div key={m.id} className="message">
        <strong>{m.fromRole}:</strong> {m.text}
      </div>
    ))}
  </div>

  <textarea
    rows={2}
    value={text}
    placeholder="Enter job-related message"
    onChange={e => setText(e.target.value)}
  />

  <button
    disabled={!text.trim()}
    onClick={() => {
      onSend(text);
      setText('');
    }}
  >
    Send Message
  </button>
</div>
```

);
}

/* ================= MAIN APP ================= */
export default function App() {
const [job, setJob] = useState(null);
const [role, setRole] = useState(‘driver’);
const [loading, setLoading] = useState(true);

useEffect(() => {
const loadJob = async () => {
try {
setLoading(true);
const jobData = await MoveMastersAPI.getJob(‘FLEETFLOW-001’);
setJob(jobData);
} catch (error) {
console.error(‘Error loading job:’, error);
alert(‘Failed to load job’);
} finally {
setLoading(false);
}
};

```
loadJob();
```

}, []);

if (loading) {
return (
<div style={{ padding: 40, textAlign: ‘center’ }}>
<div style={{ fontSize: 24, marginBottom: 10 }}>🚚</div>
<div>Loading Fleet Flow…</div>
</div>
);
}

if (!job) {
return (
<div style={{ padding: 40, textAlign: ‘center’ }}>
<div style={{ fontSize: 24, marginBottom: 10, color: ‘#ef4444’ }}>⚠️</div>
<div>Failed to load job</div>
</div>
);
}

const helper = job.labor.find(w => w.role === ‘helper’);

return (
<div className="app-container">
<div style={{ display: ‘flex’, justifyContent: ‘space-between’, alignItems: ‘center’, marginBottom: 20 }}>
<h1>FleetFLOW</h1>
<div style={{
padding: ‘8px 16px’,
backgroundColor: ‘#3b82f6’,
color: ‘white’,
borderRadius: 6,
fontWeight: ‘bold’,
textTransform: ‘uppercase’,
fontSize: 14
}}>
{role}
</div>
</div>

```
  <div className="role-switcher">
    {['driver', 'helper', 'office', 'warehouse', 'client'].map(r => (
      <button
        key={r}
        onClick={() => setRole(r)}
        className={role === r ? 'active' : ''}
      >
        {r.toUpperCase()}
      </button>
    ))}
  </div>

  <BatonDisplay currentStatus={job.status} role={role} />

  <div className="status-bar">
    <span className="status-chip">
      {job.status === JobStatus.COMPLETED ? 'Delivered' : job.status}
    </span>
  </div>

  <ProgressTracker currentStatus={job.status} />
  
  <PricingSummary job={job} role={role} />

  {/* ================= DRIVER ================= */}
  {role === 'driver' && (
    <>
      {job.status === JobStatus.SURVEY && (
        <>
          <InventoryPanel
            role="driver"
            inventory={job.inventory}
            canEdit={true}
            addItem={item =>
              MoveMastersAPI
                .addInventoryItem(job.id, item)
                .then(() => MoveMastersAPI.updateInventoryTotals(job.id))
                .then(setJob)
            }
          />
          
          <button
            onClick={() =>
              MoveMastersAPI.submitFieldUpdate(job.id, { cfDelta: 120 }).then(setJob)
            }
          >
            📸 Submit Survey to Office
          </button>
        </>
      )}

      {job.status !== JobStatus.SURVEY && (
        <InventoryPanel
          role="driver"
          inventory={job.inventory}
          canEdit={false}
        />
      )}

      {job.status === JobStatus.LOADING && (
        <>
          <div style={{
            padding: 16,
            backgroundColor: '#f0fdf4',
            border: '2px solid #22c55e',
            borderRadius: 8,
            marginBottom: 12,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 'bold',
            color: '#15803d'
          }}>
            ✔ LOAD AUTHORIZED
          </div>
          
          <button
            onClick={() =>
              MoveMastersAPI.submitLoadingEvidence(job.id, {
                loadedTruckPhotos: ['loaded.jpg'],
                emptyOriginPhotos: ['empty.jpg']
              }).then(setJob)
            }
          >
            📦 Submit Load Complete
          </button>
        </>
      )}

      {job.status === JobStatus.EN_ROUTE_TO_WAREHOUSE && (
        <button
          onClick={() =>
            MoveMastersAPI.driverArrivesAtWarehouse(job.id).then(setJob)
          }
        >
          📍 Arrived at Warehouse
        </button>
      )}

      {job.status === JobStatus.OUT_FOR_DELIVERY && (
        <button
          onClick={() =>
            MoveMastersAPI.arriveAtDestination(job.id).then(setJob)
          }
        >
          📍 Truck Arrived at Destination
        </button>
      )}

      {job.status === JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE && (
        <>
          <div style={{
            padding: 16,
            backgroundColor: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: 8,
            marginBottom: 12,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 'bold',
            color: '#92400e'
          }}>
            📸 DELIVERY IN PROGRESS
          </div>

          <button
            onClick={() =>
              MoveMastersAPI.submitDeliveryEvidence(job.id, {
                inPlacePhotos: ['placed.jpg'],
                assembledPhotos: ['assembled.jpg'],
                emptyTruckPhotos: ['empty_truck.jpg']
              }).then(setJob)
            }
          >
            📸 Submit Delivery Evidence
          </button>

          <SignaturePad
            label="Driver Signature - Confirm Delivery Complete"
            onSign={async () => {
              await MoveMastersAPI.signOffByDriver(job.id);
              const updatedJob = await MoveMastersAPI.getJob(job.id);
              setJob(updatedJob);
            }}
            buttonText="Sign & Complete"
          />
        </>
      )}

      <DriverEarningsPanel job={job} />

      <JobCommunications
        job={job}
        role="driver"
        onSend={text =>
          MoveMastersAPI.addJobMessage(job.id, {
            fromRole: 'driver',
            toRole: 'office',
            text
          }).then(setJob)
        }
      />
    </>
  )}

  {/* ================= HELPER ================= */}
  {role === 'helper' && (
    <>
      <p><strong>Your Pay:</strong> ${helper?.payout || 0}</p>
      <p className={`helper-status ${job.status === JobStatus.LOADING ? 'green' : 'gray'}`}>
        {job.status === JobStatus.LOADING ? 'Cleared to Work' : 'Awaiting Authorization'}
      </p>

      <InventoryPanel
        role="helper"
        inventory={job.inventory}
        canEdit={false}
      />

      <JobCommunications
        job={job}
        role="helper"
        onSend={text =>
          MoveMastersAPI.addJobMessage(job.id, {
            fromRole: 'helper',
            toRole: 'office',
            text
          }).then(setJob)
        }
      />
    </>
  )}

  {/* ================= OFFICE ================= */}
  {role === 'office' && (
    <>
      {job.status === JobStatus.PENDING_APPROVAL && (
        <>
          <InventoryPanel
            role="office"
            inventory={job.inventory}
            updateItem={(itemId, updates) =>
              MoveMastersAPI
                .updateInventoryItem(job.id, itemId, updates)
                .then(setJob)
            }
          />
          
          <button
            onClick={() =>
              MoveMastersAPI
                .updateInventoryTotals(job.id)
                .then(() => MoveMastersAPI.approvePricing(job.id))
                .then(setJob)
            }
          >
            ✓ Approve Pricing & Send to Client
          </button>
        </>
      )}

      <div className="pricing-box">
        <h3>Current Pricing</h3>

        <p>
          <strong>Estimated Total:</strong>{' '}
          {job.billing.approvedTotal !== null
            ? `$${job.billing.approvedTotal.toLocaleString()}`
            : 'Calculating…'}
        </p>

        {job.inventoryTotals?.estimatedCubicFeet !==
          job.inventoryTotals?.finalCubicFeet && (
          <p>
            <em>Price reflects revised inventory</em>
          </p>
        )}
      </div>

      {job.status !== JobStatus.PENDING_APPROVAL && (
        <InventoryPanel
          role="office"
          inventory={job.inventory}
          updateItem={(itemId, updates) =>
            MoveMastersAPI
              .updateInventoryItem(job.id, itemId, updates)
              .then(setJob)
          }
        />
      )}

      {/* PAYMENT GATE #1 - PICKUP PAYMENT */}
      {job.status === JobStatus.AWAITING_SIGNATURE && job.clientSigned && (
        <>
          <PaymentGate
            job={job}
            setJob={setJob}
            paymentType="pickup"
            label="Pickup Payment"
            onPaymentComplete={null}
          />

          {job.payments?.pickup?.paid && (
            <button
              onClick={() =>
                MoveMastersAPI.authorizeLoading(job.id).then(setJob)
              }
            >
              ✓ Authorize Loading
            </button>
          )}
        </>
      )}

      {job.status === JobStatus.AWAITING_DISPATCH && (
        <>
          <button
            onClick={() =>
              MoveMastersAPI.routeToWarehouse(job.id).then(setJob)
            }
          >
            🏢 Route to Warehouse
          </button>

          <button
            onClick={() =>
              MoveMastersAPI.routeToDelivery(job.id).then(setJob)
            }
          >
            🚚 Route to Direct Delivery
          </button>
        </>
      )}

      {job.status === JobStatus.AWAITING_WAREHOUSE_DISPATCH && (
        <button
          onClick={() =>
            MoveMastersAPI.dispatchFromWarehouse(job.id).then(setJob)
          }
        >
          📤 Dispatch Load From Warehouse
        </button>
      )}

      {/* PAYMENT GATE #3 - DELIVERY PAYMENT */}
      {job.status === JobStatus.PAYMENT_PENDING && (
        <>
          <PaymentGate
            job={job}
            setJob={setJob}
            paymentType="delivery"
            label="Delivery Payment"
            onPaymentComplete={async () => {
              await MoveMastersAPI.confirmPayment(job.id);
              const updatedJob = await MoveMastersAPI.getJob(job.id);
              setJob(updatedJob);
            }}
          />
        </>
      )}

      {job.billing.pricingBreakdown && (
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
            <strong>Subtotal:</strong>{' '}
            ${job.billing.pricingBreakdown.subtotal.toLocaleString()}
          </p>

          <p>
            <strong>Final Total:</strong>{' '}
            ${job.billing.pricingBreakdown.finalTotal.toLocaleString()}
          </p>
        </div>
      )}

      <JobCommunications
        job={job}
        role="office"
        onSend={text =>
          MoveMastersAPI.addJobMessage(job.id, {
            fromRole: 'office',
            toRole: 'driver',
            text
          }).then(setJob)
        }
      />
    </>
  )}

  {/* ================= WAREHOUSE ================= */}
  {role === 'warehouse' && (
    <>
      {job.status === JobStatus.IN_WAREHOUSE && (
        <button 
          onClick={() =>
            MoveMastersAPI.warehouseInbound(job.id, {
              facilityId: 'WH-22',
              vaultId: 'VAULT-7',
              intakePhotos: ['intake.jpg'],
              by: 'warehouse'
            }).then(setJob)
          }
        >
          ✓ Confirm Inbound Intake
        </button>
      )}

      <InventoryPanel
        role="warehouse"
        inventory={job.inventory}
      />

      {job.status === JobStatus.AWAITING_OUTTAKE && (
        <button 
          onClick={() =>
            MoveMastersAPI.warehouseOutbound(job.id, {
              outtakePhotos: ['outtake.jpg'],
              by: 'warehouse'
            }).then(setJob)
          }
        >
          📤 Release Load to Driver
        </button>
      )}

      <JobCommunications
        job={job}
        role="warehouse"
        onSend={text =>
          MoveMastersAPI.addJobMessage(job.id, {
            fromRole: 'warehouse',
            toRole: 'office',
            text
          }).then(setJob)
        }
      />
    </>
  )}

  {/* ================= CLIENT ================= */}
  {role === 'client' && (
    <>
      {job.status === JobStatus.AWAITING_SIGNATURE && !job.clientSigned && (
        <>
          <InventoryPanel
            role="client"
            inventory={job.inventory}
          />
          
          <SignaturePad
            label="Client Signature - Accept Price & Authorize Move"
            onSign={async () => {
              await MoveMastersAPI.signByClient(job.id);
              const updatedJob = await MoveMastersAPI.getJob(job.id);
              setJob(updatedJob);
            }}
            buttonText="Sign & Accept"
          />
        </>
      )}

      {job.status !== JobStatus.AWAITING_SIGNATURE && (
        <InventoryPanel
          role="client"
          inventory={job.inventory}
        />
      )}

      {job.status === JobStatus.OUT_FOR_DELIVERY && (
        <button 
          onClick={() =>
            MoveMastersAPI.arriveAtDestination(job.id).then(setJob)
          }
        >
          ✓ Confirm Truck Arrived
        </button>
      )}

      {job.status === JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION && (
        <SignaturePad
          label="Client Signature - Confirm Delivery Complete"
          onSign={async () => {
            await MoveMastersAPI.confirmDeliveryByClient(job.id);
            const updatedJob = await MoveMastersAPI.getJob(job.id);
            setJob(updatedJob);
          }}
          buttonText="Sign Delivery Complete"
        />
      )}

      {job.status === JobStatus.COMPLETED && (
        <div style={{
          padding: 20,
          backgroundColor: '#f0fdf4',
          border: '3px solid #22c55e',
          borderRadius: 8,
          textAlign: 'center',
          marginTop: 20
        }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#15803d' }}>✓ Move Complete</h2>
          <p style={{ margin: 0, color: '#64748b' }}>
            Thank you for your business!
          </p>
        </div>
      )}

      <JobCommunications
        job={job}
        role="client"
        onSend={text =>
          MoveMastersAPI.addJobMessage(job.id, {
            fromRole: 'client',
            toRole: 'office',
            text
          }).then(setJob)
        }
      />
    </>
  )}
</div>
```

);
}
