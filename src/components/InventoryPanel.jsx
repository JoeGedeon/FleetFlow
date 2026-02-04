import { useState, useEffect } from 'react';

export default function InventoryPanel({ role, inventory = [], addItem, updateItem }) {
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState(1);
  const [actualCF, setActualCF] = useState(0);

  const [officeEdits, setOfficeEdits] = useState({});

  /* ================= PER-ITEM MATH ================= */
  const itemEstimatedTotal = item => (item.estimatedCubicFeet || 0) * (item.qty || 1);
  const itemActualTotal = item => (item.actualCubicFeet || 0) * (item.qty || 1);
  const itemRevisedTotal = item => (item.revisedCubicFeet || 0) * (item.qty || 1);

  /* ================= DYNAMIC TOTALS ================= */
  const totalEstimatedCF = inventory.reduce((sum, item) => sum + itemEstimatedTotal(item), 0);
  const totalActualCF = inventory.reduce((sum, item) => sum + itemActualTotal(item), 0);
  const totalRevisedCF = inventory.reduce((sum, item) => sum + itemRevisedTotal(item), 0);

  /* ================= DRIVER COMMISSION ================= */
  const commissionCF = inventory.reduce((sum, item) => {
    const overCF = (item.actualCubicFeet || 0) - (item.estimatedCubicFeet || 0);
    return sum + Math.max(overCF, 0) * (item.qty || 1);
  }, 0);

  const handleAddItem = () => {
    if (!itemName) return;
    addItem({
      id: Date.now(),
      name: itemName,
      qty,
      estimatedCubicFeet: actualCF, // auto-populate estimated CF from actual
      actualCubicFeet: actualCF,
      revisedCubicFeet: 0
    });
    setItemName('');
    setQty(1);
    setActualCF(0);
  };

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
            placeholder="Actual CF"
            value={actualCF}
            onChange={e => setActualCF(Number(e.target.value))}
            style={{ width: 80 }}
          />

          <button type="button" onClick={handleAddItem}>
            Add Item
          </button>
        </div>
      )}

      {inventory.length === 0 ? (
        <p>No items added yet.</p>
      ) : (
        <>
          {/* ================= HEADER ROW ================= */}
          <div
            style={{
              display: 'flex',
              fontWeight: 'bold',
              gap: 12,
              marginBottom: 4
            }}
          >
            <span style={{ flex: 2 }}>Item</span>
            <span style={{ width: 40 }}>Qty</span>
            <span style={{ width: 80 }}>Est CF</span>
            <span style={{ width: 80 }}>Actual CF</span>
            {role === 'office' && <span style={{ width: 80 }}>Rev CF</span>}
            <span style={{ width: 80 }}>Est Total</span>
            <span style={{ width: 80 }}>Actual Total</span>
            {role === 'office' && <span style={{ width: 80 }}>Rev Total</span>}
          </div>

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {inventory.map(item => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 6,
                  alignItems: 'center'
                }}
              >
                <span style={{ flex: 2 }}>{item.name}</span>

                <span style={{ width: 40 }}>{item.qty}</span>

                <span style={{ width: 80 }}>{item.estimatedCubicFeet}</span>

                {/* DRIVER ACTUAL CF */}
                {role === 'driver' ? (
                  <input
                    type="number"
                    min="0"
                    value={item.actualCubicFeet}
                    style={{ width: 80 }}
                    onChange={e =>
                      updateItem(item.id, { actualCubicFeet: Number(e.target.value) })
                    }
                  />
                ) : (
                  <span style={{ width: 80 }}>{item.actualCubicFeet}</span>
                )}

                {/* OFFICE REVISED CF */}
                {role === 'office' && (
                  <input
                    type="number"
                    min="0"
                    value={officeEdits[item.id] ?? item.revisedCubicFeet ?? 0}
                    style={{ width: 80 }}
                    onChange={e =>
                      setOfficeEdits(prev => ({
                        ...prev,
                        [item.id]: e.target.value
                      }))
                    }
                    onBlur={() =>
                      updateItem(item.id, {
                        revisedCubicFeet: Number(officeEdits[item.id] || 0)
                      })
                    }
                  />
                )}

                <span style={{ width: 80 }}>{itemEstimatedTotal(item)}</span>
                <span style={{ width: 80 }}>{itemActualTotal(item)}</span>
                {role === 'office' && <span style={{ width: 80 }}>{itemRevisedTotal(item)}</span>}
              </li>
            ))}
          </ul>

          {/* ================= TOTALS ================= */}
          <div style={{ marginTop: 10 }}>
            <strong>Total Estimated CF:</strong> {totalEstimatedCF} <br />
            <strong>Total Actual CF:</strong> {totalActualCF} <br />
            <strong>Total Revised CF:</strong> {totalRevisedCF} <br />
            {role === 'driver' && (
              <>
                <strong>Commission CF:</strong> {commissionCF} <br />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
