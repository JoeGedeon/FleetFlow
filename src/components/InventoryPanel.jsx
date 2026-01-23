import { useState } from 'react';

export default function InventoryPanel({ role, inventory, addItem, updateItem }) {
  const safeInventory = Array.isArray(inventory) ? inventory : [];

  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState(1);

  const totalCubicFeet = safeInventory.reduce(
    (sum, item) => sum + (item.cubicFeet || 0),
    0
  );

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Inventory</h3>

      {/* DRIVER ADD ITEMS */}
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
            style={{ width: 70 }}
          />

          <button
            type="button"
            disabled={!itemName}
            onClick={() => {
              addItem({
                id: Date.now(),
                name: itemName,
                qty,
                cubicFeet: 0
              });

              setItemName('');
              setQty(1);
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

                {/* OFFICE CUBIC FOOT ADJUSTMENT */}
                {role === 'office' && (
                  <>
                    {' '}| CF:
                    <input
                      type="number"
                      value={item.cubicFeet || 0}
                      min="0"
                      style={{ width: 60, marginLeft: 6 }}
                      onChange={e =>
                        updateItem(item.id, {
                          cubicFeet: Number(e.target.value)
                        })
                      }
                    />
                  </>
                )}

                {/* READ-ONLY FOR OTHERS */}
                {role !== 'office' && item.cubicFeet > 0 && (
                  <> — CF: {item.cubicFeet}</>
                )}
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 10 }}>
            <strong>Total Cubic Feet:</strong> {totalCubicFeet}
          </div>
        </>
      )}
    </div>
  );
}
