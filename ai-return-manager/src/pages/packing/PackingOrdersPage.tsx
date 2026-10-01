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
            <p className="text-center text-white/20 py-16 text-xs uppercase tracking-widest">No orders yet.</p>
          )}

          {actionable.length > 0 && (
            <section className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/70 mb-3">Needs Action</p>
              <OrderTable orders={actionable} onSelect={onSelectOrder} />
            </section>
          )}

          {others.length > 0 && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-3">Shipped / Completed</p>
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
    <div className={`rounded-2xl card-red overflow-hidden ${dimmed ? 'opacity-50' : 'glow-red'}`}>
      <div className="grid grid-cols-[2rem_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/10">
        {['#', 'Order', 'Customer', 'Status', ''].map((h) => (
          <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-white/30">{h}</span>
        ))}
      </div>
      {orders.map((o, i) => (
        <div key={o.id}
          className="grid grid-cols-[2rem_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
          <span className="text-sm font-black text-red-500">#{i + 1}</span>
          <div>
            <p className="text-sm font-semibold text-white">Order #{o.id}</p>
            <p className="text-xs text-white/30 truncate">{o.product?.name ?? `#${o.product_id}`}</p>
          </div>
          <div>
            <p className="text-sm text-white/70 truncate">{o.customer_name}</p>
            <p className="text-xs text-white/30 truncate">{o.customer_email}</p>
          </div>
          <OrderStatusBadge status={o.status} />
          {!dimmed && (
            <button onClick={() => onSelect(o)}
              className="rounded-full border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-red-500/10 transition-all whitespace-nowrap">
              {o.status === 'PACKED' ? 'View / Ship' : 'Pack Order'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
