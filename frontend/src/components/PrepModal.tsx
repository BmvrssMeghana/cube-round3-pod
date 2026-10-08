import React, { useState } from 'react';

interface PrepModalProps {
  unitId: string;
  onClose: () => void;
  onRunInspection: (unitId: string, payload: any) => Promise<void>;
}

export const PrepModal: React.FC<PrepModalProps> = ({ unitId, onClose, onRunInspection }) => {
  const [polybagSealed, setPolybagSealed] = useState('yes');
  const [suffocationWarning, setSuffocationWarning] = useState('legible');
  const [fnskuPlacement, setFnskuPlacement] = useState('flat');
  const [barcodeCovered, setBarcodeCovered] = useState('yes');
  const [scaleWeightOz, setScaleWeightOz] = useState(14.2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    setLoading(true);
    const payload = {
      polybag_present_sealed: polybagSealed,
      suffocation_warning: suffocationWarning,
      fnsku_label_placement: fnskuPlacement,
      original_barcode_covered: barcodeCovered,
      measurements: { weight_oz: scaleWeightOz, dimensions_in: [8.0, 5.0, 2.5] },
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
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>🏷️ Prep Manager Packaging Inspection</h3>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Target Unit: <strong>{unitId}</strong> — Evaluates polybag seal, suffocation text, FNSKU placement, barcode coverage, and physical scale weight.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Polybag Seal Status:</label>
            <select value={polybagSealed} onChange={(e) => setPolybagSealed(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }}>
              <option value="yes">Yes (Sealed & 1.5mil Compliant)</option>
              <option value="not_sealed">Not Sealed / Open Edge</option>
              <option value="missing">Missing Polybag</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Suffocation Warning Text:</label>
            <select value={suffocationWarning} onChange={(e) => setSuffocationWarning(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }}>
              <option value="legible">Legible & Visible</option>
              <option value="obscured_by_fold">Obscured by Fold / Crease</option>
              <option value="missing">Missing Suffocation Label</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>FNSKU Label Placement:</label>
            <select value={fnskuPlacement} onChange={(e) => setFnskuPlacement(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }}>
              <option value="flat">Flat on Smooth Surface</option>
              <option value="on_seam">Applied over Polybag Seam</option>
              <option value="on_curve">Applied over Curved Surface</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Physical Scale Weight (oz):</label>
            <input type="number" step="0.1" value={scaleWeightOz} onChange={(e) => setScaleWeightOz(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRun} disabled={loading}>
            {loading ? '⚡ Running Prep Rule & Vision Inspection...' : '▶ Run Prep Inspection'}
          </button>
        </div>

        {result && (
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 800, fontSize: '14px' }}>Prep Inspection Result ({result.evidence?.record_id})</span>
              <span style={{ fontWeight: 800, padding: '4px 10px', borderRadius: '4px', background: result.evidence?.decision?.verdict === 'PASS' ? 'var(--color-pass-bg)' : 'var(--color-fail-bg)', color: result.evidence?.decision?.verdict === 'PASS' ? 'var(--color-pass)' : 'var(--color-fail)' }}>
                {result.evidence?.decision?.verdict}
              </span>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              {result.evidence?.decision?.reason}
            </div>

            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Packaging Compliance Checks
            </div>

            {result.evidence?.checks?.map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '4px' }}>
                <span>{c.check_key} ({String(c.observed ?? 'N/A')})</span>
                <strong style={{ color: c.verdict === 'PASS' ? 'var(--color-pass)' : 'var(--color-fail)' }}>{c.verdict}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
