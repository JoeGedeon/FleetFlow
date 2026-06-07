import './styles/app.css';
import { useEffect, useState } from 'react';
import { MoveMastersAPI } from './api/moveMastersApi';
import { JobStatus } from './shared/jobSchema';
import BatonDisplay from './components/BatonDisplay';
import ProgressTracker from './components/ProgressTracker';
import PricingSummary from './components/PricingSummary';
import DriverEarningsPanel from './components/DriverEarningsPanel';
import InventoryPanel from './components/InventoryPanel';

/* ================= JOB COMMUNICATIONS ================= */

function JobCommunications({ job, role, onSend }) {
  const [text, setText] = useState('');

  const visibleMessages = (job.communications || []).filter(
    msg => msg.fromRole === role || msg.toRole === role || role === 'office'
  );

  return (
    <div className="job-comm">
      <h4>Job Communications</h4>
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
        onClick={() => { onSend(text); setText(''); }}
      >
        Send Message
      </button>
    </div>
  );
}

/* ================= MAIN APP ================= */

export default function App() {
  const [job, setJob] = useState(null);
  const [role, setRole] = useState('driver');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJob = async () => {
      try {
        setLoading(true);
        const jobData = await MoveMastersAPI.getJob('FLEETFLOW-001');
        setJob(jobData);
      } catch (error) {
        console.error('Error loading job:', error);
      } finally {
        setLoading(false);
      }
    };
    loadJob();

    // Real-time Firestore subscription — keeps all role views in sync
    const unsubscribe = MoveMastersAPI.subscribeToJob('FLEETFLOW-001', updatedJob => {
      setJob(updatedJob);
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  if (loading || !job) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-8 text-stone-400 font-mono italic">
        <div className="animate-spin text-4xl mb-4">🚚</div>
        <div className="text-xs font-black uppercase tracking-widest">Connecting to Fleet...</div>
      </div>
    );
  }

  const helper = job.labor?.find(w => w.role === 'helper');

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-blue-100 p-4 md:p-8">
      <div className="max-w-xl mx-auto">

        {/* HEADER */}
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-200">F</div>
            <h1 className="m-0 text-xl font-black uppercase tracking-tighter italic text-stone-900">FleetFLOW</h1>
          </div>
          <div className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic">
            Mode: {role}
          </div>
        </header>

        {/* ROLE SWITCHER */}
        <div className="flex gap-1.5 mb-8 overflow-x-auto pb-2 no-scrollbar">
          {['driver', 'helper', 'office', 'warehouse', 'client'].map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                role === r
                  ? 'bg-stone-900 text-white shadow-lg scale-105'
                  : 'bg-white text-stone-400 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* BATON, PROGRESS & PRICING */}
        <BatonDisplay currentStatus={job.status} role={role} />
        <ProgressTracker currentStatus={job.status} />
        <PricingSummary job={job} role={role} />

        <main className="mt-6 space-y-4">

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
                      MoveMastersAPI.addInventoryItem(job.id, item)
                        .then(() => MoveMastersAPI.updateInventoryTotals(job.id))
                        .then(setJob)
                    }
                  />
                  <button
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest italic hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-100"
                    onClick={() =>
                      MoveMastersAPI.submitFieldUpdate(job.id, { cfDelta: 120 }).then(setJob)
                    }
                  >
                    📸 Submit Survey to Office
                  </button>
                </>
              )}

              {job.status !== JobStatus.SURVEY && (
                <InventoryPanel role="driver" inventory={job.inventory} canEdit={false} />
              )}

              {job.status === JobStatus.LOADING && (
                <>
                  <div className="auth-box">✔ LOAD AUTHORIZED</div>
                  <button
                    onClick={() =>
                      MoveMastersAPI.submitLoadingEvidence(job.id, {
                        loadedTruckPhotos: ['loaded.jpg'],
                        emptyOriginPhotos: ['empty.jpg']
                      }).then(setJob)
                    }
                  >
                    Submit Load Complete
                  </button>
                </>
              )}

              {job.status === JobStatus.EN_ROUTE_TO_WAREHOUSE && (
                <button onClick={() => MoveMastersAPI.driverArrivesAtWarehouse(job.id).then(setJob)}>
                  Arrived at Warehouse
                </button>
              )}

              {job.status === JobStatus.OUT_FOR_DELIVERY && (
                <button onClick={() => MoveMastersAPI.arriveAtDestination(job.id).then(setJob)}>
                  Truck Arrived
                </button>
              )}

              {job.status === JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE && (
                <>
                  <div className="auth-box">📸 DELIVERY IN PROGRESS</div>
                  <button
                    onClick={() =>
                      MoveMastersAPI.submitDeliveryEvidence(job.id, {
                        inPlacePhotos: ['placed.jpg'],
                        assembledPhotos: ['assembled.jpg'],
                        emptyTruckPhotos: ['empty_truck.jpg']
                      }).then(setJob)
                    }
                  >
                    Submit Delivery Evidence
                  </button>
                  <button onClick={() => MoveMastersAPI.signOffByDriver(job.id).then(setJob)}>
                    Driver Sign & Close
                  </button>
                </>
              )}

              <DriverEarningsPanel job={job} />
              <JobCommunications
                job={job}
                role="driver"
                onSend={text =>
                  MoveMastersAPI.addJobMessage(job.id, { fromRole: 'driver', toRole: 'office', text }).then(setJob)
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
              <JobCommunications
                job={job}
                role="helper"
                onSend={text =>
                  MoveMastersAPI.addJobMessage(job.id, { fromRole: 'helper', toRole: 'office', text }).then(setJob)
                }
              />
            </>
          )}

          {/* ================= OFFICE ================= */}
          {role === 'office' && (
            <>
              {job.status === JobStatus.PENDING_APPROVAL && (
                <div className="p-6 bg-white border border-stone-200 rounded-xl text-center">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Final Margin Audit Required</p>
                  <button
                    className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase tracking-widest italic hover:bg-green-700 shadow-xl shadow-green-100 transition-all"
                    onClick={() =>
                      MoveMastersAPI.updateInventoryTotals(job.id)
                        .then(() => MoveMastersAPI.approvePricing(job.id))
                        .then(setJob)
                    }
                  >
                    ✓ Approve & Send to Client
                  </button>
                </div>
              )}

              <div className="panel">
                <h3>Current Pricing</h3>
                <p>
                  <strong>Estimated Total:</strong>{' '}
                  {job.billing.approvedTotal !== null
                    ? `$${job.billing.approvedTotal.toLocaleString()}`
                    : 'Calculating…'}
                </p>
                {job.inventoryTotals?.estimatedCubicFeet !== job.inventoryTotals?.finalCubicFeet && (
                  <p><em>Price reflects revised inventory</em></p>
                )}
              </div>

              <InventoryPanel
                role="office"
                inventory={job.inventory}
                updateItem={(itemId, updates) =>
                  MoveMastersAPI.updateInventoryItem(job.id, itemId, updates).then(setJob)
                }
              />

              {job.status === JobStatus.AWAITING_SIGNATURE && job.clientSigned && (
                <button onClick={() => MoveMastersAPI.authorizeLoading(job.id).then(setJob)}>
                  Authorize Loading
                </button>
              )}

              {job.status === JobStatus.AWAITING_DISPATCH && (
                <>
                  <button onClick={() => MoveMastersAPI.routeToWarehouse(job.id).then(setJob)}>
                    Route to Warehouse
                  </button>
                  <button onClick={() => MoveMastersAPI.routeToDelivery(job.id).then(setJob)}>
                    Route to Direct Delivery
                  </button>
                </>
              )}

              {job.status === JobStatus.AWAITING_WAREHOUSE_DISPATCH && (
                <button onClick={() => MoveMastersAPI.dispatchFromWarehouse(job.id).then(setJob)}>
                  Dispatch Load From Warehouse
                </button>
              )}

              {job.status === JobStatus.PAYMENT_PENDING && (
                <button onClick={() => MoveMastersAPI.confirmPayment(job.id).then(setJob)}>
                  Confirm Payment
                </button>
              )}

              {job.billing.pricingBreakdown && (
                <div className="panel">
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
                          <li key={idx}>{a.type.replace('_', ' ')} — ${a.amount.toLocaleString()}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <p><strong>Subtotal:</strong> ${job.billing.pricingBreakdown.subtotal.toLocaleString()}</p>
                  <p><strong>Final Total:</strong> ${job.billing.pricingBreakdown.finalTotal.toLocaleString()}</p>
                </div>
              )}

              <JobCommunications
                job={job}
                role="office"
                onSend={text =>
                  MoveMastersAPI.addJobMessage(job.id, { fromRole: 'office', toRole: 'driver', text }).then(setJob)
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
                  Confirm Inbound Intake
                </button>
              )}
              <InventoryPanel role="warehouse" inventory={job.inventory} />
              {job.status === JobStatus.AWAITING_OUTTAKE && (
                <button
                  onClick={() =>
                    MoveMastersAPI.warehouseOutbound(job.id, {
                      outtakePhotos: ['outtake.jpg'],
                      by: 'warehouse'
                    }).then(setJob)
                  }
                >
                  Release Load to Driver
                </button>
              )}
              <JobCommunications
                job={job}
                role="warehouse"
                onSend={text =>
                  MoveMastersAPI.addJobMessage(job.id, { fromRole: 'warehouse', toRole: 'office', text }).then(setJob)
                }
              />
            </>
          )}

          {/* ================= CLIENT ================= */}
          {role === 'client' && (
            <>
              {job.status === JobStatus.AWAITING_SIGNATURE && !job.clientSigned && (
                <button onClick={() => MoveMastersAPI.signByClient(job.id).then(setJob)}>
                  Sign & Accept Price
                </button>
              )}
              <InventoryPanel role="client" inventory={job.inventory} />
              {job.status === JobStatus.OUT_FOR_DELIVERY && (
                <button onClick={() => MoveMastersAPI.arriveAtDestination(job.id).then(setJob)}>
                  Truck Arrived
                </button>
              )}
              {job.status === JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION && (
                <button onClick={() => MoveMastersAPI.confirmDeliveryByClient(job.id).then(setJob)}>
                  Sign Delivery Completion
                </button>
              )}
              {job.status === JobStatus.COMPLETED && (
                <p>Move complete. Thank you.</p>
              )}
              <JobCommunications
                job={job}
                role="client"
                onSend={text =>
                  MoveMastersAPI.addJobMessage(job.id, { fromRole: 'client', toRole: 'office', text }).then(setJob)
                }
              />
            </>
          )}

        </main>

        <footer className="mt-20 border-t border-stone-200 pt-8 flex justify-between items-center opacity-40 grayscale">
          <div className="text-[10px] font-black uppercase tracking-[0.3em]">JPG Systems</div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em]">FleetFlow v2.0</div>
        </footer>
      </div>
    </div>
  );
}
