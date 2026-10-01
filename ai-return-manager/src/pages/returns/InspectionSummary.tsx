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
    green:  'border-l-2 border-green-500',
    red:    'border-l-2 border-red-500',
    yellow: 'border-l-2 border-yellow-500',
    blue:   'border-l-2 border-blue-400',
    none:   'border-l-2 border-white/10',
  }[accent ?? 'none']

  return (
    <div className={`rounded-xl bg-white/[0.04] p-4 flex flex-col gap-1.5 ${left}`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">{label}</span>
      <span className="text-sm font-bold text-white leading-snug">{value}</span>
    </div>
  )
}

export function InspectionSummary({ inspection }: { inspection: Inspection }) {
  const hasDamage    = inspection.damage.length > 0
  const hasScratches = inspection.scratches.length > 0

  return (
    <div className="rounded-2xl card-red glow-red p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(180,0,0,0.25),transparent_70%)] pointer-events-none" />
      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Inspection Summary</p>

        {/* Primary metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
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
            value={<span className="text-xl font-black text-white">{pct(inspection.confidence)}</span>}
            accent="blue"
          />
        </div>

        {/* Damage level + Recommendation row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <MetricCard label="Damage Level"      value={<DamageLevelBadge level={inspection.damage_level} />}     accent="none" />
          <MetricCard label="AI Recommendation" value={<RecommendationBadge rec={inspection.recommendation} />}  accent="none" />
        </div>

        {/* Damage detail */}
        {hasDamage && (
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Damage Detail</p>
            <div className="flex flex-col gap-1.5">
              {inspection.damage.map((d, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                  <span className="text-xs text-white/60 capitalize">{d.type.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      d.severity === 'high'   ? 'bg-red-500/20 text-red-400' :
                      d.severity === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                    }`}>{d.severity}</span>
                    <span className="text-[9px] text-white/30 tabular-nums">{pct(d.confidence)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence */}
        {inspection.evidence.length > 0 && (
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">AI Evidence</p>
            <ul className="flex flex-col gap-1.5">
              {inspection.evidence.map((ev, i) => (
                <li key={i} className="flex gap-2 text-xs text-white/50">
                  <span className="text-red-500/50 font-bold shrink-0">{i + 1}.</span>
                  {ev}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Human decision */}
        {inspection.final_decision && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 mt-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Final Human Decision</p>
            <FinalDecisionBadge decision={inspection.final_decision} />
            {inspection.operator_note && (
              <p className="text-xs text-white/40 mt-2 italic">"{inspection.operator_note}"</p>
            )}
            <p className="text-[9px] text-white/20 mt-1 uppercase tracking-widest">
              By {inspection.decided_by ?? 'operator'}
              {inspection.decided_at && ` · ${new Date(inspection.decided_at).toLocaleString()}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
