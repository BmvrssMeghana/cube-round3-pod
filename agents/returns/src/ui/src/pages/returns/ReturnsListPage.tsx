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
        <div className="card-rm p-12 text-center text-[var(--text3)] text-sm font-medium">
          No {filterLabel[filter]?.toLowerCase() ?? 'returns'} found.
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[var(--amber)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--amber)]">Awaiting Inspection</h3>
              </div>
              <ReturnTable returns={pending} onSelect={onSelectReturn} />
            </section>
          )}
          {decided.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[var(--text3)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)]">Completed</h3>
              </div>
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
    <div className={`card-rm overflow-hidden ${dimmed ? 'opacity-70' : ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--bg3)] border-b border-[var(--border)] text-[var(--text3)] text-[11px] font-bold uppercase tracking-wider">
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">Return / Order</th>
              <th className="py-3 px-4">Reason</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {returns.map((r, i) => (
              <tr key={r.id} className="hover:bg-[var(--bg3)] transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-xs text-[var(--accent2)]">#{i + 1}</td>
                <td className="py-3.5 px-4">
                  <p className="font-semibold text-[var(--text)]">Return #{r.id}</p>
                  <p className="text-xs text-[var(--text3)]">
                    Order #{r.order_id}{r.order?.product?.name ? ` · ${r.order.product.name}` : ''}
                  </p>
                  <p className="text-[11px] text-[var(--text3)]">{new Date(r.created_at).toLocaleDateString()}</p>
                </td>
                <td className="py-3.5 px-4">
                  <p className="text-[var(--text2)] capitalize font-medium">{r.reason.replace(/_/g, ' ')}</p>
                  {!r.returned_photo_url && r.status === 'PENDING' && (
                    <span className="inline-block text-[10px] text-[var(--amber)] font-bold uppercase tracking-wider mt-0.5">⚠ No photo</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <ReturnStatusBadge status={r.status} />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => onSelect(r)}
                    className={dimmed ? "btn-secondary-rm" : "btn-primary-rm"}
                  >
                    {dimmed ? 'View' : 'Inspect'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

