export default function InventoryPanel({ inventory, addItem }) {
  return (
    <div style={{ marginTop: '20px' }}>
      <h3>Inventory</h3>

      <button onClick={() => addItem('New Item')}>
        Add Item
      </button>

      <ul>
        {inventory.map(item => (
          <li key={item.id}>
            {item.name} (qty: {item.qty})
          </li>
        ))}
      </ul>
    </div>
  );
}
