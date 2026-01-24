import { useState } from 'react';

export default function InventoryPanel({ role, inventory, addItem, updateItem }) {
  const safeInventory = Array.isArray(inventory) ? inventory : [];

  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState(1);
  const [estimatedCF, setEstimatedCF] = useState(0);

  // 🔑 LOCAL STATE FOR OFFICE EDITING (SAFEGUARD AGAINST INPUT LOCKING)
  const [officeEdits, setOfficeEdits] = useState({});

  /* ================= INVENTORY MATH ================= */

  // Per-item math (qty-aware, audit-safe)
  const itemEstimatedTotal = item =>
    (item.estimatedCubicFeet || 0) * (item.qty || 1);

  const itemRevisedTotal = item =>
    (item.revisedCubicFeet || 0) * (item.qty || 1);

  // Totals (authoritative math lives here)
  <div style={{ marginTop: 10 }}>
  <strong>Total Estimated CF:</strong>{' '}
  {inventoryTotals?.estimatedCubicFeet ?? 0}
  <br />
  <strong>Total Revised CF:</strong>{' '}
  {inventoryTotals?.revisedCubicFeet ?? 0}
  <br />
  <strong>Final CF:</strong>{' '}
  {inventoryTotals?.finalCubicFeet ?? 0}
</div>

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Inventory</h3>

      {/* ================= DRIVER INPUT ================= */}
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

          <button
            type="button"
            disabled={!itemName}
            onClick={() => {
              addItem({
                id: Date.now(),
                name: itemName,
                qty,
                estimatedCubicFeet: estimatedCF,
                revisedCubicFeet: 0
              });

              setItemName('');
              setQty(1);
              setEstimatedCF(0);
            }}
          >
            Add Item
          </button>
        </div>
      )}

      {safeInventory.length === 0 ? (
        <p>No items added yet.</p>
      ) : (
        <>
          <ul>
            {safeInventory.map(item => (
              <li key={item.id} style={{ marginBottom: 6 }}>
                <strong>{item.name}</strong> — qty: {item.qty}
                <br />

                Est CF: {item.estimatedCubicFeet || 0}

                {/* ================= OFFICE REVISION ================= */}
                {role === 'office' && (
                  <>
                    {' '}| Rev CF:
                    <input
                      type="number"
                      min="0"
                      value={
                        officeEdits[item.id] ??
                        item.revisedCubicFeet ??
                        ''
                      }
                      style={{ width: 60, marginLeft: 6 }}
                      onChange={e =>
                        setOfficeEdits(prev => ({
                          ...prev,
                          [item.id]: e.target.value
                        }))
                      }
                      onBlur={() => {
                        const value = Number(officeEdits[item.id] || 0);
                        updateItem(item.id, { revisedCubicFeet: value });
                      }}
                    />
                  </>
                )}

                {/* ================= READ-ONLY FOR OTHERS ================= */}
                {role !== 'office' && item.revisedCubicFeet > 0 && (
                  <> | Rev CF: {item.revisedCubicFeet}</>
                )}
              </li>
            ))}
          </ul>

          {/* ================= TOTALS ================= */}
          <div style={{ marginTop: 10 }}>
            <strong>Total Estimated CF:</strong> {totalEstimated}
            <br />
            <strong>Total Revised CF:</strong> {totalRevised}
          </div>
        </>
      )}
    </div>
  );
}
