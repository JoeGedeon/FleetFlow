import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import InventoryPanel from './components/InventoryPanel';
import DriverEarningsPanel from './components/DriverEarningsPanel';
import { MoveMastersAPI } from './api/moveMastersApi';
import { auth } from './firebase';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from 'firebase/auth';

/* ==========================================================================
 SCHEMAS & STATUS FLOW
========================================================================== */

const JobStatus = {
  SURVEY: 'SURVEY',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  AWAITING_SIGNATURE: 'AWAITING_SIGNATURE',
  LOADING: 'LOADING',
  AWAITING_DISPATCH: 'AWAITING_DISPATCH',
  EN_ROUTE_TO_WAREHOUSE: 'EN_ROUTE_TO_WAREHOUSE',
  IN_WAREHOUSE: 'IN_WAREHOUSE',
  AWAITING_WAREHOUSE_DISPATCH: 'AWAITING_WAREHOUSE_DISPATCH',
  AWAITING_OUTTAKE: 'AWAITING_OUTTAKE',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  DELIVERY_AWAITING_CLIENT_CONFIRMATION: 'DELIVERY_AWAITING_CLIENT_CONFIRMATION',
  DELIVERY_AWAITING_DRIVER_EVIDENCE: 'DELIVERY_AWAITING_DRIVER_EVIDENCE',
  COMPLETED: 'COMPLETED'
};

const STATUS_FLOW = [
  JobStatus.SURVEY, JobStatus.PENDING_APPROVAL, JobStatus.AWAITING_SIGNATURE,
  JobStatus.LOADING, JobStatus.AWAITING_DISPATCH, JobStatus.EN_ROUTE_TO_WAREHOUSE,
  JobStatus.IN_WAREHOUSE, JobStatus.AWAITING_WAREHOUSE_DISPATCH,
  JobStatus.AWAITING_OUTTAKE, JobStatus.OUT_FOR_DELIVERY, JobStatus.PAYMENT_PENDING,
  JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION,
  JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE, JobStatus.COMPLETED
];

/* ==========================================================================
 AUTH SIGN-IN MODAL
========================================================================== */

function SignInModal({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the rest
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/ \(auth.*\)/, ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-900 mx-auto mb-4 text-xl">F</div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic text-white">FleetFLOW</h1>
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mt-1">Field Operations</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="driver@movemasteros.local"
              required
              className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          {error && (
            <div className="text-red-400 text-xs font-bold bg-red-950 border border-red-900 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase tracking-widest italic hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-900 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ==========================================================================
 SUB-COMPONENTS
========================================================================== */

const PricingSummary = ({ job }) => {
  const displayTotal = job?.billing?.pricingBreakdown?.finalTotal ?? job?.billing?.approvedTotal ?? 0;
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Estimated Total</span>
        <span className="text-xl font-black text-stone-900">${displayTotal.toLocaleString()}</span>
      </div>
      <div className="text-[10px] text-stone-400 font-bold uppercase italic">
        Protocol: Institutional Governance // v.2026
      </div>
    </div>
  );
};

/* ==========================================================================
 BATON & PROGRESS COMPONENTS
========================================================================== */

function BatonDisplay({ currentStatus, role }) {
  const getActiveRole = (status) => {
    switch (status) {
      case JobStatus.SURVEY:                               return 'driver';
      case JobStatus.PENDING_APPROVAL:                    return 'office';
      case JobStatus.AWAITING_SIGNATURE:                  return 'client';
      case JobStatus.LOADING:                             return 'driver';
      case JobStatus.AWAITING_DISPATCH:                   return 'office';
      case JobStatus.EN_ROUTE_TO_WAREHOUSE:               return 'driver';
      case JobStatus.IN_WAREHOUSE:                        return 'warehouse';
      case JobStatus.AWAITING_WAREHOUSE_DISPATCH:         return 'office';
      case JobStatus.AWAITING_OUTTAKE:                    return 'warehouse';
      case JobStatus.OUT_FOR_DELIVERY:                    return 'driver';
      case JobStatus.PAYMENT_PENDING:                     return 'office';
      case JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION: return 'client';
      case JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE:   return 'driver';
      default: return null;
    }
  };
  const activeRole = getActiveRole(currentStatus);
  const isMyTurn = activeRole === role;
  return (
    <div className={`p-4 mb-5 border-2 rounded-xl transition-all ${isMyTurn ? 'border-green-500 bg-green-50 shadow-md' : 'border-stone-200 bg-white opacity-80'}`}>
      <div className="flex justify-between items-center">
        <div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${isMyTurn ? 'text-green-600' : 'text-stone-400'}`}>
            {isMyTurn ? '● Action Required' : '○ Status: Pending'}
          </span>
          <h3 className="m-0 mt-1 text-stone-900 font-bold text-lg leading-tight uppercase italic">
            {currentStatus?.replace(/_/g, ' ') || ''}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-stone-400 font-bold uppercase tracking-widest mb-1">Active Actor</div>
          <div className="text-sm font-black text-stone-800 uppercase italic">
            {activeRole || 'COMPLETED'}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressTracker({ currentStatus }) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  return (
    <div className="flex justify-between items-center gap-1 mb-8 overflow-hidden px-1">
      {STATUS_FLOW.map((status, index) => (
        <div
          key={status}
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${index <= currentIndex ? 'bg-blue-600' : 'bg-stone-200'}`}
        />
      ))}
    </div>
  );
}

/* ==========================================================================
 MAIN APP COMPONENT
========================================================================== */

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading auth state
  const [job, setJob] = useState(null);
  const [role, setRole] = useState('driver');
  const [jobLoading, setJobLoading] = useState(true);

  // Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser); // null = not signed in, object = signed in
    });
    return () => unsubscribeAuth();
  }, []);

  // Load job when authenticated
  useEffect(() => {
    if (!user) return;

    const loadJob = async () => {
      try {
        setJobLoading(true);
        const jobData = await MoveMastersAPI.getJob('FLEETFLOW-001');
        setJob(jobData);
      } catch (error) {
        console.error('Error loading job:', error);
      } finally {
        setJobLoading(false);
      }
    };
    loadJob();

    // Subscribe to real-time updates
    const unsubscribeJob = MoveMastersAPI.subscribeToJob('FLEETFLOW-001', (updatedJob) => {
      setJob(updatedJob);
    });
    return () => { if (unsubscribeJob) unsubscribeJob(); };
  }, [user]);

  // Auth loading
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-8 text-stone-400 font-mono italic">
        <div className="animate-spin text-4xl mb-4">🚚</div>
        <div className="text-xs font-black uppercase tracking-widest">Loading...</div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <SignInModal />;
  }

  // Signed in but job loading
  if (jobLoading || !job) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-8 text-stone-400 font-mono italic">
        <div className="animate-spin text-4xl mb-4">🚚</div>
        <div className="text-xs font-black uppercase tracking-widest">Connecting to Fleet...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-blue-100 p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-200">F</div>
            <h1 className="m-0 text-xl font-black uppercase tracking-tighter italic text-stone-900">FleetFLOW</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic">
              Mode: {role}
            </div>
            <button
              onClick={() => signOut(auth)}
              className="text-[10px] font-black text-stone-400 uppercase tracking-widest hover:text-red-500 transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

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

        <BatonDisplay currentStatus={job.status} role={role} />
        <ProgressTracker currentStatus={job.status} />
        <PricingSummary job={job} />

        <main className="mt-8">
          {role === 'driver' && (
            <div className="space-y-6">
              {job.status === JobStatus.SURVEY && (
                <div className="space-y-4">
                  <InventoryPanel role="driver" inventory={job.inventory || []} canEdit={true} />
                  <button
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest italic hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-100"
                    onClick={() => MoveMastersAPI.submitFieldUpdate(job.id, { cfDelta: 120 }).then(data => setJob(prev => ({...prev, status: data.status})))}
                  >
                    📸 Submit Survey to Office
                  </button>
                </div>
              )}
              <DriverEarningsPanel job={job} />
            </div>
          )}
          {role === 'office' && (
            <div className="space-y-6">
              {job.status === JobStatus.PENDING_APPROVAL && (
                <div className="p-6 bg-white border border-stone-200 rounded-xl text-center">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Final Margin Audit Required</p>
                  <button
                    className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase tracking-widest italic hover:bg-green-700 shadow-xl shadow-green-100 transition-all"
                    onClick={() => MoveMastersAPI.approvePricing(job.id).then(data => setJob(prev => ({...prev, status: data.status})))}
                  >
                    ✓ Approve & Send to Client
                  </button>
                </div>
              )}
              <InventoryPanel role="office" inventory={job.inventory || []} />
            </div>
          )}
          {!['driver', 'office'].includes(role) && (
            <div className="text-center py-12 text-stone-300 font-black uppercase tracking-widest italic text-xs">
              Waiting for Actor Input
            </div>
          )}
        </main>

        <footer className="mt-20 border-t border-stone-200 pt-8 flex justify-between items-center opacity-40 grayscale">
          <div className="text-[10px] font-black uppercase tracking-[0.3em]">JPG Systems</div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em]">Fleet Flow v2.0</div>
        </footer>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
