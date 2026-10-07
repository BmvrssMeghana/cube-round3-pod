import type { Inspection, Return } from '../../types'

interface InspectionReportProps {
  inspection: Inspection
  ret: Return
  originalSrc: string | null
  returnedSrc: string | null
}

function pct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${Math.round(v * 100)}%`
}

function fmt(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString()
}

function cap(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Print stylesheet — self-contained white/black for PDF readability ─────────
const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  #rm-report, #rm-report * { visibility: visible !important; }
  #rm-report {
    position: fixed !important;
    top: 0 !important; left: 0 !important;
    width: 100% !important;
    padding: 32px !important;
    background: #fff !important;
    color: #000 !important;
    font-family: 'Manrope', sans-serif;
  }
  #rm-report .rm-card {
    background: #f8f8f8 !important;
    border: 1px solid #ddd !important;
    border-radius: 8px !important;
    padding: 12px !important;
    break-inside: avoid;
  }
  #rm-report .rm-label { color: #666 !important; font-size: 9px !important; }
  #rm-report .rm-value { color: #000 !important; font-size: 13px !important; }
  #rm-report .rm-section-title {
    color: #4f46e5 !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    border-bottom: 1px solid #ddd !important;
    padding-bottom: 4px !important;
    margin-bottom: 8px !important;
  }
  #rm-report .rm-header-title { color: #000 !important; }
  #rm-report .rm-header-sub   { color: #666 !important; font-size: 11px !important; }
  #rm-report .rm-rec-badge    { border: 1px solid #ccc !important; color: #000 !important; background: #f0f0f0 !important; }
  #rm-report img { max-height: 160px !important; object-fit: cover !important; }
  .rm-no-print { display: none !important; }
}
`

const accentBorder: Record<string, string> = {
  green:  'border-l-4 border-l-[var(--green)]',
  red:    'border-l-4 border-l-[var(--red)]',
  yellow: 'border-l-4 border-l-[var(--amber)]',
  blue:   'border-l-4 border-l-[var(--accent)]',
  gray:   'border-l-4 border-l-[var(--border2)]',
}

function Cell({
  label, value, accent = 'gray',
}: {
  label: string
  value: React.ReactNode
  accent?: string
}) {
  return (
    <div className={`rm-card rounded-lg bg-[var(--bg3)] p-3.5 flex flex-col gap-1 border border-[var(--border)] ${accentBorder[accent] ?? accentBorder.gray}`}>
      <span className="rm-label text-[10px] font-bold uppercase tracking-wider text-[var(--text3)]">{label}</span>
      <span className="rm-value text-sm font-bold text-[var(--text)] leading-snug">{value}</span>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full mt-3">
      <p className="rm-section-title text-xs font-bold uppercase tracking-wider text-[var(--accent2)] pb-1 border-b border-[var(--border)]">
        {children}
      </p>
    </div>
  )
}

export function InspectionReport({ inspection, ret, originalSrc, returnedSrc }: InspectionReportProps) {
  const dmgLevel  = inspection.damage_level ?? 'NONE'
  const dmgAccent = dmgLevel === 'HIGH' ? 'red' : dmgLevel === 'MEDIUM' || dmgLevel === 'LOW' ? 'yellow' : 'green'
  const recAccent = inspection.recommendation === 'ACCEPT' ? 'green' : inspection.recommendation === 'REJECT' ? 'red' : 'yellow'
  const decAccent = inspection.final_decision === 'ACCEPTED' ? 'green' : inspection.final_decision === 'REJECTED' ? 'red' : 'yellow'

  const recColor = inspection.recommendation === 'ACCEPT'
    ? 'bg-[var(--green-bg)] text-[var(--green)] border border-[rgba(13,148,136,0.3)]'
    : inspection.recommendation === 'REJECT'
    ? 'bg-[var(--red-bg)] text-[var(--red)] border border-[rgba(224,38,78,0.3)]'
    : 'bg-[var(--amber-bg)] text-[var(--amber)] border border-[rgba(217,119,6,0.3)]'

  return (
    <>
      <style>{PRINT_STYLES}</style>

      <div id="rm-report" className="relative mt-6">
        <div className="card-rm p-6">
          <div>

            {/* ── Report header ── */}
            <div className="flex items-start justify-between mb-6 pb-5 border-b border-[var(--border)]">
              <div>
                <h3 className="rm-header-title text-lg font-bold tracking-tight text-[var(--text)]">
                  AI Inspection Report
                </h3>
                <p className="rm-header-sub text-xs text-[var(--text3)] mt-0.5 uppercase tracking-wider">
                  Return #{ret.id} · Order #{ret.order_id}
                  {ret.order?.product?.name && ` · ${ret.order.product.name}`}
                </p>
                <p className="rm-header-sub text-[11px] text-[var(--text3)] mt-0.5">
                  Generated: {new Date().toLocaleString()}
                </p>
              </div>
              <div className={`rm-rec-badge px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${recColor}`}>
                {inspection.recommendation?.replace(/_/g, ' ') ?? '—'}
              </div>
            </div>

            {/* ── Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">

              {/* Return info */}
              <SectionTitle>Return Information</SectionTitle>
              <Cell label="Return ID"     value={`#${ret.id}`} />
              <Cell label="Order ID"      value={`#${ret.order_id}`} />
              <Cell label="Customer"      value={ret.order?.customer_name ?? '—'} />
              <Cell label="Product"       value={ret.order?.product?.name ?? '—'} />
              <Cell label="Return Reason" value={cap(ret.reason)} />
              <Cell label="Submitted"     value={fmt(ret.created_at)} />
              {ret.reason_description && (
                <div className="rm-card col-span-full rounded-lg bg-[var(--bg3)] p-4 border border-[var(--border)] border-l-4 border-l-[var(--border2)]">
                  <span className="rm-label text-[10px] font-bold uppercase tracking-wider text-[var(--text3)] block mb-1">Customer Description</span>
                  <span className="rm-value text-sm text-[var(--text)]">{ret.reason_description}</span>
                </div>
              )}

              {/* AI results */}
              <SectionTitle>AI Analysis Results</SectionTitle>
              <Cell label="Product Identity"        value={inspection.product_match ? '✓ Matched' : '✗ Mismatch'}  accent={inspection.product_match ? 'green' : 'red'} />
              <Cell label="Missing Parts"           value={inspection.missing_parts.length === 0 ? '✓ None' : `✗ ${inspection.missing_parts.map(cap).join(', ')}`} accent={inspection.missing_parts.length === 0 ? 'green' : 'red'} />
              <Cell label="Return Reason Supported" value={inspection.return_reason_supported ? '✓ Yes' : '✗ No'}  accent={inspection.return_reason_supported ? 'green' : 'red'} />
              <Cell label="Damage Level"            value={cap(dmgLevel)}                                           accent={dmgAccent} />
              <Cell label="AI Confidence"           value={<span className="text-xl font-extrabold text-[var(--accent2)]">{pct(inspection.confidence)}</span>} accent="blue" />
              <Cell label="AI Recommendation"       value={cap(inspection.recommendation ?? '—')}                  accent={recAccent} />
              <Cell label="Inspection Date"         value={fmt(inspection.created_at)} />

              {/* Damage */}
              {inspection.damage.length > 0 && (
                <>
                  <SectionTitle>Damage Detail</SectionTitle>
                  {inspection.damage.map((d, i) => (
                    <Cell key={i} label={cap(d.type)} value={`${cap(d.severity)} · ${pct(d.confidence)}`} accent={d.severity === 'high' ? 'red' : 'yellow'} />
                  ))}
                </>
              )}

              {/* Scratches */}
              {inspection.scratches.length > 0 && (
                <>
                  <SectionTitle>Scratches</SectionTitle>
                  {inspection.scratches.map((s, i) => (
                    <Cell key={i} label={`Scratch ${i + 1}`} value={`${cap(s.severity)} · ${cap(s.location)}`} accent="yellow" />
                  ))}
                </>
              )}

              {/* Evidence */}
              {inspection.evidence.length > 0 && (
                <>
                  <SectionTitle>AI Evidence</SectionTitle>
                  <div className="rm-card col-span-full rounded-lg bg-[var(--bg3)] p-4 border border-[var(--border)] border-l-4 border-l-[var(--accent)]">
                    <ul className="flex flex-col gap-2">
                      {inspection.evidence.map((ev, i) => (
                        <li key={i} className="rm-value text-xs text-[var(--text2)] flex gap-2">
                          <span className="text-[var(--accent2)] font-bold shrink-0">{i + 1}.</span>
                          {ev}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Images */}
              {(originalSrc || returnedSrc) && (
                <>
                  <SectionTitle>Image Comparison</SectionTitle>
                  <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Original Packing Photo', src: originalSrc },
                      { label: 'Returned Product Photo', src: returnedSrc },
                    ].map(({ label, src }) => (
                      <div key={label} className="rm-card rounded-lg bg-[var(--bg3)] p-3 border border-[var(--border)]">
                        <p className="rm-label text-[10px] font-bold uppercase tracking-wider text-[var(--text3)] mb-2">{label}</p>
                        {src
                          ? <img src={src} alt={label} className="w-full rounded-md object-cover max-h-48" />
                          : <div className="w-full h-24 rounded-md bg-[var(--bg2)] flex items-center justify-center text-xs text-[var(--text3)]">No image</div>
                        }
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Human decision */}
              {inspection.final_decision && (
                <>
                  <SectionTitle>Final Human Decision</SectionTitle>
                  <Cell label="Decision"   value={cap(inspection.final_decision)} accent={decAccent} />
                  <Cell label="Decided By" value={inspection.decided_by ?? 'operator'} />
                  <Cell label="Decided At" value={fmt(inspection.decided_at)} />
                  {inspection.operator_note && (
                    <div className="rm-card col-span-full rounded-lg bg-[var(--bg3)] p-4 border border-[var(--border)] border-l-4 border-l-[var(--border2)]">
                      <span className="rm-label text-[10px] font-bold uppercase tracking-wider text-[var(--text3)] block mb-1">Operator Note</span>
                      <span className="rm-value text-sm text-[var(--text)] italic">"{inspection.operator_note}"</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Download button — fixed bottom right ── */}
        <button
          onClick={() => window.print()}
          className="rm-no-print fixed bottom-6 right-6 z-50 btn-primary-rm shadow-xl py-3 px-6 rounded-full"
          aria-label="Download inspection report as PDF"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
          </svg>
          Download Report
        </button>
      </div>
    </>
  )
}

