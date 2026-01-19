import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, Truck, User, Building2, Camera, CheckCircle2, Lock, DollarSign, 
  ClipboardList, ArrowRight, Zap, Box, AlertTriangle, Receipt, 
  Image as ImageIcon, Plus, Package, Info, ChevronRight, Check, X, 
  TrendingUp, Warehouse, MessageSquare, Send, MapPin, Navigation,
  CreditCard, ClipboardCheck, History, BarChart3, Scale, PieChart, 
  Fingerprint, FileCheck, ShieldAlert, Coins, Wallet, Star, ThumbsUp, Edit2, 
  Video, Mic, StopCircle
} from 'lucide-react';

const App = () => {
  // ROLE & STATUS CONTROL
  const [activeRole, setActiveRole] = useState('driver'); 
  const [status, setStatus] = useState('survey'); // survey, loading, transit, storage, delivery_gate, unloading, completed
  const [driverTab, setDriverTab] = useState('witness'); 
  const [officeTab, setOfficeTab] = useState('profit'); 
  
  // LOGIC FLAGS
  const [isSignedAtOrigin, setIsSignedAtOrigin] = useState(false);
  const [paymentRenderedAtDest, setPaymentRenderedAtDest] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isRecordingWalkthrough, setIsRecordingWalkthrough] = useState(false);

  // ORIGINAL ESTIMATE BASELINE
  const phoneEstimate = {
    cf: 430,
    grandTotal: 3420.52
  };

  // CORE DATA STATE
  const [contract, setContract] = useState({
    details: { name: 'Andrea Hill', order: 'GFM-1402', date: '2024-10-24' },
    logistics: {
      currentStatus: 'Surveying',
      carrierType: 'Company Driver',
      carrierId: 'TRUCK-44',
      storageFacility: '',
      storageBin: '',
      location: 'Origin Address'
    },
    billing: {
      cfBase: 430, cfBaseRate: 3.00,
      cfAdd: 0,    cfAddRate: 3.00,
      packing: 225.00,
      stairs: 0,   stairsRate: 75.00,
      longCarry: 0, longCarryRate: 50.00,
      bulky: 0,    bulkyRate: 150.00,
      fuelPct: 12, discountPct: 20, bindingFee: 1002.42,
      assetIntegrityFee: 150.00
    },
    inventory: [
      { id: 1, item: 'King Mattress', qty: 1, originPhotos: [], deliveryPhotos: [], condition: 'Good' },
      { id: 2, item: 'Large Sectional', qty: 1, originPhotos: [], deliveryPhotos: [], condition: 'Good' },
      { id: 3, item: 'Dining Set', qty: 1, originPhotos: [], deliveryPhotos: [], condition: 'Good' }
    ],
    receipts: [],
    clientCompliancePhotos: [],
    messages: [{ role: 'office', text: 'Order GFM-1402 Live. Awaiting Site Survey.', time: '09:00' }],
    review: { rating: 0, comment: '', verified: false }
  });

  // --- COMPREHENSIVE MATH ENGINE (REVENUE + COMMISSION) ---
  const totals = useMemo(() => {
    try {
      const b = contract.billing || {};
      const currentCF = Number(b.cfBase || 0) + Number(b.cfAdd || 0);
      const cfTotal = (Number(b.cfBase || 0) * Number(b.cfBaseRate || 0)) + (Number(b.cfAdd || 0) * Number(b.cfAddRate || 0));
      const acc = (Number(b.stairs || 0) * Number(b.stairsRate || 0)) + (Number(b.longCarry || 0) * Number(b.longCarryRate || 0)) + (Number(b.bulky || 0) * Number(b.bulkyRate || 0));
      const sub = cfTotal + acc + Number(b.packing || 0);
      const disc = sub * (Number(b.discountPct || 0) / 100);
      const fuel = (sub - disc) * (Number(b.fuelPct) || 0) / 100);
      const grand = (sub - disc) + fuel + Number(b.bindingFee || 0) + Number(b.assetIntegrityFee || 0);
      
      const gain = grand - phoneEstimate.grandTotal - Number(b.assetIntegrityFee || 0);
      const overageCF = currentCF - phoneEstimate.cf;
      const totalExp = contract.receipts.reduce((sum, r) => sum + (Number(r.amt) || 0), 0);
      const driverComm = gain > 0 ? (gain * 0.15) : 0;

      return { 
        subtotal: sub, 
        grandTotal: grand, 
        balance: grand - 672.55 - 1803.55, 
        gain: gain > 0 ? gain : 0,
        overageCF: overageCF > 0 ? overageCF : 0,
        driverComm,
        totalExp,
        techFeeRev: Number(b.assetIntegrityFee || 0),
        netProfit: grand - totalExp - driverComm - (sub * 0.35),
        monthlyTechProfit: (Number(b.assetIntegrityFee || 0) * 20) - 1500 
      };
    } catch (e) { return { subtotal: 0, grandTotal: 0, balance: 0, gain: 0, overageCF: 0 }; }
  }, [contract]);

  // --- ACTIONS ---
  const updateContract = (cat, field, val) => {
    setContract(prev => ({ ...prev, [cat]: { ...prev[cat], [field]: val } }));
  };

  const updateBilling = (field, val) => {
    setContract(prev => ({ ...prev, billing: { ...prev.billing, [field]: parseFloat(val) || 0 } }));
  };

  const addPhoto = (type, itemId = null) => {
    const photo = { id: Date.now(), time: new Date().toLocaleTimeString() };
    setContract(prev => {
      const next = { ...prev };
      if (type === 'receipt') next.receipts = [...next.receipts, photo];
      if (type === 'client') next.clientCompliancePhotos = [...next.clientCompliancePhotos, photo];
      if (type === 'inventory') next.inventory = next.inventory.map(i => i.id === itemId ? { ...i, [status === 'unloading' ? 'deliveryPhotos' : 'originPhotos']: [...(status === 'unloading' ? i.deliveryPhotos : i.originPhotos), photo] } : i);
      return next;
    });
  };

  const logExpense = (amt, desc) => {
     const newReceipt = { id: Date.now(), amt, desc, time: new Date().toLocaleTimeString() };
     setContract(prev => ({ ...prev, receipts: [...prev.receipts, newReceipt] }));
  };

  const sendMessage = (text, role) => {
    setContract(prev => ({
      ...prev,
      messages: [...prev.messages, { role, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
    }));
  };

  const toggleWalkthrough = () => setIsRecordingWalkthrough(!isRecordingWalkthrough);

  // --- SHARED UI COMPONENTS ---
  const MessagingHub = ({ role }) => (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl">
      <div className="bg-black/50 p-4 border-b border-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3 h-3 text-blue-500" />
          <span className="text-[9px] font-black uppercase text-zinc-400">Secure Dispatch Link</span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_#22c55e]" />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-[200px]">
        {contract.messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === role ? 'items-end' : 'items-start'}`}>
            <span className="text-[7px] text-zinc-600 uppercase font-black mb-1">{m.role} • {m.time}</span>
            <div className={`p-2.5 rounded-2xl text-[10px] font-bold max-w-[85%] ${m.role === role ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 bg-black border-t border-zinc-800 flex gap-2">
        <input 
          placeholder="Message Dispatch..." 
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-[10px] outline-none focus:border-blue-600 text-white"
          onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value) { sendMessage(e.target.value, role); e.target.value = ''; }}}
        />
      </div>
    </div>
  );

  // --- DRIVER VIEW ---
  const DriverView = () => (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-40 px-4">
      {/* TABS HUB */}
      <div className="flex gap-6 border-b border-zinc-900 pb-4 overflow-x-auto no-scrollbar">
        {['witness', 'evidence', 'logistics', 'delivery', 'chat'].map(t => (
          <button 
            key={t} onClick={() => setDriverTab(t)}
            className={`text-[10px] font-black uppercase tracking-[0.2em] pb-4 -mb-4.5 border-b-2 transition-all ${driverTab === t ? 'text-blue-500 border-blue-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
          >
            {t === 'witness' ? 'Site record' : t === 'evidence' ? 'Photos & Receipts' : t}
          </button>
        ))}
      </div>

      {/* PHASE: LOADING BLOCKED/AUTHORIZED */}
      {status === 'loading' && (
        <div className="space-y-8">
          {!isSignedAtOrigin ? (
            <div className="bg-red-600/10 border-2 border-red-500/50 p-16 rounded-[40px] text-center space-y-6">
               <Lock className="text-red-500 w-16 h-16 mx-auto" />
               <h2 className="text-white font-black text-5xl uppercase italic tracking-tighter">LOADING BLOCKED</h2>
               <p className="text-red-500/70 text-xs font-black uppercase tracking-widest leading-relaxed">System Lock Engaged. Hand device to client.<br/>Origin signature is required before assets are touched.</p>
            </div>
          ) : (
            <div className="bg-green-600/10 border-2 border-green-500/50 p-16 rounded-[40px] text-center space-y-8 shadow-[0_0_60px_rgba(34,197,94,0.1)]">
               <CheckCircle2 className="text-green-500 w-24 h-24 mx-auto animate-bounce shadow-[0_0_30px_rgba(34,197,94,0.4)]" />
               <h2 className="text-white font-black text-6xl uppercase italic tracking-tighter leading-none">GREEN LIGHT: AUTHORIZED</h2>
               <button onClick={() => setStatus('transit')} className="bg-white text-black px-12 py-6 rounded-2xl font-black uppercase tracking-widest hover:scale-105 shadow-2xl transition-all">LOAD COMPLETE: COMMENCE TRANSIT</button>
            </div>
          )}
        </div>
      )}

      {/* PHASE: SURVEY / WITNESS */}
      {status === 'survey' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           <div className="lg:col-span-3 space-y-8">
              {driverTab === 'witness' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-zinc-900/40 p-8 rounded-[32px] border border-zinc-800 space-y-6 shadow-inner">
                      <h3 className="text-white font-black uppercase text-sm italic flex items-center gap-2 border-b border-zinc-800 pb-4"><Box className="w-4 h-4 text-blue-500" /> Volume Observations</h3>
                      {['cfBase', 'cfAdd'].map(f => (
                        <div key={f} className="flex justify-between items-center bg-black/50 p-5 rounded-2xl border border-zinc-800 group hover:border-blue-600 transition-all shadow-md">
                          <span className="text-[10px] font-black text-zinc-500 uppercase">{f === 'cfBase' ? 'Base Units' : 'Add. Units'} (CF)</span>
                          <div className="flex items-center gap-4">
                            <button onClick={() => updateBilling(f, contract.billing[f] - 10)} className="w-10 h-10 bg-zinc-800 text-white rounded-xl font-bold hover:bg-blue-600 transition-all">-</button>
                            <span className="text-white font-mono font-black text-2xl w-16 text-center">{contract.billing[f]}</span>
                            <button onClick={() => updateBilling(f, contract.billing[f] + 10)} className="w-10 h-10 bg-zinc-800 text-white rounded-xl font-bold hover:bg-blue-600 transition-all">+</button>
                          </div>
                        </div>
                      ))}
                   </div>
                   <div className="bg-zinc-900/40 p-8 rounded-[32px] border border-zinc-800 space-y-4 shadow-inner">
                      <h3 className="text-white font-black uppercase text-sm italic flex items-center gap-2 border-b border-zinc-800 pb-4"><AlertTriangle className="w-4 h-4 text-blue-500" /> Obstacles Observed</h3>
                      {['stairs', 'longCarry', 'bulky'].map(k => (
                        <div key={k} className="flex justify-between items-center bg-black/50 p-4 rounded-2xl border border-zinc-800 group hover:border-blue-500 transition-all shadow-md">
                          <span className="text-zinc-400 text-[10px] font-black uppercase">{k}</span>
                          <div className="flex items-center gap-4">
                            <button onClick={() => updateBilling(k, contract.billing[k] - 1)} className="w-8 h-8 bg-zinc-800 text-white rounded-lg font-bold">-</button>
                            <span className="text-white font-mono font-bold text-xl w-8 text-center">{contract.billing[k]}</span>
                            <button onClick={() => updateBilling(k, contract.billing[k] + 1)} className="w-8 h-8 bg-zinc-800 text-white rounded-lg font-bold">+</button>
                          </div>
                        </div>
                      ))}
                   </div>
                   <div className="md:col-span-2">
                     <button onClick={() => setStatus('loading')} className="w-full bg-blue-600 py-6 rounded-2xl text-white font-black uppercase tracking-widest shadow-2xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3">
                       Finalize Origin Survey <ArrowRight className="w-5 h-5" />
                     </button>
                   </div>
                </div>
              )}
           </div>

           {/* COMMISSION BRACKET */}
           <div className="lg:col-span-1 space-y-6">
              <div className="bg-zinc-900 p-8 rounded-[40px] border border-zinc-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="w-32 h-32 text-blue-600" /></div>
                <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8 border-b border-zinc-800 pb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Commission Audit</h3>
                <div className="space-y-8">
                   <div className="flex justify-between items-center">
                     <span className="text-zinc-600 text-[10px] font-black uppercase italic">Estimate Baseline</span>
                     <span className="text-white font-mono font-bold text-sm">${phoneEstimate.grandTotal.toFixed(2)}</span>
                   </div>
                   <div className="bg-green-600/10 p-5 rounded-2xl border border-green-500/20 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-green-500 text-[9px] font-black uppercase">Overage Gain</span>
                        <span className="text-white font-black italic text-xl leading-none">+${totals.gain.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-green-500/20 pt-3">
                        <span className="text-green-500 text-[8px] font-black uppercase">Extra Volume</span>
                        <span className="text-white font-mono font-bold text-sm">+{totals.overageCF} CF</span>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-zinc-800">
                      <p className="text-zinc-500 text-[9px] font-black uppercase mb-1 tracking-widest">Total to Justify</p>
                      <p className="text-white text-5xl font-black italic tracking-tighter leading-none">${totals.grandTotal.toFixed(2)}</p>
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* PHASE 2: TRANSIT & STORAGE */}
      {(status === 'transit' || status === 'storage') && driverTab === 'witness' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8">
           <div className="bg-zinc-900/40 p-8 rounded-[32px] border border-zinc-800 space-y-8 shadow-inner">
              <h3 className="text-white font-black uppercase text-sm italic border-b border-zinc-800 pb-4 flex items-center gap-2"><Warehouse className="w-5 h-5 text-blue-500" /> Transfer Hub</h3>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 font-black uppercase">Current Custody</label>
                    <div className="flex gap-2">
                       <button onClick={() => setStatus('transit')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase border transition-all ${status === 'transit' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-600'}`}>On Truck (Transit)</button>
                       <button onClick={() => setStatus('storage')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase border transition-all ${status === 'storage' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-600'}`}>In Warehouse (Storage)</button>
                    </div>
                 </div>
                 {status === 'storage' && (
                   <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                      <input placeholder="Warehouse ID" className="bg-black border border-zinc-800 p-4 rounded-2xl text-white font-mono text-xs uppercase" onChange={(e)=>updateContract('logistics', 'storageFacility', e.target.value)} />
                      <input placeholder="Unit/Bin #" className="bg-black border border-zinc-800 p-4 rounded-2xl text-white font-mono text-xs uppercase" onChange={(e)=>updateContract('logistics', 'storageBin', e.target.value)} />
                   </div>
                 )}
                 <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 font-black uppercase">Assign Carrier ID</label>
                    <input placeholder="Driver Name / MC #" className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white text-xs font-mono uppercase shadow-inner" onChange={(e)=>updateContract('logistics', 'carrierId', e.target.value)} />
                 </div>
              </div>
              <button onClick={() => setStatus('delivery_gate')} className="w-full bg-zinc-100 text-black py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 hover:text-white transition-all">Submit Chain of Custody Report</button>
           </div>
           <MessagingHub role="driver" />
        </div>
      )}

      {/* PHASE 3: DELIVERY HARD STOP */}
      {status === 'delivery_gate' && (
        <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in">
           {!paymentRenderedAtDest ? (
             <div className="bg-amber-600/10 border-2 border-amber-500/50 p-16 rounded-[48px] text-center space-y-8 shadow-2xl">
                <CreditCard className="text-amber-500 w-20 h-20 mx-auto animate-pulse" />
                <h2 className="text-white font-black text-5xl uppercase italic tracking-tighter">UNLOAD BLOCKED</h2>
                <p className="text-amber-500/70 text-sm font-black uppercase tracking-[0.2em] max-w-md mx-auto leading-relaxed italic">Payment verification required before the truck seal is broken.<br/>Instruct client to render funds.</p>
                <div className="max-w-sm mx-auto p-6 bg-black/60 rounded-3xl border border-zinc-800 shadow-2xl">
                   <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mb-1">Final Dest. Balance</p>
                   <p className="text-white text-5xl font-black italic tracking-tighter leading-none">${totals.balance.toFixed(2)}</p>
                </div>
             </div>
           ) : (
             <div className="bg-green-600/10 border-2 border-green-500/50 p-16 rounded-[48px] text-center space-y-8 shadow-[0_0_40px_#22c55e33]">
                <CheckCircle2 className="text-green-500 w-24 h-24 mx-auto animate-bounce shadow-[0_0_20px_#22c55e]" />
                <h2 className="text-white font-black text-6xl uppercase italic tracking-tighter leading-none">AUTHORIZED TO UNLOAD</h2>
                <button onClick={() => setStatus('unloading')} className="bg-white text-black px-12 py-6 rounded-2xl font-black uppercase tracking-widest hover:scale-105 shadow-2xl transition-all">OPEN TRUCK SEAL</button>
             </div>
           )}
        </div>
      )}

      {/* PHASE 4: OUTTAKE CONDITION WITNESS */}
      {status === 'unloading' && driverTab === 'witness' && (
        <div className="bg-zinc-900/40 p-10 rounded-[40px] border border-zinc-800 space-y-8 shadow-2xl">
           <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
             <h3 className="text-white font-black uppercase text-xl italic tracking-tighter">Outtake Condition Witness</h3>
             <span className="bg-green-600/20 text-green-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">Payment Verified</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {contract.inventory.map(item => (
                <div key={item.id} className="bg-black/50 p-6 rounded-3xl border border-zinc-800 space-y-4 shadow-xl">
                   <span className="text-white font-black text-sm uppercase italic block border-b border-zinc-800 pb-2 leading-none">{item.item}</span>
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] text-zinc-600 font-black uppercase">Origin: {item.originPhotos.length} photos</span>
                      <button onClick={() => addPhoto('delivery', item.id)} className={`p-3 rounded-2xl transition-all ${item.deliveryPhotos.length > 0 ? 'bg-green-600 text-white' : 'bg-blue-600 text-white shadow-lg'}`}>
                         <Camera className="w-5 h-5" />
                      </button>
                   </div>
                   {item.deliveryPhotos.length > 0 && <p className="text-[8px] text-green-500 font-black uppercase text-center">Delivery Witnessed ({item.deliveryPhotos.length})</p>}
                </div>
              ))}
           </div>
           <button onClick={() => setStatus('completed')} className="w-full bg-blue-600 py-6 rounded-3xl text-white font-black uppercase tracking-widest shadow-[0_20px_40px_rgba(37,99,235,0.3)] hover:bg-blue-500">Close Accountability Loop: MOVE COMPLETED</button>
        </div>
      )}

      {/* EVIDENCE TAB */}
      {driverTab === 'evidence' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
           <div className="bg-zinc-900/40 p-8 rounded-[32px] border border-zinc-800 space-y-6 shadow-xl">
              <h3 className="text-blue-500 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800 pb-4 italic">Inventory Condition Witness</h3>
              {contract.inventory.map(item => (
                <div key={item.id} className="bg-black/50 p-5 rounded-2xl border border-zinc-800 flex justify-between items-center group hover:border-blue-600 transition-all shadow-md">
                  <span className="text-white text-xs font-bold uppercase">{item.item}</span>
                  <div className="flex items-center gap-4">
                    {item.originPhotos.length > 0 && <span className="text-[9px] text-blue-500 font-black uppercase">{item.originPhotos.length} Captured</span>}
                    <button onClick={() => addPhoto('inventory', item.id)} className="bg-zinc-800 p-2.5 rounded-xl text-white hover:bg-blue-600 transition-all shadow-lg"><Camera className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
           </div>
           <div className="bg-zinc-900/40 p-10 rounded-[32px] border border-zinc-800 flex flex-col items-center justify-center space-y-6 shadow-inner">
              <button onClick={() => addPhoto('receipt')} className="w-28 h-28 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.5)] active:scale-90 transition-all group">
                 <Receipt className="text-white w-12 h-12 group-hover:scale-110 transition-transform" />
              </button>
              <div className="text-center">
                 <h4 className="text-white font-black uppercase italic tracking-tighter text-2xl">Daily Logistics Receipts</h4>
                 <p className="text-zinc-600 text-[11px] font-black uppercase tracking-widest mt-2">{contract.receipts.length} Expenses Documented</p>
              </div>
           </div>
        </div>
      )}

      {driverTab === 'chat' && <div className="h-[600px]"><MessagingHub role="driver" /></div>}
    </div>
  );

  const OfficeView = () => (
    <div className="p-10 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto pb-40 px-4">
      <div className="flex justify-between items-end border-b border-zinc-900 pb-8">
        <div className="space-y-1">
          <h2 className="text-white font-black text-4xl tracking-tighter uppercase italic leading-none">Command Center</h2>
          <p className="text-zinc-600 text-[10px] font-black uppercase mt-2 tracking-[0.2em] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" /> STATUS: {status.toUpperCase()} | ASSET: {contract.logistics.carrierId}
          </p>
        </div>
        <div className="flex gap-4">
           {status === 'loading' && !isSignedAtOrigin && <div className="px-6 py-2 bg-blue-900/20 text-blue-400 font-black text-[10px] uppercase rounded-lg border border-blue-500/30">Waiting for Client Sign-off</div>}
           {status === 'delivery_gate' && <button onClick={() => setPaymentRenderedAtDest(true)} className="bg-green-600 text-white px-10 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg animate-pulse">Verify Payment & Release Lock</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
           {/* LOGISTICS CARD */}
           <div className="bg-zinc-900/40 p-8 rounded-[40px] border border-zinc-800 space-y-6">
              <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-widest italic border-b border-zinc-800 pb-4">Chain of Custody</h3>
              <div className="grid grid-cols-2 gap-12">
                 <div className="space-y-4">
                    <span className="text-[10px] text-zinc-600 font-black uppercase">Current Holder</span>
                    <div className="p-5 bg-black rounded-3xl border border-zinc-800 shadow-inner">
                       <p className="text-white font-mono font-black text-lg uppercase leading-none">{contract.logistics.carrierId}</p>
                       <p className="text-blue-500 text-[9px] font-black uppercase mt-2">{contract.logistics.carrierType}</p>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <span className="text-[10px] text-zinc-600 font-black uppercase">Current Location</span>
                    <div className="p-5 bg-black rounded-3xl border border-zinc-800 shadow-inner">
                       <p className="text-white font-black text-lg uppercase leading-none">{status === 'storage' ? `HUB: ${contract.logistics.warehouseId}` : 'In Transit'}</p>
                       <p className="text-zinc-500 text-[9px] font-black uppercase mt-2">Bin: {contract.logistics.binNumber || 'N/A'}</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* PROFIT LEDGER */}
           <div className="bg-zinc-900/40 p-10 rounded-[50px] border border-zinc-800 space-y-10 shadow-inner">
              <h3 className="text-white font-black uppercase text-sm border-b border-zinc-800 pb-4 italic flex items-center gap-2"><Scale className="w-5 h-5 text-blue-500" /> Financial Audit Ledger</h3>
              <div className="space-y-4">
                 <div className="flex justify-between p-5 bg-black/40 rounded-3xl border border-zinc-800">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Base Move Revenue</span>
                    <span className="text-white font-mono font-bold">${phoneEstimate.grandTotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20 shadow-lg">
                    <span className="text-blue-500 text-xs font-black uppercase italic tracking-tighter">Asset Integrity Tech Fee</span>
                    <span className="text-white font-mono font-black">+${totals.techFeeRev.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between p-5 bg-green-600/10 rounded-3xl border border-green-500/20 shadow-inner">
                    <span className="text-green-500 text-xs font-black uppercase tracking-tighter italic">Adjudicated Overage Revenue</span>
                    <span className="text-white font-mono font-black">+${totals.revGain.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between p-5 bg-red-600/10 rounded-3xl border border-red-500/20 shadow-inner">
                    <span className="text-red-500 text-xs font-black uppercase italic tracking-tighter">Verified Expenses & Payouts</span>
                    <span className="text-white font-mono font-black">-${(totals.totalExp + totals.driverComm).toFixed(2)}</span>
                 </div>
              </div>
              <div className="pt-10 border-t border-zinc-800 flex justify-between items-end flex-wrap gap-6">
                 <div>
                    <p className="text-zinc-600 text-[10px] font-black uppercase italic mb-1 leading-none">Net Job Contribution</p>
                    <p className="text-white text-7xl font-black italic tracking-tighter leading-none">${totals.netProfit.toFixed(2)}</p>
                 </div>
                 <div className="text-right">
                    <div className="bg-zinc-950 p-6 rounded-[32px] border border-zinc-800 shadow-2xl space-y-2">
                       <p className="text-blue-500 text-[9px] font-black uppercase tracking-[0.2em] leading-none">Technology ROI</p>
                       <p className="text-green-500 font-mono font-black text-3xl leading-none">+${totals.monthlyTechProfit.toFixed(2)}</p>
                       <p className="text-[7px] text-zinc-700 font-black uppercase tracking-widest italic mt-2">Self-Funding Platform Active</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-blue-600 p-10 rounded-[50px] shadow-2xl space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5"><History className="w-40 h-40 text-white" /></div>
              <h3 className="text-white text-[10px] font-black uppercase tracking-[0.4em] opacity-60 text-center leading-none italic">Verified Settlement</h3>
              <div className="space-y-4 text-center">
                 <p className="text-white text-7xl font-black italic tracking-tighter leading-none">${totals.grandTotal.toFixed(2)}</p>
                 <span className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Live Adjudicated Balance</span>
              </div>
           </div>
           <div className="h-[400px]"><MessagingHub role="office" /></div>
        </div>
      </div>
    </div>
  );

  const ClientView = () => (
    <div className="max-w-4xl mx-auto p-4 md:p-12 text-center space-y-12 animate-in zoom-in-95 duration-700 pb-40">
       <div className="space-y-8">
          <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden relative shadow-inner">
             <div className={`h-full bg-blue-500 shadow-[0_0_15px_#2563eb] transition-all duration-1000 ${status === 'transit' ? 'w-1/2' : status === 'storage' ? 'w-2/3' : status === 'delivery_gate' ? 'w-5/6' : status === 'completed' ? 'w-full' : 'w-1/4'}`} />
          </div>
          <h2 className="text-white font-black text-6xl tracking-tighter uppercase italic leading-none">{status.replace('_', ' ')}</h2>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-center">
          <div className="bg-zinc-900/50 p-12 rounded-[50px] border border-zinc-800 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5"><ShieldAlert className="w-32 h-32 text-blue-500" /></div>
             <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest italic mb-2 leading-none">Verified Settlement Total</p>
             <p className="text-white text-7xl font-black italic tracking-tighter leading-none shadow-sm">${totals.grandTotal.toFixed(2)}</p>
             <div className="pt-6 border-t border-zinc-800 mt-6 flex justify-between text-[10px] font-black uppercase text-zinc-500">
                <span>Asset Integrity Audit Access</span>
                <span className="text-blue-500 font-mono text-lg">$150.00</span>
             </div>
          </div>

          <div className="space-y-6">
             {status === 'loading' && !isSignedAtOrigin && (
                <div className="bg-blue-600 p-10 rounded-[50px] space-y-8 shadow-2xl text-center animate-in slide-in-from-bottom-6">
                   <h3 className="text-white font-black uppercase text-xl italic tracking-tighter leading-none">Security Sign-Off</h3>
                   <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest leading-relaxed italic">Confirm the site inventory witness record to authorize the physical loading of your assets.</p>
                   <button onClick={() => setIsSignedAtOrigin(true)} className="w-full py-6 bg-white text-black rounded-3xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-3xl">Agree & Authorize Loading</button>
                </div>
             )}

             {status === 'completed' && !reviewSubmitted && (
                <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[50px] space-y-8 text-center shadow-2xl animate-in zoom-in-95">
                   <h3 className="text-white font-black uppercase text-xl italic tracking-tighter leading-none italic">Verified Move Summary</h3>
                   <div className="flex justify-center gap-3">
                      {[1,2,3,4,5].map(s => <button key={s} onClick={() => setContract({...contract, review: {...contract.review, rating: s}})} className={`transition-all ${contract.review.rating >= s ? 'text-yellow-400 scale-110' : 'text-zinc-800 opacity-40'}`}><Star className="w-10 h-10 fill-current" /></button>)}
                   </div>
                   <textarea placeholder="How was your Move Master experience?" className="w-full bg-black border border-zinc-800 rounded-3xl p-5 text-white text-sm focus:outline-none focus:border-blue-600 transition-all italic leading-relaxed" onChange={(e)=>setContract({...contract, review: {...contract.review, comment: e.target.value}})} />
                   <button onClick={() => setReviewSubmitted(true)} className="w-full bg-blue-600 py-5 rounded-2xl text-white font-black uppercase text-xs shadow-xl hover:bg-blue-500">Complete Security Audit</button>
                </div>
             )}
             
             {/* CLIENT COMPLIANCE PHOTO BUTTON */}
             <div className="pt-4 flex justify-between items-center px-4">
                <span className="text-[10px] text-zinc-500 font-black uppercase">Log Compliance Evidence</span>
                <button onClick={() => addPhoto('client')} className="bg-zinc-800 p-3 rounded-2xl hover:bg-blue-600 transition-all shadow-lg"><Camera className="w-5 h-5 text-white" /></button>
             </div>
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-blue-600 pb-24 overflow-x-hidden no-scrollbar">
      {/* HEADER */}
      <div className="bg-black border-b border-blue-900/30 p-4 sticky top-0 z-50 flex justify-between items-center max-w-7xl mx-auto px-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded shadow-[0_0_15px_#2563eb]"><ShieldCheck className="text-white w-5 h-5" /></div>
          <h1 className="text-white font-black tracking-tighter text-xl italic leading-none hidden sm:block uppercase italic leading-none">Move Masters OS</h1>
        </div>
        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 shadow-inner scale-90 sm:scale-100">
          {['office', 'driver', 'client'].map(r => <button key={r} onClick={() => setActiveRole(r)} className={`px-4 py-1.5 rounded text-[10px] font-black uppercase transition-all ${activeRole === r ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500'}`}>{r}</button>)}
        </div>
      </div>
      <StepIndicator status={status} />
      <main className="mx-auto">{activeRole === 'driver' && <DriverView />}{activeRole === 'office' && <OfficeView />}{activeRole === 'client' && <ClientView />}</main>
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-zinc-900 px-8 py-4 flex justify-between items-center z-50 shadow-3xl backdrop-blur-md">
        <div className="flex items-center gap-8"><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#2563eb]" /><span className="text-[9px] font-black text-zinc-600 uppercase italic leading-none tracking-widest">Operational Honesty Link Active</span></div></div>
        <div className="text-[9px] font-mono text-zinc-800 uppercase tracking-tighter italic font-bold">MM-OS MASTER v3.4.0-FINAL</div>
      </div>
    </div>
  );
};

// --- SHARED CHAT COMPONENT ---
const MessagingHub = ({ role }) => (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl">
      <div className="bg-black/50 p-4 border-b border-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3 h-3 text-blue-500" />
          <span className="text-[9px] font-black uppercase text-zinc-400">Secure Dispatch Link</span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_#22c55e]" />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-[200px]">
        {/* Placeholder Chat Logic */}
        <div className="flex flex-col items-start">
            <span className="text-[7px] text-zinc-600 uppercase font-black mb-1">Office • 09:00 AM</span>
            <div className="p-2.5 rounded-2xl text-[10px] font-bold max-w-[85%] bg-zinc-800 text-zinc-300">
              System Initialized. Awaiting Site Evidence.
            </div>
        </div>
      </div>
      <div className="p-3 bg-black border-t border-zinc-800 flex gap-2">
        <input 
          placeholder="Message Dispatch..." 
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-[10px] outline-none focus:border-blue-600 text-white"
        />
      </div>
    </div>
  );

const StepIndicator = ({ status }) => {
  const steps = ['survey', 'loading', 'transit', 'storage', 'delivery_gate', 'unloading', 'completed'];
  const curIdx = steps.indexOf(status);
  return (
    <div className="bg-zinc-950/90 border-b border-zinc-900 px-6 py-5 flex justify-center gap-4 md:gap-14 overflow-x-auto whitespace-nowrap scrollbar-hide shadow-xl">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-col items-center gap-2 min-w-max">
          <div className={`h-1 w-10 md:w-16 rounded-full transition-all duration-1000 ${i <= curIdx ? 'bg-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.6)]' : 'bg-zinc-800'}`} />
          <span className={`text-[6.5px] md:text-[7px] font-black uppercase tracking-widest ${status === s ? 'text-white' : 'text-zinc-600'}`}>{s.replace('_', ' ')}</span>
        </div>
      ))}
    </div>
  );
};

export default App;


