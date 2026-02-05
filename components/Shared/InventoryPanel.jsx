import React from 'react';

export default function InventoryPanel({ inventory, role, canEdit, addItem, updateItem }) {
  return (
    <div className="inventory-panel">
      <h3>Inventory ({role})</h3>
      <ul>
        {inventory.map(item => (
          <li key={item.id}>
            {item.name} - {item.quantity}
            {canEdit && updateItem && (
              <button onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}>
                +1
              </button>
            )}
          </li>
        ))}
      </ul>

      {canEdit && addItem && (
        <button onClick={() => addItem({ id: Date.now(), name: 'New Item', quantity: 1 })}>
          Add Item
        </button>
      )}
    </div>
  );
}
