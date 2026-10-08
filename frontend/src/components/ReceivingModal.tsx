import React, { useState } from 'react';

interface ReceivingModalProps {
  unitId: string;
  onClose: () => void;
  onRunInspection: (unitId: string, payload: any) => Promise<void>;
}

export const ReceivingModal: React.FC<ReceivingModalProps> = ({ unitId, onClose, onRunInspection }) => {
  const [sku, setSku] = useState('SKU-BLUE-BOTTLE-001');
  const [expectedQty, setExpectedQty] = useState(24);
  const [observedQty, setObservedQty] = useState(24);
  const [variant, setVariant] = useState('Blue');
  const [damage, setDamage] = useState('none');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    setLoading(true);
    const payload = {
      sku,
      expected_qty: expectedQty,
      qty_received: observedQty,
      variant,
      damage,
    };
    try {
      const res = await onRunInspection(unitId, payload);
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>📦 Receiving Manager AI Inspection</h3>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Target Unit: <strong>{unitId}</strong> — Runs Gemini/OpenAI vision inspection & PO quantity comparison.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Expected SKU:</label>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Expected Quantity:</label>
            <input type="number" value={expectedQty} onChange={(e) => setExpectedQty(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Observed Received Quantity:</label>
            <input type="number" value={observedQty} onChange={(e) => setObservedQty(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Observed Carton Damage:</label>
            <select value={damage} onChange={(e) => setDamage(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }}>
              <option value="none">None (Undamaged)</option>
              <option value="crushing">Crushing / Corner dent</option>
              <option value="water">Water / Liquid damage</option>
              <option value="tears">Tears / Puncture</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRun} disabled={loading}>
            {loading ? '⚡ Running Receiving AI Vision Inspection...' : '▶ Run Receiving Inspection'}
          </button>
        </div>

        {result && (
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 800, fontSize: '14px' }}>Inspection Result ({result.evidence?.record_id})</span>
              <span style={{ fontWeight: 800, padding: '4px 10px', borderRadius: '4px', background: result.evidence?.decision?.verdict === 'PASS' ? 'var(--color-pass-bg)' : 'var(--color-fail-bg)', color: result.evidence?.decision?.verdict === 'PASS' ? 'var(--color-pass)' : 'var(--color-fail)' }}>
                {result.evidence?.decision?.verdict}
              </span>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              {result.evidence?.decision?.reason}
            </div>

            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Granular AI Checks
            </div>

            {result.evidence?.checks?.map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '4px' }}>
                <span>{c.check_key} (Expected: {String(c.expected ?? 'N/A')} | Observed: {String(c.observed ?? 'N/A')})</span>
                <strong style={{ color: c.verdict === 'PASS' ? 'var(--color-pass)' : 'var(--color-fail)' }}>{c.verdict}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
