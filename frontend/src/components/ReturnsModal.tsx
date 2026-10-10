import React, { useState } from 'react';
import { CaptureChecklist } from './CaptureChecklist';
import type { CaptureAttachment } from './CaptureChecklist';

interface ReturnsModalProps {
  unitId: string;
  onClose: () => void;
  onRunInspection: (unitId: string, payload: any) => Promise<any>;
}

export const ReturnsModal: React.FC<ReturnsModalProps> = ({ unitId, onClose, onRunInspection }) => {
  const [orderedSku, setOrderedSku] = useState('SKU-BLUE-BOTTLE-001');
  const [returnedSku, setReturnedSku] = useState('SKU-BLUE-BOTTLE-001');
  const [observedState, setObservedState] = useState('factory_sealed');
  const [partsList, setPartsList] = useState('cap; manual');
  const [missingParts, setMissingParts] = useState('');
  const [operatorLabel, setOperatorLabel] = useState('');
  const [captures, setCaptures] = useState<CaptureAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setLoading(true);
    const partsListParsed = missingParts.split(',').map((p) => p.trim()).filter(Boolean);
    const payload = {
      ordered_sku: orderedSku,
      returned_sku: returnedSku,
      observed_state: observedState,
      parts_missing: missingParts.split(';').map((part) => part.trim()).filter(Boolean).join(';'),
      parts_list: partsListParsed,
      identity_match: orderedSku === returnedSku ? 'yes' : 'no',
      operator_label: operatorLabel,
      captures,
    };
    try {
      setError('');
      const res = await onRunInspection(unitId, payload);
      setResult(res);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Returns inspection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-brand-card border-2 border-brand-yellow rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-[var(--text-primary)]">
        <div className="flex items-center justify-between border-b border-brand-border pb-4">
          <div>
            <span className="text-[10px] font-poppins text-blue-400 uppercase tracking-widest block font-bold">
              AGENT 04 · RETURNS MANAGER
            </span>
            <h3 className="font-syne font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-[var(--text-primary)] mt-1">
              Condition &amp; Disposition Inspection
            </h3>
          </div>
          <button className="text-neutral-400 hover:text-[var(--text-primary)] text-2xl font-bold font-poppins" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="text-xs font-poppins text-brand-muted">
          Target Unit: <strong className="text-[var(--text-primary)]">{unitId}</strong> — Evaluate returned physical unit, parts completeness, Amazon condition grading, and disposition.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Original Ordered SKU</label>
            <input
              type="text"
              value={orderedSku}
              onChange={(e) => setOrderedSku(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Returned Physical SKU</label>
            <input
              type="text"
              value={returnedSku}
              onChange={(e) => setReturnedSku(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Observed Physical State</label>
            <select
              value={observedState}
              onChange={(e) => setObservedState(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow cursor-pointer"
            >
              <option value="factory_sealed" className="bg-brand-surface text-[var(--text-primary)]">Factory Sealed (New)</option>
              <option value="opened_good" className="bg-brand-surface text-[var(--text-primary)]">Opened - Unused (Like New)</option>
              <option value="damaged_box" className="bg-brand-surface text-[var(--text-primary)]">Damaged Packaging (Refurbish)</option>
              <option value="item_damaged" className="bg-brand-surface text-[var(--text-primary)]">Physical Damage (Liquidate)</option>
              <option value="defective" className="bg-brand-surface text-[var(--text-primary)]">Defective / Broken (Dispose)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Expected Accessories (; separated)</label>
            <input
              type="text"
              value={partsList}
              placeholder="e.g. cap; manual"
              onChange={(e) => setPartsList(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Missing Accessories (; separated)</label>
            <input
              type="text"
              value={missingParts}
              placeholder="Leave empty if none missing"
              onChange={(e) => setMissingParts(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Operator Label / Station ID</label>
            <input
              type="text"
              value={operatorLabel}
              onChange={(e) => setOperatorLabel(e.target.value)}
              placeholder="e.g. RTN-03 / Operator C. Vance"
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>
        </div>

        <CaptureChecklist
          requiredShots={['Returned item', 'Each accessory', 'Packaging condition', 'Serial / product label']}
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
            disabled={loading || captures.length < 4 || !orderedSku.trim() || !returnedSku.trim()}
            className="pill-btn px-6 py-2.5 rounded-full bg-brand-yellow text-black font-heading font-extrabold text-xs uppercase hover:bg-white transition-all shadow-md"
          >
            {loading ? 'Checking Return…' : 'Run Returns Inspection'}
          </button>
        </div>

        {result && (
          <div className="p-4 rounded-2xl bg-brand-surface border border-brand-yellow/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-syne font-bold text-sm text-[var(--text-primary)]">
                Return Result ({result.evidence?.record_id})
              </span>
              <span className="font-poppins text-xs font-bold px-3 py-1 rounded-full bg-brand-yellow/20 text-blue-400 border border-brand-yellow/30">
                Disposition: {result.evidence?.decision?.outcome?.toUpperCase()} (Grade: {result.evidence?.payload?.amazon_condition || 'N/A'})
              </span>
            </div>

            <p className="text-xs text-brand-muted font-poppins">{result.evidence?.decision?.reason}</p>

            {result.evidence?.payload?.condition_diff && (
              <div className="p-3.5 rounded-xl bg-brand-card border border-purple-500/40 space-y-2 font-poppins text-xs">
                <div className="flex items-center justify-between border-b border-brand-border pb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Priority 3 · Before vs. After Condition Diff (Unit Passport Linked)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    Passport Verified
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1 text-[10px]">
                  <div className="p-2 rounded-lg bg-brand-surface border border-brand-border space-y-1">
                    <strong className="text-emerald-400 block border-b border-brand-border pb-1 uppercase font-extrabold">
                      Outbound Dispatch Baseline
                    </strong>
                    <div>Seal: {result.evidence.payload.condition_diff.outbound_baseline.seal_status}</div>
                    <div>Grade: {result.evidence.payload.condition_diff.outbound_baseline.cosmetic_grade}</div>
                    <div>Accessories: {result.evidence.payload.condition_diff.outbound_baseline.accessories_present}</div>
                    <div>Bundle Ref: <span className="font-mono text-brand-muted">{result.evidence.payload.condition_diff.outbound_baseline.dispatch_bundle_ref}</span></div>
                  </div>
                  <div className="p-2 rounded-lg bg-brand-surface border border-brand-border space-y-1">
                    <strong className="text-amber-400 block border-b border-brand-border pb-1 uppercase font-extrabold">
                      Inbound Return Inspection
                    </strong>
                    <div>Seal: {result.evidence.payload.condition_diff.inbound_return.seal_status}</div>
                    <div>Grade: {result.evidence.payload.condition_diff.inbound_return.cosmetic_grade}</div>
                    <div>Accessories: {result.evidence.payload.condition_diff.inbound_return.accessories_present}</div>
                    <div>Packaging: {result.evidence.payload.condition_diff.inbound_return.packaging_integrity}</div>
                  </div>
                </div>
                <p className="text-[10px] text-brand-muted italic pt-1">
                  Delta Summary: {result.evidence.payload.condition_diff.delta_summary}
                </p>
              </div>
            )}

            {result.evidence?.payload?.disposition_advisor && (
              <div className="p-3.5 rounded-xl bg-brand-card border border-emerald-500/40 space-y-2 font-poppins text-xs">
                <div className="flex items-center justify-between border-b border-brand-border pb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Priority 8 · Disposition & Loss Exposure Advisor
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    {result.evidence.payload.disposition_advisor.claim_eligibility}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-center p-2 rounded-lg bg-brand-surface border border-brand-border">
                  <div>
                    <span className="text-[10px] text-brand-muted block">MSRP Value</span>
                    <strong className="text-[var(--text-primary)]">${result.evidence.payload.disposition_advisor.unit_msrp_usd?.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-brand-muted block">Est. Salvage</span>
                    <strong className="text-emerald-400">${result.evidence.payload.disposition_advisor.estimated_salvage_usd?.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-brand-muted block">Net Loss Exposure</span>
                    <strong className={result.evidence.payload.disposition_advisor.net_loss_exposure_usd > 0 ? 'text-brand-crimson' : 'text-emerald-400'}>
                      ${result.evidence.payload.disposition_advisor.net_loss_exposure_usd?.toFixed(2)}
                    </strong>
                  </div>
                </div>
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-brand-muted uppercase block">Financial Route Options:</span>
                  {result.evidence.payload.disposition_advisor.financial_routes?.map((fr: any, idx: number) => (
                    <div key={idx} className={`flex items-center justify-between text-[10px] p-1.5 rounded border ${
                      fr.recommended ? 'bg-emerald-500/10 border-emerald-500/30 font-bold' : 'bg-brand-surface border-brand-border'
                    }`}>
                      <span>{fr.action} {fr.note ? `(${fr.note})` : ''}</span>
                      <span className="text-emerald-400">Net Recovery: ${fr.recovery_amount?.toFixed(2)} (Fee: ${fr.fee_usd?.toFixed(2)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.evidence?.payload?.specialist_executions?.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="font-poppins text-[10px] uppercase font-bold text-blue-400 tracking-wider block">
                  Specialist Workstreams Orchestration ({result.evidence.payload.specialist_executions.length} Executed)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.evidence.payload.specialist_executions.map((spec: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-brand-card border border-brand-border text-[11px] font-poppins space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-[var(--text-primary)]">{spec.specialist_id} · {spec.name}</strong>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {spec.status} · {spec.latency_ms}ms
                        </span>
                      </div>
                      <p className="text-[10px] text-brand-muted">{spec.output}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1 pt-2">
              <span className="font-poppins text-[10px] uppercase font-bold text-brand-muted tracking-wider block">
                Condition Checks ({result.evidence?.checks?.length || 0})
              </span>
              {result.evidence?.checks?.map((c: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs font-poppins p-2 rounded-lg bg-brand-card border border-brand-border"
                >
                  <span className="text-[var(--text-secondary)]">
                    {c.check_key} (Exp: {String(c.expected ?? 'N/A')} | Obs: {String(c.observed ?? 'N/A')})
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
