import React, { useState } from 'react';
import { CaptureChecklist } from './CaptureChecklist';
import type { CaptureAttachment } from './CaptureChecklist';

interface PrepModalProps {
  unitId: string;
  onClose: () => void;
  onRunInspection: (unitId: string, payload: any) => Promise<any>;
}

export const PrepModal: React.FC<PrepModalProps> = ({ unitId, onClose, onRunInspection }) => {
  const [polybagSealed, setPolybagSealed] = useState('yes');
  const [suffocationWarning, setSuffocationWarning] = useState('legible');
  const [fnskuPlacement, setFnskuPlacement] = useState('flat');
  const [barcodeCovered, setBarcodeCovered] = useState('yes');
  const [scaleWeightOz, setScaleWeightOz] = useState(14.2);
  const [expiryDate, setExpiryDate] = useState('not_required');
  const [handlingMarks, setHandlingMarks] = useState('all_present');
  const [category, setCategory] = useState('general');
  const [fnsku, setFnsku] = useState('');
  const [operatorLabel, setOperatorLabel] = useState('');
  const [captures, setCaptures] = useState<CaptureAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setLoading(true);
    const payload = {
      polybag_present_sealed: polybagSealed,
      suffocation_warning: suffocationWarning,
      fnsku_label_placement: fnskuPlacement,
      original_barcode_covered: barcodeCovered,
      expiry_date: expiryDate,
      handling_marks: handlingMarks,
      category,
      fnsku,
      operator_label: operatorLabel,
      measurements: { weight_oz: scaleWeightOz },
      captures,
    };
    try {
      setError('');
      const res = await onRunInspection(unitId, payload);
      setResult(res);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Prep inspection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-brand-card border-2 border-brand-yellow rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-[var(--text-primary)]">
        <div className="flex items-center justify-between border-b border-brand-border pb-4">
          <div>
            <span className="text-[10px] font-poppins text-brand-yellow uppercase tracking-widest block font-bold">
              AGENT 02 · PREP MANAGER (FBA)
            </span>
            <h3 className="font-syne font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-[var(--text-primary)] mt-1">
              Packaging &amp; Label Compliance Inspection
            </h3>
          </div>
          <button className="text-neutral-400 hover:text-[var(--text-primary)] text-2xl font-bold font-poppins" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="text-xs font-poppins text-brand-muted">
          Target Unit: <strong className="text-[var(--text-primary)]">{unitId}</strong> — Verify polybag seal, suffocation warning, FNSKU, barcode coverage, and scale weight.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Polybag Seal Status</label>
            <select
              value={polybagSealed}
              onChange={(e) => setPolybagSealed(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow cursor-pointer"
            >
              <option value="yes" className="bg-brand-surface text-[var(--text-primary)]">Yes (Sealed &amp; 1.5mil Compliant)</option>
              <option value="not_sealed" className="bg-brand-surface text-[var(--text-primary)]">Not Sealed / Open Edge</option>
              <option value="missing" className="bg-brand-surface text-[var(--text-primary)]">Missing Polybag</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Suffocation Warning Text</label>
            <select
              value={suffocationWarning}
              onChange={(e) => setSuffocationWarning(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow cursor-pointer"
            >
              <option value="legible" className="bg-brand-surface text-[var(--text-primary)]">Legible &amp; Visible</option>
              <option value="obscured_by_fold" className="bg-brand-surface text-[var(--text-primary)]">Obscured by Fold / Crease</option>
              <option value="missing" className="bg-brand-surface text-[var(--text-primary)]">Missing Suffocation Label</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">FNSKU Label Placement</label>
            <select
              value={fnskuPlacement}
              onChange={(e) => setFnskuPlacement(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow cursor-pointer"
            >
              <option value="flat" className="bg-brand-surface text-[var(--text-primary)]">Flat on Smooth Surface</option>
              <option value="on_seam" className="bg-brand-surface text-[var(--text-primary)]">Applied over Polybag Seam</option>
              <option value="on_curve" className="bg-brand-surface text-[var(--text-primary)]">Applied over Curved Surface</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Original Barcode</label>
            <select
              value={barcodeCovered}
              onChange={(e) => setBarcodeCovered(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow cursor-pointer"
            >
              <option value="yes" className="bg-brand-surface text-[var(--text-primary)]">Covered by FNSKU</option>
              <option value="no" className="bg-brand-surface text-[var(--text-primary)]">Still visible</option>
              <option value="uncertain" className="bg-brand-surface text-[var(--text-primary)]">Cannot verify</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">FNSKU</label>
            <input
              type="text"
              value={fnsku}
              onChange={(e) => setFnsku(e.target.value)}
              placeholder="e.g. X001234567"
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Prep Rule Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow cursor-pointer"
            >
              <option value="general" className="bg-brand-surface text-[var(--text-primary)]">General — prep_requirements.json</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Expiry Visibility</label>
            <select
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow cursor-pointer"
            >
              <option value="not_required" className="bg-brand-surface text-[var(--text-primary)]">Not required by prep sheet</option>
              <option value="legible" className="bg-brand-surface text-[var(--text-primary)]">Visible and legible</option>
              <option value="illegible_after_wrap" className="bg-brand-surface text-[var(--text-primary)]">Covered / illegible</option>
              <option value="uncertain" className="bg-brand-surface text-[var(--text-primary)]">Cannot verify</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Required Handling Marks</label>
            <select
              value={handlingMarks}
              onChange={(e) => setHandlingMarks(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow cursor-pointer"
            >
              <option value="all_present" className="bg-brand-surface text-[var(--text-primary)]">All present</option>
              <option value="some_missing" className="bg-brand-surface text-[var(--text-primary)]">Some missing</option>
              <option value="not_required" className="bg-brand-surface text-[var(--text-primary)]">Not required by prep sheet</option>
              <option value="uncertain" className="bg-brand-surface text-[var(--text-primary)]">Cannot verify</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Scale Weight (oz)</label>
            <input
              type="number"
              step="0.1"
              value={scaleWeightOz}
              onChange={(e) => setScaleWeightOz(parseFloat(e.target.value) || 0)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Operator Label / Station ID</label>
            <input
              type="text"
              value={operatorLabel}
              onChange={(e) => setOperatorLabel(e.target.value)}
              placeholder="e.g. PREP-02 / Operator S. Lee"
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>
        </div>

        <CaptureChecklist
          requiredShots={['Product front', 'FNSKU label', 'Warning label', 'Seal edge', 'Expiry date', 'Handling marks']}
          value={captures}
          onChange={setCaptures}
        />

        {error && <p className="font-poppins text-xs text-brand-crimson">{error}</p>}

        <div className="pt-4 flex items-center justify-end space-x-3 border-t border-brand-border">
          <button
            type="button"
            className="px-5 py-2.5 rounded-full border border-neutral-700 text-xs font-heading font-bold uppercase hover:bg-neutral-800 text-[var(--text-primary)]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRun}
            disabled={loading || captures.length < 6}
            className="pill-btn px-6 py-2.5 rounded-full bg-brand-yellow text-black font-heading font-extrabold text-xs uppercase hover:bg-white transition-all shadow-md"
          >
            {loading ? 'Evaluating Rules…' : 'Run Prep Inspection'}
          </button>
        </div>

        {result && (
          <div className="p-4 rounded-2xl bg-brand-surface border border-brand-yellow/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-syne font-bold text-sm text-[var(--text-primary)]">
                Prep Inspection Result ({result.evidence?.record_id})
              </span>
              <span
                className={`font-poppins text-xs font-bold px-3 py-1 rounded-full ${
                  result.evidence?.decision?.verdict === 'PASS'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-brand-crimson/20 text-brand-crimson border border-brand-crimson/30'
                }`}
              >
                {result.evidence?.decision?.verdict}
              </span>
            </div>

            <p className="text-xs text-brand-muted font-poppins">{result.evidence?.decision?.reason}</p>

            <div className="space-y-1 pt-2">
              <span className="font-poppins text-[10px] uppercase font-bold text-brand-muted tracking-wider block">
                Packaging Compliance Checks ({result.evidence?.checks?.length || 0})
              </span>
              {result.evidence?.checks?.map((c: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs font-poppins p-2 rounded-lg bg-brand-card border border-brand-border"
                >
                  <span className="text-[var(--text-secondary)]">
                    {c.check_key} ({String(c.observed ?? 'N/A')})
                  </span>
                  <strong className={c.verdict === 'PASS' ? 'text-emerald-400' : 'text-brand-crimson'}>
                    {c.verdict}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
