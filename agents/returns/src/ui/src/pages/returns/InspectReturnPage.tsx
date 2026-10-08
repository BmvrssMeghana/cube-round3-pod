import { useEffect, useState } from 'react'
import { decisionsApi, inspectionsApi, returnsApi } from '../../api/client'
import { ErrorMessage } from '../../components/ErrorMessage'
import { ImageBox } from '../../components/ImageBox'
import { InfoRow } from '../../components/InfoRow'
import { Layout } from '../../components/Layout'
import { ReturnStatusBadge } from '../../components/StatusBadge'
import { Spinner } from '../../components/Spinner'
import type { DecisionPayload, FinalDecision, Inspection, Return } from '../../types'
import { InspectionReport } from './InspectionReport'
import { InspectionSummary } from './InspectionSummary'

interface InspectReturnPageProps {
  ret: Return
  onBack: () => void
}

export function InspectReturnPage({ ret: initialRet, onBack }: InspectReturnPageProps) {
  const [ret, setRet] = useState<Return>(initialRet)
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [loadingInspection, setLoadingInspection] = useState(true)
  const [running, setRunning] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [operatorNote, setOperatorNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showEvidence, setShowEvidence] = useState(false)

  useEffect(() => {
    inspectionsApi.get(ret.id)
      .then(setInspection)
      .catch(() => {})
      .finally(() => setLoadingInspection(false))
  }, [ret.id])

  async function runInspection() {
    setRunning(true); setError(null)
    try {
      const result = await inspectionsApi.run(ret.id)
      setInspection(result)
      const updated = await returnsApi.get(ret.id)
      setRet(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Inspection failed')
    } finally { setRunning(false) }
  }

  async function applyDecision(decision: FinalDecision) {
    setDeciding(true); setError(null)
    const payload: DecisionPayload = { decision, operator_note: operatorNote || undefined, decided_by: 'operator' }
    try {
      let updated: Inspection
      if (decision === 'ACCEPTED') updated = await decisionsApi.approve(ret.id, payload)
      else if (decision === 'REJECTED') updated = await decisionsApi.reject(ret.id, payload)
      else updated = await decisionsApi.manualReview(ret.id, payload)
      setInspection(updated)
      const updatedRet = await returnsApi.get(ret.id)
      setRet(updatedRet)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to apply decision')
    } finally { setDeciding(false) }
  }

  const originalSrc = ret.order?.packing_photo_url ?? null
  const returnedSrc = ret.returned_photo_url ?? null
  const hasDecision = !!inspection?.final_decision
  const canDecide   = !!inspection && !hasDecision

  return (
    <Layout
      title={`Return #${ret.id}`}
      subtitle={`Order #${ret.order_id}${ret.order?.product?.name ? ` · ${ret.order.product.name}` : ''}`}
    >
      <button onClick={onBack}
        className="mb-5 text-xs font-bold uppercase tracking-wider text-[var(--accent2)] hover:text-[var(--accent)] flex items-center gap-1.5 transition-colors">
        ← Back to returns
      </button>

      <div className="flex flex-col gap-6">

        {/* Return info */}
        <div className="card-rm p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] mb-4 pb-2 border-b border-[var(--border)]">
            Return Details
          </h3>
          <InfoRow label="Status"    value={<ReturnStatusBadge status={ret.status} />} />
          <InfoRow label="Reason"    value={<span className="capitalize">{ret.reason.replace(/_/g, ' ')}</span>} />
          {ret.reason_description && <InfoRow label="Description" value={ret.reason_description} />}
          <InfoRow label="Customer"  value={ret.order?.customer_name ?? '—'} />
          <InfoRow label="Submitted" value={new Date(ret.created_at).toLocaleString()} />
        </div>

        {/* Image comparison */}
        <div className="card-rm p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] mb-4 pb-2 border-b border-[var(--border)]">
            Image Comparison
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ImageBox label="Original Packing Image" src={originalSrc}
              placeholder="No packing photo — packing manager must upload one." />
            <ImageBox label="Returned Product Image" src={returnedSrc}
              placeholder="No return photo — customer must upload one." />
          </div>

          {/* Analyze button */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={runInspection}
              disabled={running || !returnedSrc || !originalSrc}
              className="btn-primary-rm w-full sm:w-auto px-8 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {running ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  Analyzing…
                </span>
              ) : '⚡ Analyze Return'}
            </button>
            {(!returnedSrc || !originalSrc) && (
              <p className="text-xs text-[var(--amber)] font-medium">
                {!originalSrc && !returnedSrc ? 'Both images required.' : !originalSrc ? 'Missing packing photo.' : 'Missing return photo.'}
              </p>
            )}
          </div>
        </div>

        <ErrorMessage message={error} onDismiss={() => setError(null)} />

        {/* Inspection results */}
        {loadingInspection ? (
          <Spinner label="Loading inspection…" />
        ) : inspection ? (
          <>
            <InspectionSummary inspection={inspection} />

            {/* Evidence toggle */}
            {(inspection.damage.length > 0 || inspection.evidence.length > 0) && (
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className="btn-secondary-rm self-start text-xs font-semibold">
                {showEvidence ? '▲ Hide Evidence Details' : '▼ View Evidence Details'}
              </button>
            )}
            {showEvidence && (
              <div className="card-rm p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] mb-4 pb-2 border-b border-[var(--border)]">
                  Evidence Visuals
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <ImageBox label="Original Packing Image" src={originalSrc} />
                  <ImageBox label="Returned Product Image" src={returnedSrc} />
                </div>
                <ul className="flex flex-col gap-2">
                  {inspection.evidence.map((ev, i) => (
                    <li key={i} className="flex gap-2 text-xs text-[var(--text2)] bg-[var(--bg3)] p-2.5 rounded-md border border-[var(--border)]">
                      <span className="text-[var(--accent2)] font-bold shrink-0">{i + 1}.</span>
                      {ev}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Decision panel */}
            {canDecide && (
              <div className="card-rm p-6 border-l-4 border-l-[var(--accent)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] mb-1">
                  Final Decision
                </h3>
                <p className="text-xs text-[var(--text2)] mb-4">
                  AI recommends:{' '}
                  <span className="text-[var(--text)] font-bold">
                    {inspection.recommendation?.replace(/_/g, ' ') ?? '—'}
                  </span>
                  . The final call is yours.
                </p>

                <textarea value={operatorNote} onChange={(e) => setOperatorNote(e.target.value)} rows={2}
                  placeholder="Optional operator note…"
                  className="w-full rounded-lg bg-[var(--bg3)] border border-[var(--border2)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--accent)] resize-none mb-4 transition-colors" />

                <div className="flex flex-wrap gap-3">
                  <button onClick={() => applyDecision('ACCEPTED')} disabled={deciding}
                    className="flex-1 min-w-[120px] px-4 py-2.5 rounded-lg bg-[var(--green-bg)] border border-[rgba(13,148,136,0.3)] text-[var(--green)] hover:bg-[var(--green)] hover:text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40">
                    ✓ Accept
                  </button>
                  <button onClick={() => applyDecision('MANUAL_REVIEW')} disabled={deciding}
                    className="flex-1 min-w-[120px] px-4 py-2.5 rounded-lg bg-[var(--amber-bg)] border border-[rgba(217,119,6,0.3)] text-[var(--amber)] hover:bg-[var(--amber)] hover:text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40">
                    ⚠ Manual Review
                  </button>
                  <button onClick={() => applyDecision('REJECTED')} disabled={deciding}
                    className="flex-1 min-w-[120px] px-4 py-2.5 rounded-lg bg-[var(--red-bg)] border border-[rgba(224,38,78,0.3)] text-[var(--red)] hover:bg-[var(--red)] hover:text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40">
                    ✗ Reject
                  </button>
                </div>
              </div>
            )}

            {hasDecision && (
              <div className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-5 py-3.5 text-xs text-[var(--text2)] font-semibold uppercase tracking-wider">
                ✓ Decision recorded. No further action required.
              </div>
            )}

            {/* Full report */}
            <InspectionReport
              inspection={inspection}
              ret={ret}
              originalSrc={originalSrc}
              returnedSrc={returnedSrc}
            />
          </>
        ) : (
          <div className="card-rm p-12 text-center border-dashed border-[var(--border2)]">
            <p className="text-xs text-[var(--text3)] uppercase tracking-wider font-semibold">
              No inspection yet. Upload both images and click <span className="text-[var(--accent2)]">⚡ Analyze Return</span>.
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}

