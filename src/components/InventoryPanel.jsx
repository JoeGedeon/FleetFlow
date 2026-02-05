import { useState } from 'react';
import '../styles/app.css';

export default function InventoryPanel({
  role,
  inventory = [],
  inventoryTotals = {},
  addItem,
  updateItem
}) {
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState(1);
  const [estimatedCF, setEstimatedCF] = useState(0);

  const [driverActualCF, setDriverActualCF] = useState({});
  const [officeEdits, setOfficeEdits] = useState({});

  const handleAdd = () => {
    if (!itemName) return;

    addItem({
      id: Date.now(),
      name: itemName,
      qty,
      estimatedCubicFeet: estimatedCF,
      actualCubicFeet: estimatedCF,
      revisedCubicFeet: 0
    });

    setItemName('');
    setQty(1);
    setEstimatedCF(0);
  };

  return (
    <div className="panel">
      <h3>Inventory</h3>

      {role === 'driver' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
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
            value={estimatedCF}
            onChange={e => setEstimatedCF(Number(e.target.value))}
            placeholder="Est CF"
            style={{ width: 80 }}
          />
          <button onClick={handleAdd}>Add</button>
        </div>
      )}

      {inventory.length === 0 ? (
        <p>No inventory items yet.</p>
      ) : (
        <>
          <ul>
            {inventory.map(item => {
              const actualCF = item.actualCubicFeet ?? item.estimatedCubicFeet;
              const revisedCF = item.revisedCubicFeet ?? 0;

              const estimatedTotal = (item.estimatedCubicFeet || 0) * item.qty;
              const actualTotal = actualCF * item.qty;
              const revisedTotal = revisedCF * item.qty;
              const commissionCF = Math.max(actualCF - (item.estimatedCubicFeet || 0), 0) * item.qty;

              return (
                <li key={item.id} style={{ marginBottom: 10 }}>
                  <strong>{item.name}</strong> (x{item.qty})
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
                      Revised CF:{' '}
                      <input
                        type="number"
                        min="0"
                        value={officeEdits[item.id] ?? revisedCF}
                        style={{ width: 60 }}
                        onChange={e =>
                          setOfficeEdits(prev => ({ ...prev, [item.id]: e.target.value }))
                        }
                        onBlur={() =>
                          updateItem(item.id, { revisedCubicFeet: Number(officeEdits[item.id] || 0) })
                        }
                      />
                      {' | '}Revised Total: {revisedTotal}
                    </>
                  )}

                  <br />
                  Commission CF: {commissionCF}
                </li>
              );
            })}
          </ul>

          <div style={{ marginTop: 12 }}>
            <strong>Total Estimated CF:</strong> {inventoryTotals.estimatedCubicFeet ?? 0}
            <br />
            <strong>Total Actual CF:</strong> {inventoryTotals.actualCubicFeet ?? 0}
            <br />
            <strong>Total Revised CF:</strong> {inventoryTotals.revisedCubicFeet ?? 0}
            <br />
            <strong>Total Commission CF:</strong> {inventoryTotals.commissionCF ?? 0}
          </div>
        </>
      )}
    </div>
  );
}
