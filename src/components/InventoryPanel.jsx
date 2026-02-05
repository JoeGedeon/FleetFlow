import { useState } from 'react';

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
  const [officeRevisedCF, setOfficeRevisedCF] = useState({});

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

      {/* DRIVER ADD ITEM */}
      {role === 'driver' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Item"
            value={itemName}
            onChange={e => setItemName(e.target.value)}
          />
          <input
            type="number"
            min="1"
            value={qty}
            style={{ width: 60 }}
            onChange={e => setQty(Number(e.target.value))}
          />
          <input
            type="number"
            min="0"
            placeholder="Est CF"
            value={estimatedCF}
            style={{ width: 80 }}
            onChange={e => setEstimatedCF(Number(e.target.value))}
          />
          <button onClick={handleAdd} disabled={!itemName}>
            Add
          </button>
        </div>
      )}

      {/* INVENTORY LIST */}
      {inventory.length === 0 ? (
        <p>No inventory added.</p>
      ) : (
        <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
          {inventory.map(item => {
            const est = item.estimatedCubicFeet || 0;
            const act = item.actualCubicFeet ?? est;
            const rev = item.revisedCubicFeet || 0;

            const estTotal = est * item.qty;
            const actTotal = act * item.qty;
            const revTotal = rev * item.qty;

            const commissionCF =
              Math.max(act - est, 0) * item.qty;

            return (
              <li key={item.id} style={{ marginBottom: 12 }}>
                <strong>{item.name}</strong> (qty {item.qty})
                <br />

                Est CF: {est} | Total: {estTotal}
                <br />

                Actual CF:{' '}
                {role === 'driver' ? (
                  <input
                    type="number"
                    min="0"
                    value={driverActualCF[item.id] ?? act}
                    style={{ width: 60 }}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setDriverActualCF(prev => ({
                        ...prev,
                        [item.id]: val
                      }));
                      updateItem(item.id, { actualCubicFeet: val });
                    }}
                  />
                ) : (
                  act
                )}{' '}
                | Total: {actTotal}

                {role === 'office' && (
                  <>
                    <br />
                    Revised CF:{' '}
                    <input
                      type="number"
                      min="0"
                      value={officeRevisedCF[item.id] ?? rev}
                      style={{ width: 60 }}
                      onChange={e =>
                        setOfficeRevisedCF(prev => ({
                          ...prev,
                          [item.id]: e.target.value
                        }))
                      }
                      onBlur={() =>
                        updateItem(item.id, {
                          revisedCubicFeet: Number(
                            officeRevisedCF[item.id] || 0
                          )
                        })
                      }
                    />{' '}
                    | Total: {revTotal}
                  </>
                )}

                <br />
                Commission CF: {commissionCF}
              </li>
            );
          })}
        </ul>
      )}

      {/* TOTALS */}
      <div style={{ marginTop: 16 }}>
        <strong>Totals</strong>
        <br />
        Estimated CF: {inventoryTotals.estimatedCubicFeet || 0}
        <br />
        Actual CF: {inventoryTotals.actualCubicFeet || 0}
        <br />
        Revised CF: {inventoryTotals.revisedCubicFeet || 0}
        <br />
        Commission CF: {inventoryTotals.commissionCF || 0}
      </div>
    </div>
  );
}
