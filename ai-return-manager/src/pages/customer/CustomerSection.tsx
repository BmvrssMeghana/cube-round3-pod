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
      <div className="bg-black/70 backdrop-blur-md border-b border-white/10 px-6 py-2 flex gap-1">
        {(['products', 'orders'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full transition-all ${
              view === v
                ? 'bg-white/10 text-white'
                : 'text-white/30 hover:text-white/60 hover:bg-white/5'
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
