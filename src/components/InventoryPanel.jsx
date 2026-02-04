import { useState } from 'react';

export default function InventoryPanel({ role, inventory = [], addItem, updateItem }) {
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState(1);
  const [estimatedCF, setEstimatedCF] = useState(0);

  const [officeEdits, setOfficeEdits] = useState({});

  /* ================= PER-ITEM MATH ================= */
  const itemEstimatedTotal = item => (item.estimatedCubicFeet || 0) * (item.qty || 1);
  const itemRevisedTotal = item => (item.revisedCubicFeet || 0) * (item.qty || 1);

  /* ================= DYNAMIC TOTALS ================= */
  const totalEstimatedCF = inventory.reduce((sum, item) => sum + itemEstimatedTotal(item), 0);
  const totalRevisedCF = inventory.reduce(
    (sum, item) => sum + (item.revisedCubicFeet || 0) * (item.qty || 1),
    0
  );
  const finalCF = totalRevisedCF > 0 ? totalRevisedCF : totalEstimatedCF;

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
            {role === 'office' && <span style={{ width: 80 }}>Rev CF</span>}
            <span style={{ width: 80 }}>Est Total</span>
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
                <span style={{ width: 80 }}>{item.estimatedCubicFeet || 0}</span>

                {role === 'office' && (
                  <input
                    type="number"
                    min="0"
                    value={officeEdits[item.id] ?? item.revisedCubicFeet ?? ''}
                    style={{ width: 80 }}
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
                )}

                <span style={{ width: 80 }}>{itemEstimatedTotal(item)}</span>

                {role === 'office' && (
                  <span style={{ width: 80 }}>
                    {item.revisedCubicFeet > 0 ? itemRevisedTotal(item) : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/* ================= TOTALS ================= */}
          <div style={{ marginTop: 10 }}>
            <strong>Total Estimated CF:</strong> {totalEstimatedCF}
            <br />
            <strong>Total Revised CF:</strong> {totalRevisedCF}
            <br />
            <strong>Final CF:</strong> {finalCF}
          </div>
        </>
      )}
    </div>
  );
}
