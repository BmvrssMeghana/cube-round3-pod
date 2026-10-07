import { useState } from 'react'
import type { Order } from '../../types'
import { OrdersPage } from './OrdersPage'
import { ProductsPage } from './ProductsPage'
import { RequestReturnPage } from './RequestReturnPage'

type CustomerView = 'products' | 'orders' | 'return'

export function CustomerSection() {
  const [view, setView] = useState<CustomerView>('products')
  const [returnOrder, setReturnOrder] = useState<Order | null>(null)

  function handleRequestReturn(order: Order) {
    setReturnOrder(order)
    setView('return')
  }

  if (view === 'return' && returnOrder) {
    return <RequestReturnPage order={returnOrder} onSuccess={() => { setReturnOrder(null); setView('orders') }} onCancel={() => setView('orders')} />
  }

  return (
    <>
      <div className="bg-[var(--bg2)] border-b border-[var(--border)] px-6 py-3 flex gap-2">
        {(['products', 'orders'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
              view === v
                ? 'bg-[var(--accent-glow)] text-[var(--accent2)] border border-[rgba(99,102,241,0.2)]'
                : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
            }`}>
            {v === 'products' ? 'Products' : 'My Orders'}
          </button>
        ))}
      </div>
      {view === 'products' && <ProductsPage />}
      {view === 'orders'   && <OrdersPage onRequestReturn={handleRequestReturn} />}
    </>
  )
}

