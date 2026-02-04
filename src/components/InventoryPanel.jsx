import './styles/app.css';
import { useEffect, useState } from 'react';

/* =================== MOCK API =================== */
const MoveMastersAPI = {
  getJob: async (id) =>
    Promise.resolve({
      id,
      status: 'survey',
      inventory: [],
      clientSigned: false,
      labor: [{ role: 'driver', payout: 0 }, { role: 'helper', payout: 0 }],
      inventoryTotals: {
        estimatedCubicFeet: 0,
        actualCubicFeet: 0,
        revisedCubicFeet: 0,
        commissionCF: 0
      }
    })
};

/* =================== INVENTORY PANEL =================== */
function InventoryPanel({ role, inventory, inventoryTotals, addItem, updateItem }) {
  const safeInventory = Array.isArray(inventory) ? inventory : [];

  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState(1);
  const [estimatedCF, setEstimatedCF] = useState(0);
  const [driverActualCF, setDriverActualCF] = useState({}); // per item

  const [officeEdits, setOfficeEdits] = useState({}); // revised CF

  const handleAdd = () => {
    const newItem = {
      id: Date.now(),
      name: itemName,
      qty,
      estimatedCubicFeet: estimatedCF,
      actualCubicFeet: estimatedCF, // initial actual = estimate
      revisedCubicFeet: 0
    };
    addItem(newItem);
    setItemName('');
    setQty(1);
    setEstimatedCF(0);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Inventory</h3>

      {/* DRIVER INPUT */}
      {role === 'driver' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Item name"
            value={itemName}
            onChange={e => setItemName(e.target.value)}
          />
          <input
            type="number"
            min="1"
            value={qty}
            onChange={e => setQty(Number(e.target.value))}
            style={{ width: 60 }}
          />
          <input
            type="number"
            min="0"
            placeholder="Est. CF"
            value={estimatedCF}
            onChange={e => setEstimatedCF(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <button disabled={!itemName} onClick={handleAdd}>
            Add Item
          </button>
        </div>
      )}

      {safeInventory.length === 0 ? (
        <p>No items added yet.</p>
      ) : (
        <>
          <ul>
            {safeInventory.map(item => {
              const actualCF = item.actualCubicFeet ?? item.estimatedCubicFeet;
              const revisedCF = item.revisedCubicFeet ?? 0;
              const estimatedTotal = (item.estimatedCubicFeet || 0) * (item.qty || 1);
              const actualTotal = actualCF * (item.qty || 1);
              const revisedTotal = revisedCF * (item.qty || 1);
              const commission = Math.max(actualCF - (item.estimatedCubicFeet || 0), 0) * (item.qty || 1);

              return (
                <li key={item.id} style={{ marginBottom: 6 }}>
                  <strong>{item.name}</strong> — qty: {item.qty}
                  <br />
                  Est CF: {item.estimatedCubicFeet} | Est Total: {estimatedTotal}
                  <br />
                  Actual CF:{' '}
                  {role === 'driver' ? (
                    <input
                      type="number"
                      min="0"
                      value={driverActualCF[item.id] ?? actualCF}
                      style={{ width: 60 }}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setDriverActualCF(prev => ({ ...prev, [item.id]: val }));
                        updateItem(item.id, { actualCubicFeet: val });
                      }}
                    />
                  ) : (
                    actualCF
                  )}{' '}
                  | Actual Total: {actualTotal}
                  {role === 'office' && (
                    <>
                      <br />
                      Rev CF:{' '}
                      <input
                        type="number"
                        min="0"
                        value={officeEdits[item.id] ?? revisedCF}
                        style={{ width: 60 }}
                        onChange={e =>
                          setOfficeEdits(prev => ({ ...prev, [item.id]: e.target.value }))
                        }
                        onBlur={() => {
                          const val = Number(officeEdits[item.id] || 0);
                          updateItem(item.id, { revisedCubicFeet: val });
                        }}
                      />
                      {' | '}Rev Total: {revisedTotal}
                    </>
                  )}
                  <br />
                  Commission CF: {commission}
                </li>
              );
            })}
          </ul>

          {/* ================== TOTALS ================== */}
          <div style={{ marginTop: 10 }}>
            <strong>Total Estimated CF:</strong> {inventoryTotals?.estimatedCubicFeet ?? 0}
            <br />
            <strong>Total Actual CF:</strong> {inventoryTotals?.actualCubicFeet ?? 0}
            <br />
            <strong>Total Revised CF:</strong> {inventoryTotals?.revisedCubicFeet ?? 0}
            <br />
            <strong>Total Commission CF:</strong> {inventoryTotals?.commissionCF ?? 0}
          </div>
        </>
      )}
    </div>
  );
}

/* =================== APP =================== */
export default function App() {
  const [job, setJob] = useState(null);
  const [role, setRole] = useState('driver');

  useEffect(() => {
    MoveMastersAPI.getJob('FLEETFLOW-001').then(setJob);
  }, []);

  if (!job) return <div style={{ padding: 20 }}>Connecting…</div>;

  const helper = job.labor.find(w => w.role === 'helper');

  /* ================= INVENTORY UPDATE WITH TOTALS ================= */
  const updateInventoryItem = (itemId, updates) => {
    const newInventory = job.inventory.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );

    const totalEstimatedCF = newInventory.reduce(
      (sum, i) => sum + (i.estimatedCubicFeet || 0) * (i.qty || 1),
      0
    );
    const totalActualCF = newInventory.reduce(
      (sum, i) => sum + ((i.actualCubicFeet ?? i.estimatedCubicFeet) * (i.qty || 1)),
      0
    );
    const totalRevisedCF = newInventory.reduce(
      (sum, i) => sum + ((i.revisedCubicFeet ?? 0) * (i.qty || 1)),
      0
    );
    const commissionCF = newInventory.reduce((sum, i) => {
      const actual = i.actualCubicFeet ?? i.estimatedCubicFeet;
      const over = actual - (i.estimatedCubicFeet || 0);
      return sum + Math.max(over, 0) * (i.qty || 1);
    }, 0);

    setJob(prev => ({
      ...prev,
      inventory: newInventory,
      inventoryTotals: {
        estimatedCubicFeet: totalEstimatedCF,
        actualCubicFeet: totalActualCF,
        revisedCubicFeet: totalRevisedCF,
        commissionCF
      }
    }));
  };

  const addInventoryItem = (item) => {
    const newInventory = [...job.inventory, item];
    updateInventoryItem(null, { inventory: newInventory }); // recalculates totals
    setJob(prev => ({ ...prev, inventory: newInventory }));
  };

  return (
    <div className="app-container">
      <h1>FleetFLOW</h1>

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

      <InventoryPanel
        role={role}
        inventory={job.inventory}
        inventoryTotals={job.inventoryTotals}
        addItem={addInventoryItem}
        updateItem={updateInventoryItem}
      />
    </div>
  );
}
