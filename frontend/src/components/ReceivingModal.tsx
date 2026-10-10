import React, { useState } from 'react';
import { CaptureChecklist } from './CaptureChecklist';
import type { CaptureAttachment } from './CaptureChecklist';

interface ReceivingModalProps {
  unitId: string;
  onClose: () => void;
  onRunInspection: (unitId: string, payload: any) => Promise<any>;
}

export const ReceivingModal: React.FC<ReceivingModalProps> = ({ unitId, onClose, onRunInspection }) => {
  const [sku, setSku] = useState('SKU-BLUE-BOTTLE-001');
  const [expectedQty, setExpectedQty] = useState(24);
  const [observedQty, setObservedQty] = useState(24);
  const [variant, setVariant] = useState('Blue');
  const [damage, setDamage] = useState('none');
  const [observedVariant, setObservedVariant] = useState('Blue');
  const [cartonsExpected, setCartonsExpected] = useState(1);
  const [cartonsReceived, setCartonsReceived] = useState(1);
  const [unitsPerCartonExpected, setUnitsPerCartonExpected] = useState(24);
  const [unitsPerCartonCounted, setUnitsPerCartonCounted] = useState(24);
  const [identityMatch, setIdentityMatch] = useState('yes');
  const [unitDamage, setUnitDamage] = useState('none');
  const [operatorLabel, setOperatorLabel] = useState('');
  const [captures, setCaptures] = useState<CaptureAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setLoading(true);
    const payload = {
      sku,
      expected_qty: expectedQty,
      observed_qty: observedQty,
      expected_variant: variant,
      observed_variant: observedVariant,
      cartons_ordered: cartonsExpected,
      cartons_received: cartonsReceived,
      units_per_carton_ordered: unitsPerCartonExpected,
      units_per_carton_counted: unitsPerCartonCounted,
      identity_match: identityMatch,
      carton_damage: damage,
      unit_damage: unitDamage,
      operator_label: operatorLabel,
      captures,
    };
    try {
      setError('');
      const res = await onRunInspection(unitId, payload);
      setResult(res);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Receiving inspection failed.');
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
              AGENT 01 · RECEIVING MANAGER
            </span>
            <h3 className="font-syne font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-[var(--text-primary)] mt-1">
              Inbound Dock Inspection
            </h3>
          </div>
          <button className="text-neutral-400 hover:text-[var(--text-primary)] text-2xl font-bold font-poppins" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="text-xs font-poppins text-brand-muted">
          Target Unit: <strong className="text-[var(--text-primary)]">{unitId}</strong> — Record PO, identity match, carton count, and damage evidence.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Expected SKU</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Expected Quantity</label>
            <input
              type="number"
              value={expectedQty}
              onChange={(e) => setExpectedQty(parseInt(e.target.value) || 0)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Observed Quantity</label>
            <input
              type="number"
              min="0"
              value={observedQty}
              onChange={(e) => setObservedQty(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Expected Variant</label>
            <input
              type="text"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Observed Variant</label>
            <input
              type="text"
              value={observedVariant}
              onChange={(e) => setObservedVariant(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Expected / Received Cartons</label>
            <div className="flex gap-2">
              <input
                aria-label="Expected cartons"
                type="number"
                min="0"
                value={cartonsExpected}
                onChange={(e) => setCartonsExpected(parseInt(e.target.value, 10) || 0)}
                className="w-1/2 bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
              />
              <input
                aria-label="Received cartons"
                type="number"
                min="0"
                value={cartonsReceived}
                onChange={(e) => setCartonsReceived(parseInt(e.target.value, 10) || 0)}
                className="w-1/2 bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Units / Carton (Exp / Counted)</label>
            <div className="flex gap-2">
              <input
                aria-label="Expected units per carton"
                type="number"
                min="0"
                value={unitsPerCartonExpected}
                onChange={(e) => setUnitsPerCartonExpected(parseInt(e.target.value, 10) || 0)}
                className="w-1/2 bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
              />
              <input
                aria-label="Counted units per carton"
                type="number"
                min="0"
                value={unitsPerCartonCounted}
                onChange={(e) => setUnitsPerCartonCounted(parseInt(e.target.value, 10) || 0)}
                className="w-1/2 bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">SKU / ASIN Identity</label>
            <select
              value={identityMatch}
              onChange={(e) => setIdentityMatch(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow cursor-pointer"
            >
              <option value="yes" className="bg-brand-surface text-[var(--text-primary)]">Matches purchase order</option>
              <option value="no" className="bg-brand-surface text-[var(--text-primary)]">Does not match</option>
              <option value="uncertain" className="bg-brand-surface text-[var(--text-primary)]">Unreadable / uncertain</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Carton Damage</label>
            <select
              value={damage}
              onChange={(e) => setDamage(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow cursor-pointer"
            >
              <option value="none" className="bg-brand-surface text-[var(--text-primary)]">None (Undamaged)</option>
              <option value="crushing" className="bg-brand-surface text-[var(--text-primary)]">Crushing / Corner dent</option>
              <option value="water" className="bg-brand-surface text-[var(--text-primary)]">Water / Liquid damage</option>
              <option value="tears" className="bg-brand-surface text-[var(--text-primary)]">Tears / Puncture</option>
              <option value="uncertain" className="bg-brand-surface text-[var(--text-primary)]">Area not visible / uncertain</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Unit Damage</label>
            <select
              value={unitDamage}
              onChange={(e) => setUnitDamage(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow cursor-pointer"
            >
              <option value="none" className="bg-brand-surface text-[var(--text-primary)]">None</option>
              <option value="crushing" className="bg-brand-surface text-[var(--text-primary)]">Crushed</option>
              <option value="water" className="bg-brand-surface text-[var(--text-primary)]">Water damaged</option>
              <option value="tears" className="bg-brand-surface text-[var(--text-primary)]">Torn / punctured</option>
              <option value="uncertain" className="bg-brand-surface text-[var(--text-primary)]">Not fully visible</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Operator Label / Station ID</label>
            <input
              type="text"
              value={operatorLabel}
              onChange={(e) => setOperatorLabel(e.target.value)}
              placeholder="e.g. DOCK-04 / Operator J. Smith"
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>
        </div>

        <CaptureChecklist
          requiredShots={['Carton exterior', 'PO / SKU label', 'Product and variant', 'Damage close-up']}
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
            disabled={loading || captures.length < 4 || !sku.trim() || expectedQty < 1}
            className="pill-btn px-6 py-2.5 rounded-full bg-brand-yellow text-black font-heading font-extrabold text-xs uppercase hover:bg-white transition-all shadow-md"
          >
            {loading ? 'Evaluating Evidence…' : 'Run Receiving Inspection'}
          </button>
        </div>

        {result && (
          <div className="p-4 rounded-2xl bg-brand-surface border border-blue-500/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-syne font-bold text-sm text-[var(--text-primary)]">
                Receiving Result ({result.evidence?.record_id})
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

            {result.evidence?.payload?.intake_risk && (
              <div className="p-3.5 rounded-xl bg-brand-card border border-amber-500/40 space-y-2 font-poppins">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Priority 6 · Evidence Completeness & Intake Risk Score
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {result.evidence.payload.intake_risk.risk_level} ({result.evidence.payload.intake_risk.risk_score_pct}%)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-secondary)]">
                  <div>Completeness Grade: <strong className="text-[var(--text-primary)]">{result.evidence.payload.intake_risk.completeness_grade} ({result.evidence.payload.intake_risk.completeness_pct}%)</strong></div>
                  <div>Recommended Routing: <strong className="text-emerald-400">{result.evidence.payload.intake_risk.recommended_routing}</strong></div>
                </div>
                {result.evidence.payload.intake_risk.risk_factors?.length > 0 && (
                  <ul className="text-[10px] list-disc list-inside text-brand-muted space-y-0.5 pt-1">
                    {result.evidence.payload.intake_risk.risk_factors.map((rf: string, idx: number) => (
                      <li key={idx}>{rf}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {result.evidence?.payload?.reconciliation_matrix && (
              <div className="space-y-2 pt-1">
                <span className="font-poppins text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  Priority 1 · Expected vs. Observed Reconciliation Matrix
                </span>
                <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-card">
                  <table className="w-full text-[11px] font-poppins text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-border bg-brand-surface text-brand-muted uppercase text-[10px]">
                        <th className="p-2">Attribute</th>
                        <th className="p-2">PO Expected</th>
                        <th className="p-2">Dock Observed</th>
                        <th className="p-2">Variance</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border text-[var(--text-primary)]">
                      {result.evidence.payload.reconciliation_matrix.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-brand-surface/50">
                          <td className="p-2 font-medium">{row.attribute}</td>
                          <td className="p-2 text-brand-muted">{row.expected}</td>
                          <td className="p-2 text-[var(--text-primary)]">{row.observed}</td>
                          <td className="p-2 text-brand-muted">{row.variance}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.status === 'MATCH' || row.status === 'INTACT'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                Granular Checks ({result.evidence?.checks?.length || 0})
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
