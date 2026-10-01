import { useEffect, useState } from 'react'
import { returnsApi } from '../../api/client'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Layout } from '../../components/Layout'
import { ReturnStatusBadge } from '../../components/StatusBadge'
import { Spinner } from '../../components/Spinner'
import type { Return } from '../../types'

interface ReturnsListPageProps {
  onSelectReturn: (ret: Return) => void
  filter?: 'total' | 'completed' | 'failed'
}

export function ReturnsListPage({ onSelectReturn, filter = 'total' }: ReturnsListPageProps) {
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    returnsApi.list().then(setReturns).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  // Apply sidebar filter
  const filtered = returns.filter((r) => {
    if (filter === 'completed') return r.status === 'ACCEPTED' || r.status === 'REJECTED'
    if (filter === 'failed')    return r.status === 'REJECTED'
    return true // total = all
  })

  const pending = filtered.filter((r) => r.status === 'PENDING' || r.status === 'INSPECTING')
  const decided = filtered.filter((r) => r.status !== 'PENDING' && r.status !== 'INSPECTING')

  const filterLabel: Record<string, string> = {
    total:     'All Return Requests',
    completed: 'Completed Returns',
    failed:    'Failed Returns',
  }

  return (
    <Layout title={filterLabel[filter] ?? 'Return Requests'} subtitle="Review and inspect customer return requests.">
      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <p className="text-center text-white/20 py-16 text-xs uppercase tracking-widest">
          No {filterLabel[filter]?.toLowerCase() ?? 'returns'} found.
        </p>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/70 mb-3">Awaiting Inspection</p>
              <ReturnTable returns={pending} onSelect={onSelectReturn} />
            </section>
          )}
          {decided.length > 0 && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-3">Completed</p>
              <ReturnTable returns={decided} onSelect={onSelectReturn} dimmed />
            </section>
          )}
        </>
      )}
    </Layout>
  )
}

function ReturnTable({ returns, onSelect, dimmed = false }: {
  returns: Return[]
  onSelect: (r: Return) => void
  dimmed?: boolean
}) {
  return (
    <div className={`rounded-2xl card-red overflow-hidden ${dimmed ? 'opacity-50' : 'glow-red'}`}>
      <div className="grid grid-cols-[2rem_1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-white/10">
        {['#', 'Return / Order', 'Reason', 'Status', ''].map((h) => (
          <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-white/30">{h}</span>
        ))}
      </div>
      {returns.map((r, i) => (
        <div key={r.id}
          className="grid grid-cols-[2rem_1fr_1fr_auto_auto] gap-4 items-center px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
          <span className="text-sm font-black text-red-500">#{i + 1}</span>
          <div>
            <p className="text-sm font-semibold text-white">Return #{r.id}</p>
            <p className="text-xs text-white/30">
              Order #{r.order_id}{r.order?.product?.name ? ` · ${r.order.product.name}` : ''}
            </p>
            <p className="text-xs text-white/20">{new Date(r.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-white/70 capitalize">{r.reason.replace(/_/g, ' ')}</p>
            {!r.returned_photo_url && r.status === 'PENDING' && (
              <p className="text-[10px] text-yellow-500/70 uppercase tracking-widest mt-0.5">⚠ No photo</p>
            )}
          </div>
          <ReturnStatusBadge status={r.status} />
          <button
            onClick={() => onSelect(r)}
            className="rounded-full border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-red-500/10 transition-all">
            {dimmed ? 'View' : 'Inspect'}
          </button>
        </div>
      ))}
    </div>
  )
}
