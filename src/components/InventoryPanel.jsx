import { useState } from 'react';

export default function InventoryPanel({ inventory = [], addItem }) {
  const safeInventory = Array.isArray(inventory) ? inventory : [];

  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState(1);
  const [cubicFeet, setCubicFeet] = useState('');

  const totalCubicFeet = safeInventory.reduce(
    (sum, item) => sum + (item.cubicFeet || 0) * item.qty,
    0
  );

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Inventory</h3>

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

        <input
          type="number"
          min="0"
          placeholder="Cu Ft"
          value={cubicFeet}
          onChange={e => setCubicFeet(e.target.value)}
          style={{ width: 80 }}
        />

        <button
          type="button"
          disabled={!itemName}
          onClick={() => {
            if (typeof addItem !== 'function') return;

            addItem({
              id: Date.now(),
              name: itemName,
              qty,
              cubicFeet: Number(cubicFeet) || 0,
              source: 'driver'
            });

            setItemName('');
            setQty(1);
            setCubicFeet('');
          }}
        >
          Add Item
        </button>
      </div>

      {safeInventory.length === 0 ? (
        <p>No items added yet.</p>
      ) : (
        <>
          <ul>
            {safeInventory.map(item => (
              <li key={item.id}>
                {item.name} — qty: {item.qty} — {item.cubicFeet} cu ft
              </li>
            ))}
          </ul>

          <p>
            <strong>Total Volume:</strong> {totalCubicFeet} cu ft
          </p>
        </>
      )}
    </div>
  );
}
