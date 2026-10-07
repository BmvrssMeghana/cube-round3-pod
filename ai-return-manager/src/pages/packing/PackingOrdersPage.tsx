import { useEffect, useState } from 'react'
import { ordersApi } from '../../api/client'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Layout } from '../../components/Layout'
import { OrderStatusBadge } from '../../components/StatusBadge'
import { Spinner } from '../../components/Spinner'
import type { Order } from '../../types'

interface PackingOrdersPageProps {
  onSelectOrder: (order: Order) => void
}

export function PackingOrdersPage({ onSelectOrder }: PackingOrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ordersApi.list().then(setOrders).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  const actionable = orders.filter((o) => o.status === 'PENDING' || o.status === 'PACKED')
  const others = orders.filter((o) => o.status !== 'PENDING' && o.status !== 'PACKED')

  return (
    <Layout title="Incoming Orders" subtitle="Upload packing photos and confirm shipments.">
      <ErrorMessage message={error} onDismiss={() => setError(null)} />
      {loading ? <Spinner /> : (
        <>
          {actionable.length === 0 && others.length === 0 && (
            <div className="card-rm p-12 text-center text-[var(--text3)] text-sm font-medium">No orders yet.</div>
          )}

          {actionable.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[var(--amber)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--amber)]">Needs Action</h3>
              </div>
              <OrderTable orders={actionable} onSelect={onSelectOrder} />
            </section>
          )}

          {others.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[var(--text3)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)]">Shipped / Completed</h3>
              </div>
              <OrderTable orders={others} onSelect={onSelectOrder} dimmed />
            </section>
          )}
        </>
      )}
    </Layout>
  )
}

function OrderTable({ orders, onSelect, dimmed = false }: { orders: Order[]; onSelect: (o: Order) => void; dimmed?: boolean }) {
  return (
    <div className={`card-rm overflow-hidden ${dimmed ? 'opacity-70' : ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--bg3)] border-b border-[var(--border)] text-[var(--text3)] text-[11px] font-bold uppercase tracking-wider">
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">Order</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {orders.map((o, i) => (
              <tr key={o.id} className="hover:bg-[var(--bg3)] transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-xs text-[var(--accent2)]">#{i + 1}</td>
                <td className="py-3.5 px-4">
                  <p className="font-semibold text-[var(--text)]">Order #{o.id}</p>
                  <p className="text-xs text-[var(--text3)]">{o.product?.name ?? `#${o.product_id}`}</p>
                </td>
                <td className="py-3.5 px-4">
                  <p className="text-[var(--text2)] font-medium">{o.customer_name}</p>
                  <p className="text-xs text-[var(--text3)]">{o.customer_email}</p>
                </td>
                <td className="py-3.5 px-4">
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className="py-3.5 px-4 text-right">
                  {!dimmed && (
                    <button onClick={() => onSelect(o)}
                      className="btn-primary-rm">
                      {o.status === 'PACKED' ? 'View / Ship' : 'Pack Order'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

