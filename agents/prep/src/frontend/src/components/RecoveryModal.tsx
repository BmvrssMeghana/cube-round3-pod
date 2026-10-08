import React, { useState } from 'react';

interface RecoveryModalProps {
  unitId: string;
  onClose: () => void;
  onRunInspection: (unitId: string, payload: any) => Promise<void>;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({ unitId, onClose, onRunInspection }) => {
  const [chargeType, setChargeType] = useState('refund_issued_item_not_returned');
  const [amountUSD, setAmountUSD] = useState(45.0);
  const [postedDate, setPostedDate] = useState('2026-10-01');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    setLoading(true);
    const payload = {
      line_id: `CHG-LIVE-${Date.now().toString().slice(-4)}`,
      charge_type: chargeType,
      amount_usd: amountUSD,
      posted_date: postedDate,
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
      <div className="modal-content" style={{ maxWidth: '750px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>💰 Recovery Manager Financial Dispute Classifier</h3>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Target Unit: <strong>{unitId}</strong> — Reasons over accumulated upstream evidence (Receiving, Prep, Pack, Returns) to dispute invalid charges.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Billed Charge Type:</label>
            <select value={chargeType} onChange={(e) => setChargeType(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }}>
              <option value="refund_issued_item_not_returned">Item Not Returned Fee ($45)</option>
              <option value="inbound_defect_fee">Inbound Defect Fee ($15)</option>
              <option value="lost_inbound">Inbound Lost Inventory ($10)</option>
              <option value="damaged_in_warehouse">Warehouse Damaged Fee ($20)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Billed Amount ($ USD):</label>
            <input type="number" step="0.01" value={amountUSD} onChange={(e) => setAmountUSD(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRun} disabled={loading}>
            {loading ? '⚡ Running Recovery Classifier & SLA Engine...' : '▶ Run Recovery Dispute Classifier'}
          </button>
        </div>

        {result && (
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 800, fontSize: '14px' }}>Recovery Outcome ({result.evidence?.record_id})</span>
              <span style={{ fontWeight: 800, padding: '4px 10px', borderRadius: '4px', background: 'var(--color-pass-bg)', color: 'var(--color-pass)' }}>
                {result.evidence?.decision?.outcome?.toUpperCase()} (${result.evidence?.payload?.claimable_usd ?? amountUSD} USD)
              </span>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              {result.evidence?.decision?.reason}
            </div>

            {/* Upstream Evidence References Cited */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px' }}>
              <strong>🔗 Cited Upstream Evidence Records:</strong> {result.evidence?.upstream_refs?.join(', ') || 'None'}
            </div>

            {/* SHA256 Hash */}
            {result.evidence?.payload?.charges?.[0]?.sha256_hash && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                🔒 Tamper-Evident SHA-256 Hash: {result.evidence.payload.charges[0].sha256_hash}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
