import { useState } from 'react';

export default function InventoryPanel({ inventory = [], addItem }) {
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState(1);

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

        <button
          disabled={!itemName}
          onClick={() => {
            addItem({
              id: Date.now(),
              name: itemName,
              qty
            });
            setItemName('');
            setQty(1);
          }}
        >
          Add Item
        </button>
      </div>

      {inventory.length === 0 ? (
        <p>No items added yet.</p>
      ) : (
        <ul>
          {inventory.map(item => (
            <li key={item.id}>
              {item.name} — qty: {item.qty}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
