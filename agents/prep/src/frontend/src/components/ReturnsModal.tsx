import React, { useState } from 'react';

interface ReturnsModalProps {
  unitId: string;
  onClose: () => void;
  onRunInspection: (unitId: string, payload: any) => Promise<void>;
}

export const ReturnsModal: React.FC<ReturnsModalProps> = ({ unitId, onClose, onRunInspection }) => {
  const [orderedSku, setOrderedSku] = useState('SKU-BLUE-BOTTLE-001');
  const [returnedSku, setReturnedSku] = useState('SKU-BLUE-BOTTLE-001');
  const [observedState, setObservedState] = useState('factory_sealed');
  const [missingParts, setMissingParts] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    setLoading(true);
    const partsList = missingParts.split(',').map((p) => p.trim()).filter(Boolean);
    const payload = {
      ordered_sku: orderedSku,
      returned_sku: returnedSku,
      observed_state: observedState,
      missing_parts: partsList,
      identity_match: orderedSku === returnedSku ? 'yes' : 'no',
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
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>🔄 Returns Manager Condition & Disposition Inspection</h3>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Target Unit: <strong>{unitId}</strong> — Evaluates returned item SKU match, parts completeness, Amazon condition grading, and assigns disposition.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Original Ordered SKU:</label>
            <input type="text" value={orderedSku} onChange={(e) => setOrderedSku(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Returned Physical SKU:</label>
            <input type="text" value={returnedSku} onChange={(e) => setReturnedSku(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Observed Physical State:</label>
            <select value={observedState} onChange={(e) => setObservedState(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }}>
              <option value="factory_sealed">Factory Sealed (New)</option>
              <option value="opened_good">Opened - Unused (Like New)</option>
              <option value="damaged_box">Damaged Packaging (Refurbish)</option>
              <option value="item_damaged">Physical Damage (Liquidate)</option>
              <option value="defective">Defective / Broken (Dispose)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Missing Components (comma separated):</label>
            <input type="text" value={missingParts} placeholder="e.g. cap, manual (leave empty if complete)" onChange={(e) => setMissingParts(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRun} disabled={loading}>
            {loading ? '⚡ Running Returns Condition & Disposition AI...' : '▶ Run Returns Inspection'}
          </button>
        </div>

        {result && (
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 800, fontSize: '14px' }}>Return Result ({result.evidence?.record_id})</span>
              <span style={{ fontWeight: 800, padding: '4px 10px', borderRadius: '4px', background: 'var(--accent-glow)', color: '#fff' }}>
                Disposition: {result.evidence?.decision?.outcome?.toUpperCase()} (Grade: {result.evidence?.payload?.amazon_condition || 'N/A'})
              </span>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              {result.evidence?.decision?.reason}
            </div>

            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Return Condition Checks
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
