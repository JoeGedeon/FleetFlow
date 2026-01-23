import { useState } from 'react';

export default function InventoryPanel({ inventory = [], addItem, role }) {
  const safeInventory = Array.isArray(inventory) ? inventory : [];

  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState(1);
  const [driverCubicFeet, setDriverCubicFeet] = useState('');

  const totalCubicFeet = safeInventory.reduce((sum, item) => {
    const cuft =
      item.officeCubicFeet != null
        ? item.officeCubicFeet
        : item.driverCubicFeet || 0;

    return sum + cuft * item.qty;
  }, 0);

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Inventory</h3>

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

          <input
            type="number"
            min="0"
            placeholder="Cu Ft"
            value={driverCubicFeet}
            onChange={e => setDriverCubicFeet(e.target.value)}
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
                driverCubicFeet: Number(driverCubicFeet) || 0,
                officeCubicFeet: null
              });

              setItemName('');
              setQty(1);
              setDriverCubicFeet('');
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
              <li key={item.id}>
                {item.name} — qty: {item.qty} —
                Driver: {item.driverCubicFeet} cu ft
                {item.officeCubicFeet != null && (
                  <> | Office: {item.officeCubicFeet} cu ft</>
                )}
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
