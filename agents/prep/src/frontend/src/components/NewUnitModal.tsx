import React, { useState } from 'react';

interface NewUnitModalProps {
  onClose: () => void;
  onCreateUnit: (unitId: string, route: string, returned: boolean, sku: string, expectedQty: number) => void;
}

export const NewUnitModal: React.FC<NewUnitModalProps> = ({ onClose, onCreateUnit }) => {
  const defaultUnitId = `UNIT-TEST-${Date.now().toString().slice(-4)}`;
  const [unitId, setUnitId] = useState(defaultUnitId);
  const [sku, setSku] = useState('SKU-BLUE-BOTTLE');
  const [expectedQty, setExpectedQty] = useState(10);
  const [route, setRoute] = useState('fba');
  const [returned, setReturned] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId.trim()) return;
    onCreateUnit(unitId, route, returned, sku, expectedQty);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>➕ Create New Live Test Unit Workflow</h3>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Unit Passport Identifier (Unit ID):
            </label>
            <input
              type="text"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Catalog SKU:
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Expected Quantity:
              </label>
              <input
                type="number"
                value={expectedQty}
                onChange={(e) => setExpectedQty(parseInt(e.target.value) || 1)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Pipeline Routing Mode:
              </label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }}
              >
                <option value="fba">FBA (Receiving → Prep → Pack → Shipment)</option>
                <option value="mfn">MFN (Receiving → Pack → Shipment)</option>
                <option value="custom">Custom Full Test (All 5 Agents)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Returned Status:
              </label>
              <select
                value={returned ? 'yes' : 'no'}
                onChange={(e) => setReturned(e.target.value === 'yes')}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }}
              >
                <option value="no">No Return (Normal Delivery)</option>
                <option value="yes">Returned (Triggers Returns & Recovery)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Initialize Test Unit Passport</button>
          </div>
        </form>
      </div>
    </div>
  );
};
