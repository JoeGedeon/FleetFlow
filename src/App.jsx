import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, Camera, CheckCircle2, Lock, ArrowRight, Box, AlertTriangle,
  Receipt, TrendingUp, Warehouse, MessageSquare, CreditCard,
  History, BarChart3, Scale, ShieldAlert, Star
} from 'lucide-react';

const App = () => {
  const [activeRole, setActiveRole] = useState('driver');
  const [status, setStatus] = useState('survey');
  const [driverTab, setDriverTab] = useState('witness');
  const [isSignedAtOrigin, setIsSignedAtOrigin] = useState(false);
  const [paymentRenderedAtDest, setPaymentRenderedAtDest] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const phoneEstimate = { cf: 430, grandTotal: 3420.52 };

  const [contract, setContract] = useState({
    billing: {
      cfBase: 430, cfBaseRate: 3,
      cfAdd: 0, cfAddRate: 3,
      packing: 225,
      stairs: 0, stairsRate: 75,
      longCarry: 0, longCarryRate: 50,
      bulky: 0, bulkyRate: 150,
      fuelPct: 12,
      discountPct: 20,
      bindingFee: 1002.42,
      assetIntegrityFee: 150
    },
    inventory: [
      { id: 1, item: 'King Mattress', originPhotos: [], deliveryPhotos: [] },
      { id: 2, item: 'Large Sectional', originPhotos: [], deliveryPhotos: [] }
    ],
    receipts: [],
    messages: [{ role: 'office', text: 'Awaiting site survey', time: '09:00' }],
    review: { rating: 0, comment: '' }
  });

  const totals = useMemo(() => {
    const b = contract.billing;
    const currentCF = b.cfBase + b.cfAdd;
    const cfTotal = (b.cfBase * b.cfBaseRate) + (b.cfAdd * b.cfAddRate);
    const accessorials =
      (b.stairs * b.stairsRate) +
      (b.longCarry * b.longCarryRate) +
      (b.bulky * b.bulkyRate);

    const sub = cfTotal + accessorials + b.packing;
    const discount = sub * (b.discountPct / 100);
    const fuel = (sub - discount) * (b.fuelPct / 100);
    const grandTotal = sub - discount + fuel + b.bindingFee + b.assetIntegrityFee;

    const gain = Math.max(0, grandTotal - phoneEstimate.grandTotal - b.assetIntegrityFee);
    const overageCF = Math.max(0, currentCF - phoneEstimate.cf);

    return {
      subtotal: sub,
      grandTotal,
      balance: grandTotal - 672.55 - 1803.55,
      gain,
      overageCF,
      techFeeRev: b.assetIntegrityFee
    };
  }, [contract]);

  const updateBilling = (field, val) => {
    setContract(prev => ({
      ...prev,
      billing: { ...prev.billing, [field]: Math.max(0, Number(val)) }
    }));
  };

  const addPhoto = (itemId, type = 'originPhotos') => {
    const photo = { id: Date.now() };
    setContract(prev => ({
      ...prev,
      inventory: prev.inventory.map(i =>
        i.id === itemId
          ? { ...i, [type]: [...i[type], photo] }
          : i
      )
    }));
  };

  const MessagingHub = ({ role }) => (
    <div className="bg-zinc-900 p-4 rounded-xl h-full">
      <div className="text-xs text-zinc-400 mb-2">Dispatch</div>
      {contract.messages.map((m, i) => (
        <div key={i} className="text-xs mb-1">
          <strong>{m.role}:</strong> {m.text}
        </div>
      ))}
    </div>
  );

  const DriverView = () => (
    <div className="p-6 space-y-6">
      {status === 'survey' && (
        <>
          <h2 className="text-xl font-bold">Survey</h2>
          {['cfBase', 'cfAdd'].map(f => (
            <div key={f} className="flex gap-4 items-center">
              <span>{f}</span>
              <button onClick={() => updateBilling(f, contract.billing[f] - 10)}>-</button>
              <span>{contract.billing[f]}</span>
              <button onClick={() => updateBilling(f, contract.billing[f] + 10)}>+</button>
            </div>
          ))}
          <button onClick={() => setStatus('loading')}>Finalize Survey</button>
        </>
      )}

      {status === 'loading' && (
        !isSignedAtOrigin ? (
          <div>
            <Lock />
            <p>Awaiting client authorization</p>
          </div>
        ) : (
          <button onClick={() => setStatus('transit')}>Begin Transit</button>
        )
      )}

      {status === 'unloading' && (
        <div>
          {contract.inventory.map(item => (
            <div key={item.id}>
              {item.item}
              <button onClick={() => addPhoto(item.id, 'deliveryPhotos')}>
                <Camera />
              </button>
            </div>
          ))}
          <button onClick={() => setStatus('completed')}>Complete Job</button>
        </div>
      )}
    </div>
  );

  const OfficeView = () => (
    <div className="p-6 space-y-6">
      <h2>Office</h2>
      <div>Gain: ${totals.gain.toFixed(2)}</div>
      <div>Total: ${totals.grandTotal.toFixed(2)}</div>
      {status === 'delivery_gate' && (
        <button onClick={() => setPaymentRenderedAtDest(true)}>
          Verify Payment
        </button>
      )}
    </div>
  );

  const ClientView = () => (
    <div className="p-6 space-y-6">
      <h2>Status: {status}</h2>
      {status === 'loading' && !isSignedAtOrigin && (
        <button onClick={() => setIsSignedAtOrigin(true)}>
          Authorize Loading
        </button>
      )}
      {status === 'completed' && !reviewSubmitted && (
        <>
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() =>
              setContract(prev => ({ ...prev, review: { ...prev.review, rating: s }}))
            }>
              <Star />
            </button>
          ))}
          <button onClick={() => setReviewSubmitted(true)}>Submit Review</button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="p-4 flex gap-2">
        {['office', 'driver', 'client'].map(r => (
          <button key={r} onClick={() => setActiveRole(r)}>
            {r}
          </button>
        ))}
      </header>

      <main>
        {activeRole === 'driver' && <DriverView />}
        {activeRole === 'office' && <OfficeView />}
        {activeRole === 'client' && <ClientView />}
      </main>
    </div>
  );
};

export default App;
