import './styles/app.css';
import { useEffect, useState } from 'react';
import { MoveMastersAPI } from './api/moveMastersApi';
import { JobStatus } from './shared/jobSchema';
import DriverEarningsPanel from './components/DriverEarningsPanel';
import InventoryPanel from './components/InventoryPanel';
import PricingSummary from './components/PricingSummary';
import PaymentGate from './components/PaymentGate';
import SignaturePad from './components/SignaturePad';
import JobCommunications from './components/JobCommunications';

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
  const getActiveRole = (status) => {
    switch (status) {
      case JobStatus.SURVEY: return 'driver';
      case JobStatus.PENDING_APPROVAL: return 'office';
      case JobStatus.AWAITING_SIGNATURE: return 'client';
      case JobStatus.LOADING: return 'driver';
      case JobStatus.AWAITING_DISPATCH: return 'office';
      case JobStatus.EN_ROUTE_TO_WAREHOUSE: return 'driver';
      case JobStatus.IN_WAREHOUSE: return 'warehouse';
      case JobStatus.AWAITING_WAREHOUSE_DISPATCH: return 'office';
      case JobStatus.AWAITING_OUTTAKE: return 'warehouse';
      case JobStatus.OUT_FOR_DELIVERY: return 'driver';
      case JobStatus.PAYMENT_PENDING: return 'office';
      case JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION: return 'client';
      case JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE: return 'driver';
      case JobStatus.COMPLETED: return null;
      default: return null;
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
      backgroundColor: isMyTurn ? '#f0fdf4' : '#f8fafc'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: isMyTurn ? '#15803d' : '#475569' }}>
            {isMyTurn ? '🏃 YOUR TURN' : '⏳ Waiting'}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b' }}>
            {currentStatus.replace(/_/g, ' ')}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Current Actor</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' }}>
            {activeRole || 'COMPLETED'}
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
          <span className="label">{status.replace(/_/g, ' ')}</span>
        </div>
      ))}
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
        alert('Failed to load job');
      } finally {
        setLoading(false);
      }
    };
    
    loadJob();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 10 }}>🚚</div>
        <div>Loading Fleet Flow...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 10, color: '#ef4444' }}>⚠️</div>
        <div>Failed to load job</div>
      </div>
    );
  }

  const helper = job.labor.find(w => w.role === 'helper');

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1>FleetFLOW</h1>
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          borderRadius: 6,
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontSize: 14
        }}>
          {role}
        </div>
      </div>

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
      <ProgressTracker currentStatus={job.status} />

      {/* Role-specific sections */}
      {role === 'driver' && (
        <>
          <InventoryPanel role="driver" inventory={job.inventory} canEdit={true} addItem={item => {
            MoveMastersAPI.addInventoryItem(job.id, item)
              .then(() => MoveMastersAPI.updateInventoryTotals(job.id))
              .then(setJob);
          }} />
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

      {role === 'helper' && (
        <>
          <p><strong>Your Pay:</strong> ${helper?.payout || 0}</p>
          <InventoryPanel role="helper" inventory={job.inventory} canEdit={false} />
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

      {role === 'office' && (
        <>
          <InventoryPanel role="office" inventory={job.inventory} updateItem={(itemId, updates) =>
            MoveMastersAPI.updateInventoryItem(job.id, itemId, updates).then(setJob)
          } />
          <PricingSummary job={job} role={role} />
          <PaymentGate job={job} setJob={setJob} paymentType="pickup" label="Pickup Payment" />
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

      {role === 'warehouse' && (
        <>
          <InventoryPanel role="warehouse" inventory={job.inventory} />
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

      {role === 'client' && (
        <>
          <InventoryPanel role="client" inventory={job.inventory} />
          <SignaturePad label="Client Signature" onSign={async () => {}} />
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
  );
}
