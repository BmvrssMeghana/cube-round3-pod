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
        className="mb-5 text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white flex items-center gap-2 transition-colors">
        ← Back to returns
      </button>

      <div className="flex flex-col gap-5">

        {/* Return info */}
        <div className="rounded-2xl card-red p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(180,0,0,0.2),transparent_70%)] pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Return Details</p>
            <InfoRow label="Status"    value={<ReturnStatusBadge status={ret.status} />} />
            <InfoRow label="Reason"    value={<span className="capitalize">{ret.reason.replace(/_/g, ' ')}</span>} />
            {ret.reason_description && <InfoRow label="Description" value={ret.reason_description} />}
            <InfoRow label="Customer"  value={ret.order?.customer_name ?? '—'} />
            <InfoRow label="Submitted" value={new Date(ret.created_at).toLocaleString()} />
          </div>
        </div>

        {/* Image comparison */}
        <div className="rounded-2xl card-red p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(180,0,0,0.2),transparent_70%)] pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Image Comparison</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ImageBox label="Original Packing Image" src={originalSrc}
                placeholder="No packing photo — packing manager must upload one." />
              <ImageBox label="Returned Product Image" src={returnedSrc}
                placeholder="No return photo — customer must upload one." />
            </div>

            {/* Analyze button */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={runInspection}
                disabled={running || !returnedSrc || !originalSrc}
                className="w-full sm:w-auto px-10 py-3 rounded-full bg-gradient-to-r from-red-800 to-red-600 text-white text-xs font-black uppercase tracking-widest hover:from-red-700 hover:to-red-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-red-900/50 transition-all"
              >
                {running ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    Analyzing…
                  </span>
                ) : '⚡ Analyze Return'}
              </button>
              {(!returnedSrc || !originalSrc) && (
                <p className="text-[10px] text-yellow-500/60 uppercase tracking-widest">
                  {!originalSrc && !returnedSrc ? 'Both images required.' : !originalSrc ? 'Missing packing photo.' : 'Missing return photo.'}
                </p>
              )}
            </div>
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
                className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white/60 self-start transition-colors">
                {showEvidence ? '▲ Hide Evidence' : '▼ View Evidence'}
              </button>
            )}
            {showEvidence && (
              <div className="rounded-2xl card-red p-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(180,0,0,0.15),transparent_70%)] pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Evidence</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <ImageBox label="Original Packing Image" src={originalSrc} />
                    <ImageBox label="Returned Product Image" src={returnedSrc} />
                  </div>
                  <ul className="flex flex-col gap-2">
                    {inspection.evidence.map((ev, i) => (
                      <li key={i} className="flex gap-2 text-xs text-white/50">
                        <span className="text-red-500/50 font-bold shrink-0">{i + 1}.</span>
                        {ev}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Decision panel */}
            {canDecide && (
              <div className="rounded-2xl card-red p-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(180,0,0,0.2),transparent_70%)] pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Final Decision</p>
                  <p className="text-xs text-white/30 mb-4 uppercase tracking-widest">
                    AI recommends:{' '}
                    <span className="text-white/60 font-bold">
                      {inspection.recommendation?.replace(/_/g, ' ') ?? '—'}
                    </span>
                    . The final call is yours.
                  </p>

                  <textarea value={operatorNote} onChange={(e) => setOperatorNote(e.target.value)} rows={2}
                    placeholder="Optional operator note…"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 resize-none mb-4 transition-colors" />

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => applyDecision('ACCEPTED')} disabled={deciding}
                      className="flex-1 min-w-[110px] rounded-full bg-green-600/80 hover:bg-green-600 text-white text-[10px] font-black uppercase tracking-widest py-2.5 disabled:opacity-40 transition-all">
                      ✓ Accept
                    </button>
                    <button onClick={() => applyDecision('MANUAL_REVIEW')} disabled={deciding}
                      className="flex-1 min-w-[110px] rounded-full bg-yellow-600/80 hover:bg-yellow-600 text-white text-[10px] font-black uppercase tracking-widest py-2.5 disabled:opacity-40 transition-all">
                      ⚠ Manual Review
                    </button>
                    <button onClick={() => applyDecision('REJECTED')} disabled={deciding}
                      className="flex-1 min-w-[110px] rounded-full bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white text-[10px] font-black uppercase tracking-widest py-2.5 disabled:opacity-40 transition-all">
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            )}

            {hasDecision && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-xs text-white/30 uppercase tracking-widest">
                Decision recorded. No further action required.
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
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-14 text-center">
            <p className="text-xs text-white/20 uppercase tracking-widest">
              No inspection yet. Upload both images and click <span className="text-white/40">⚡ Analyze Return</span>.
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}
