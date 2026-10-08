import React, { useState } from 'react';

interface PackModalProps {
  unitId: string;
  onClose: () => void;
  onRunInspection: (unitId: string, payload: any) => Promise<void>;
}

export const PackModal: React.FC<PackModalProps> = ({ unitId, onClose, onRunInspection }) => {
  const [expectedSku, setExpectedSku] = useState('SKU-BLUE-BOTTLE-001');
  const [expectedQty, setExpectedQty] = useState(1);
  const [detectedSku, setDetectedSku] = useState('SKU-BLUE-BOTTLE-001');
  const [detectedQty, setDetectedQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    setLoading(true);
    const expectedItems = [{ sku: expectedSku, name: expectedSku, quantity: expectedQty }];
    const detectedItems = [{ sku: detectedSku, name: detectedSku, quantity: detectedQty, confidence: 0.96, box_2d: [0.1, 0.1, 0.5, 0.5] }];
    
    const payload = {
      order_id: `ORD-PACK-${unitId}`,
      expected_items: expectedItems,
      detected_items: detectedItems,
      order_lines: `${expectedSku}:${expectedQty}`,
      observed_in_box: `${detectedSku}:${detectedQty}`,
      operator_verdict: expectedSku === detectedSku && expectedQty === detectedQty ? 'seal' : 'stop_and_fix',
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
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>📦 Pack Manager Carton Content Verification</h3>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Target Unit: <strong>{unitId}</strong> — Runs Claude Vision 2D bounding box item detection & manifest reconciliation.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Expected Order Line SKU:</label>
            <input type="text" value={expectedSku} onChange={(e) => setExpectedSku(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Expected Quantity:</label>
            <input type="number" value={expectedQty} onChange={(e) => setExpectedQty(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>AI Detected SKU in Carton:</label>
            <input type="text" value={detectedSku} onChange={(e) => setDetectedSku(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>AI Detected Quantity:</label>
            <input type="number" value={detectedQty} onChange={(e) => setDetectedQty(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRun} disabled={loading}>
            {loading ? '⚡ Running Claude 2D Box Content Reconciliation...' : '▶ Run Pack Verification'}
          </button>
        </div>

        {result && (
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 800, fontSize: '14px' }}>Pack Result ({result.evidence?.record_id})</span>
              <span style={{ fontWeight: 800, padding: '4px 10px', borderRadius: '4px', background: result.evidence?.decision?.outcome === 'seal' ? 'var(--color-pass-bg)' : 'var(--color-fail-bg)', color: result.evidence?.decision?.outcome === 'seal' ? 'var(--color-pass)' : 'var(--color-fail)' }}>
                Decision: {result.evidence?.decision?.outcome?.toUpperCase()} ({result.evidence?.decision?.verdict})
              </span>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              {result.evidence?.decision?.reason}
            </div>

            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Reconciliation Checks
            </div>

            {result.evidence?.checks?.map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '4px' }}>
                <span>{c.check_key} (Expected: {JSON.stringify(c.expected)} | Observed: {JSON.stringify(c.observed)})</span>
                <strong style={{ color: c.verdict === 'PASS' ? 'var(--color-pass)' : 'var(--color-fail)' }}>{c.verdict}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
