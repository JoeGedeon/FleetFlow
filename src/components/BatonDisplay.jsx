import { JobStatus } from '../shared/jobSchema';

// Maps each workflow status to the role that holds the baton (must act next)
const BATON_MAP = {
  [JobStatus.SURVEY]:                                 'driver',
  [JobStatus.PENDING_APPROVAL]:                       'office',
  [JobStatus.AWAITING_SIGNATURE]:                     'client',
  [JobStatus.LOADING]:                                'driver',
  [JobStatus.AWAITING_DISPATCH]:                      'office',
  [JobStatus.EN_ROUTE_TO_WAREHOUSE]:                  'driver',
  [JobStatus.IN_WAREHOUSE]:                           'warehouse',
  [JobStatus.AWAITING_WAREHOUSE_DISPATCH]:            'office',
  [JobStatus.AWAITING_OUTTAKE]:                       'warehouse',
  [JobStatus.OUT_FOR_DELIVERY]:                       'driver',
  [JobStatus.PAYMENT_PENDING]:                        'office',
  [JobStatus.DELIVERY_AWAITING_CLIENT_CONFIRMATION]:  'client',
  [JobStatus.DELIVERY_AWAITING_DRIVER_EVIDENCE]:      'driver',
};

export default function BatonDisplay({ currentStatus, role }) {
  const activeRole = BATON_MAP[currentStatus] || null;
  const isMyTurn = activeRole === role;

  return (
    <div className={`p-4 mb-5 border-2 rounded-xl transition-all ${
      isMyTurn ? 'border-green-500 bg-green-50 shadow-md' : 'border-stone-200 bg-white opacity-80'
    }`}>
      <div className="flex justify-between items-center">
        <div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${
            isMyTurn ? 'text-green-600' : 'text-stone-400'
          }`}>
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
