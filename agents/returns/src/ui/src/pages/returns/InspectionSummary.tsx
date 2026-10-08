import { DamageLevelBadge, FinalDecisionBadge, RecommendationBadge } from '../../components/StatusBadge'
import type { Inspection } from '../../types'

function pct(v: number | null) {
  if (v === null) return '—'
  return `${Math.round(v * 100)}%`
}

function MetricCard({
  label, value, accent,
}: {
  label: string
  value: React.ReactNode
  accent?: 'green' | 'red' | 'yellow' | 'blue' | 'none'
}) {
  const left = {
    green:  'border-l-4 border-l-[var(--green)]',
    red:    'border-l-4 border-l-[var(--red)]',
    yellow: 'border-l-4 border-l-[var(--amber)]',
    blue:   'border-l-4 border-l-[var(--accent)]',
    none:   'border-l-4 border-l-[var(--border2)]',
  }[accent ?? 'none']

  return (
    <div className={`rounded-lg bg-[var(--bg3)] p-3.5 flex flex-col gap-1 border border-[var(--border)] ${left}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text3)]">{label}</span>
      <span className="text-sm font-bold text-[var(--text)] leading-snug">{value}</span>
    </div>
  )
}

export function InspectionSummary({ inspection }: { inspection: Inspection }) {
  const hasDamage    = inspection.damage.length > 0
  const hasScratches = inspection.scratches.length > 0

  return (
    <div className="card-rm p-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] mb-4 pb-2 border-b border-[var(--border)]">
        Inspection Summary
      </h3>

      {/* Primary metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <MetricCard
          label="Product Identity"
          value={inspection.product_match ? '✓ Matched' : '✗ Mismatch'}
          accent={inspection.product_match ? 'green' : 'red'}
        />
        <MetricCard
          label="Missing Parts"
          value={inspection.missing_parts.length === 0
            ? '✓ None'
            : `✗ ${inspection.missing_parts.map(p => p.replace(/_/g, ' ')).join(', ')}`}
          accent={inspection.missing_parts.length === 0 ? 'green' : 'red'}
        />
        <MetricCard
          label="Damage"
          value={hasDamage
            ? `⚠ ${inspection.damage.map(d => d.type.replace(/_/g, ' ')).join(', ')}`
            : '✓ None'}
          accent={hasDamage ? 'red' : 'green'}
        />
        <MetricCard
          label="Scratches"
          value={hasScratches
            ? `⚠ ${inspection.scratches.map(s => `${s.severity} · ${s.location.replace(/_/g, ' ')}`).join(', ')}`
            : '✓ None'}
          accent={hasScratches ? 'yellow' : 'green'}
        />
        <MetricCard
          label="Return Reason Supported"
          value={inspection.return_reason_supported ? '✓ Yes' : '✗ No'}
          accent={inspection.return_reason_supported ? 'green' : 'red'}
        />
        <MetricCard
          label="AI Confidence"
          value={<span className="text-lg font-extrabold text-[var(--accent2)]">{pct(inspection.confidence)}</span>}
          accent="blue"
        />
      </div>

      {/* Damage level + Recommendation row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <MetricCard label="Damage Level"      value={<DamageLevelBadge level={inspection.damage_level} />}     accent="none" />
        <MetricCard label="AI Recommendation" value={<RecommendationBadge rec={inspection.recommendation} />}  accent="none" />
      </div>

      {/* Damage detail */}
      {hasDamage && (
        <div className="mb-5 pt-3 border-t border-[var(--border)]">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] mb-2">Damage Detail</p>
          <div className="flex flex-col gap-2">
            {inspection.damage.map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-[var(--bg3)] border border-[var(--border)] px-3.5 py-2">
                <span className="text-xs font-medium text-[var(--text)] capitalize">{d.type.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    d.severity === 'high'   ? 'bg-[var(--red-bg)] text-[var(--red)]' :
                    d.severity === 'medium' ? 'bg-[var(--amber-bg)] text-[var(--amber)]' :
                                              'bg-[var(--amber-bg)] text-[var(--amber)]'
                  }`}>{d.severity}</span>
                  <span className="text-xs text-[var(--text3)] font-mono">{pct(d.confidence)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence */}
      {inspection.evidence.length > 0 && (
        <div className="mb-5 pt-3 border-t border-[var(--border)]">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] mb-2">AI Evidence</p>
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

      {/* Human decision */}
      {inspection.final_decision && (
        <div className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] p-4 mt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] mb-2">Final Human Decision</p>
          <FinalDecisionBadge decision={inspection.final_decision} />
          {inspection.operator_note && (
            <p className="text-xs text-[var(--text2)] mt-2 italic">"{inspection.operator_note}"</p>
          )}
          <p className="text-[11px] text-[var(--text3)] mt-2">
            By {inspection.decided_by ?? 'operator'}
            {inspection.decided_at && ` · ${new Date(inspection.decided_at).toLocaleString()}`}
          </p>
        </div>
      )}
    </div>
  )
}

