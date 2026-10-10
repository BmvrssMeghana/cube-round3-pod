import React, { useState } from 'react';
import { CaptureChecklist } from './CaptureChecklist';
import type { CaptureAttachment } from './CaptureChecklist';

interface PackModalProps {
  unitId: string;
  onClose: () => void;
  onRunInspection: (unitId: string, payload: any) => Promise<any>;
}

export const PackModal: React.FC<PackModalProps> = ({ unitId, onClose, onRunInspection }) => {
  const [orderLines, setOrderLines] = useState('SKU-BLUE-BOTTLE-001:1');
  const [observedItems, setObservedItems] = useState('SKU-BLUE-BOTTLE-001:1');
  const [lookAlike, setLookAlike] = useState(false);
  const [operatorLabel, setOperatorLabel] = useState('');
  const [captures, setCaptures] = useState<CaptureAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setLoading(true);
    const payload = {
      order_id: `ORD-PACK-${unitId}`,
      order_lines: orderLines,
      observed_in_box: observedItems,
      look_alike: lookAlike,
      operator_label: operatorLabel,
      operator_verdict: 'review',
      captures,
    };
    try {
      setError('');
      const res = await onRunInspection(unitId, payload);
      setResult(res);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Pack inspection failed.');
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
              AGENT 03 · PACK MANAGER (MFN)
            </span>
            <h3 className="font-syne font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-[var(--text-primary)] mt-1">
              Carton Content &amp; Manifest Verification
            </h3>
          </div>
          <button className="text-neutral-400 hover:text-[var(--text-primary)] text-2xl font-bold font-poppins" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="text-xs font-poppins text-brand-muted">
          Target Unit: <strong className="text-[var(--text-primary)]">{unitId}</strong> — Compare open-box contents against expected order manifest prior to sealing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">
              Expected Order Lines (SKU:qty; ...)
            </label>
            <textarea
              rows={3}
              value={orderLines}
              onChange={(e) => setOrderLines(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl p-3 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">
              Observed Items in Box (SKU:qty; ...)
            </label>
            <textarea
              rows={3}
              value={observedItems}
              onChange={(e) => setObservedItems(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl p-3 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              id="pack-lookalike"
              type="checkbox"
              checked={lookAlike}
              onChange={(e) => setLookAlike(e.target.checked)}
              className="w-4 h-4 rounded border-brand-border bg-brand-surface text-blue-400 focus:ring-brand-yellow"
            />
            <label htmlFor="pack-lookalike" className="text-xs font-poppins text-[var(--text-primary)] cursor-pointer">
              Look-alike / Identity unverified
            </label>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Operator Label / Station ID</label>
            <input
              type="text"
              value={operatorLabel}
              onChange={(e) => setOperatorLabel(e.target.value)}
              placeholder="e.g. PACK-01 / Operator M. Davis"
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>
        </div>

        <CaptureChecklist
          requiredShots={['Top-down open-box contents']}
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
            disabled={loading || captures.length < 1 || !orderLines.trim() || !observedItems.trim()}
            className="pill-btn px-6 py-2.5 rounded-full bg-brand-yellow text-black font-heading font-extrabold text-xs uppercase hover:bg-white transition-all shadow-md"
          >
            {loading ? 'Reconciling Order…' : 'Run Pack Verification'}
          </button>
        </div>

        {result && (
          <div className="p-4 rounded-2xl bg-brand-surface border border-brand-yellow/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-syne font-bold text-sm text-[var(--text-primary)]">
                Pack Result ({result.evidence?.record_id})
              </span>
              <span
                className={`font-poppins text-xs font-bold px-3 py-1 rounded-full ${
                  result.evidence?.decision?.outcome === 'seal'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-brand-crimson/20 text-brand-crimson border border-brand-crimson/30'
                }`}
              >
                Decision: {result.evidence?.decision?.outcome?.toUpperCase()} ({result.evidence?.decision?.verdict})
              </span>
            </div>

            <p className="text-xs text-brand-muted font-poppins">{result.evidence?.decision?.reason}</p>

            {result.evidence?.payload?.shipment_readiness_gate && (
              <div className="p-3.5 rounded-xl bg-brand-card border border-emerald-500/40 space-y-2 font-poppins">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Priority 2 · Shipment Readiness Gate
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {result.evidence.payload.shipment_readiness_gate.gate_verdict}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] font-medium">
                  Conveyor Action: <strong className="text-emerald-400">{result.evidence.payload.shipment_readiness_gate.conveyor_action}</strong>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {result.evidence.payload.shipment_readiness_gate.gate_checks?.map((gc: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-brand-surface border border-brand-border">
                      <span className="text-[var(--text-secondary)]">{gc.criterion}</span>
                      <strong className={gc.status === 'PASS' ? 'text-emerald-400' : 'text-amber-400'}>{gc.status}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.evidence?.payload?.dispatch_evidence_bundle && (
              <div className="p-3.5 rounded-xl bg-brand-card border border-blue-500/40 space-y-2 font-poppins text-xs">
                <div className="flex items-center justify-between border-b border-brand-border pb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    Priority 5 · Dispatch Evidence Bundle
                  </span>
                  <span className="text-[10px] font-mono text-brand-muted">
                    {result.evidence.payload.dispatch_evidence_bundle.bundle_id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>Pre-Seal Hash: <strong className="font-mono text-emerald-400">{result.evidence.payload.dispatch_evidence_bundle.pre_seal_snapshot_hash}</strong></div>
                  <div>Tracking Ref: <strong className="text-[var(--text-primary)]">{result.evidence.payload.dispatch_evidence_bundle.carrier_tracking_ref}</strong></div>
                  <div>Gross / Tare Wt: <strong className="text-[var(--text-primary)]">{result.evidence.payload.dispatch_evidence_bundle.gross_weight_kg} kg / {result.evidence.payload.dispatch_evidence_bundle.tare_weight_kg} kg</strong></div>
                  <div>Box Spec: <strong className="text-[var(--text-primary)]">{result.evidence.payload.dispatch_evidence_bundle.box_specification}</strong></div>
                </div>
                <p className="text-[10px] text-brand-muted italic pt-1">
                  🔒 {result.evidence.payload.dispatch_evidence_bundle.retention_policy}
                </p>
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
                Reconciliation Checks ({result.evidence?.checks?.length || 0})
              </span>
              {result.evidence?.checks?.map((c: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs font-poppins p-2 rounded-lg bg-brand-card border border-brand-border"
                >
                  <span className="text-[var(--text-secondary)]">
                    {c.check_key} (Exp: {JSON.stringify(c.expected)} | Obs: {JSON.stringify(c.observed)})
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
