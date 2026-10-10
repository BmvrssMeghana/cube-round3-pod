import React, { useState } from 'react';
import { encodeCapture } from './captureEncoding';
import type { CaptureAttachment } from './CaptureChecklist';

interface RecoveryModalProps {
  unitId: string;
  onClose: () => void;
  onRunInspection: (unitId: string, payload: any) => Promise<any>;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({ unitId, onClose, onRunInspection }) => {
  const [chargeType, setChargeType] = useState('refund_issued_item_not_returned');
  const [amountUSD, setAmountUSD] = useState(45.0);
  const [postedDate, setPostedDate] = useState('2026-10-01');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [reportCsv, setReportCsv] = useState('');
  const [priorReimbursementIds, setPriorReimbursementIds] = useState('');
  const [captures, setCaptures] = useState<CaptureAttachment[]>([]);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setLoading(true);
    const payload = {
      line_id: `CHG-LIVE-${Date.now().toString().slice(-4)}`,
      charge_type: chargeType,
      amount_usd: amountUSD,
      posted_date: postedDate,
      fee_report_csv: reportCsv,
      prior_reimbursements: priorReimbursementIds
        .split(/[\n,]/)
        .map((lineId) => lineId.trim())
        .filter(Boolean),
      captures,
    };
    try {
      setError('');
      const res = await onRunInspection(unitId, payload);
      setResult(res);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Recovery assessment failed.');
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
              AGENT 05 · RECOVERY MANAGER
            </span>
            <h3 className="font-syne font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-[var(--text-primary)] mt-1">
              Financial Dispute &amp; Fee Recovery Engine
            </h3>
          </div>
          <button className="text-neutral-400 hover:text-[var(--text-primary)] text-2xl font-bold font-poppins" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="text-xs font-poppins text-brand-muted">
          Target Unit: <strong className="text-[var(--text-primary)]">{unitId}</strong> — Cross-reference fee entries with upstream evidence records to auto-generate dispute claims.
        </p>

        {/* CSV Upload Container */}
        <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border space-y-2">
          <label className="block text-xs font-poppins uppercase text-blue-400 font-bold">
            Fee / Reimbursement Report CSV (Optional)
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-xs font-poppins text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand-yellow file:text-black hover:file:bg-white cursor-pointer"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (!file) return;
              if (file.size > 8 * 1024 * 1024) {
                setError('CSV file exceeds the 8 MB limit.');
                return;
              }
              void Promise.all([file.text(), encodeCapture(file, 'fee-report')])
                .then(([text, capture]) => {
                  setReportCsv(text);
                  setCaptures([capture]);
                  setError('');
                })
                .catch((readError) => {
                  setError(readError instanceof Error ? readError.message : 'Could not read the CSV file.');
                });
            }}
          />
          {captures[0] && (
            <p className="text-xs font-poppins text-emerald-400">Attached Report: {captures[0].filename}</p>
          )}
          <p className="text-[11px] font-poppins text-brand-muted">
            Expected columns: line_id, unit_id, org_id, charge_type, amount_usd, posted_date, already_reimbursed. Or assess a single charge below.
          </p>
        </div>

        {/* Prior Reimbursement IDs */}
        <div>
          <label htmlFor="prior-reimbursement-ids" className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">
            Previously Reimbursed Charge IDs (Comma or newline separated)
          </label>
          <textarea
            id="prior-reimbursement-ids"
            value={priorReimbursementIds}
            onChange={(event) => setPriorReimbursementIds(event.target.value)}
            rows={2}
            placeholder="CHG-123, CHG-456"
            className="w-full bg-brand-surface border border-brand-border rounded-xl p-3 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Billed Charge Type</label>
            <select
              value={chargeType}
              onChange={(e) => setChargeType(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow cursor-pointer"
            >
              <option value="refund_issued_item_not_returned" className="bg-brand-surface text-[var(--text-primary)]">Item Not Returned Fee ($45)</option>
              <option value="inbound_defect_fee" className="bg-brand-surface text-[var(--text-primary)]">Inbound Defect Fee ($15)</option>
              <option value="lost_inbound" className="bg-brand-surface text-[var(--text-primary)]">Inbound Lost Inventory ($10)</option>
              <option value="damaged_in_warehouse" className="bg-brand-surface text-[var(--text-primary)]">Warehouse Damaged Fee ($20)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Billed Amount ($ USD)</label>
            <input
              type="number"
              step="0.01"
              value={amountUSD}
              onChange={(e) => setAmountUSD(parseFloat(e.target.value) || 0)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="block text-xs font-poppins uppercase text-brand-muted mb-1 font-bold">Posted Date</label>
            <input
              type="date"
              value={postedDate}
              onChange={(e) => setPostedDate(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs font-poppins text-[var(--text-primary)] focus:outline-none focus:border-brand-yellow"
            />
          </div>
        </div>

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
            disabled={loading || !postedDate || amountUSD < 0}
            className="pill-btn px-6 py-2.5 rounded-full bg-brand-yellow text-black font-heading font-extrabold text-xs uppercase hover:bg-white transition-all shadow-md"
          >
            {loading ? 'Assessing Charges…' : 'Run Recovery Assessment'}
          </button>
        </div>

        {result && (
          <div className="p-4 rounded-2xl bg-brand-surface border border-brand-yellow/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-syne font-bold text-sm text-[var(--text-primary)]">
                Recovery Outcome ({result.evidence?.record_id})
              </span>
              <span className="font-poppins text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {result.evidence?.decision?.outcome?.toUpperCase()} (${result.evidence?.payload?.claimable_usd ?? amountUSD} USD)
              </span>
            </div>

            <p className="text-xs text-brand-muted font-poppins">{result.evidence?.decision?.reason}</p>

            <div className="p-3 rounded-xl bg-brand-card border border-brand-border text-xs font-poppins">
              <strong className="text-[var(--text-primary)]">Upstream Evidence Sources:</strong>{' '}
              <span className="text-blue-400">
                {result.evidence?.upstream_refs?.join(', ') || 'No prior stage evidence'}
              </span>
            </div>

            {result.evidence?.payload?.charges?.map((charge: any, index: number) => (
              <div
                key={`${charge.line_id}-${index}`}
                className="p-3 rounded-xl bg-brand-card border border-brand-border text-xs font-poppins space-y-1"
              >
                <div className="flex items-center justify-between text-[var(--text-primary)] font-bold">
                  <span>{charge.line_id}: {charge.position}</span>
                  <span className="text-blue-400">${charge.amount_usd}</span>
                </div>
                <p className="text-brand-muted">{charge.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
