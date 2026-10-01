import { useState } from 'react'
import type { Order } from '../../types'
import { PackingDetailPage } from './PackingDetailPage'
import { PackingOrdersPage } from './PackingOrdersPage'

export function PackingSection() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  if (selectedOrder) {
    return (
      <PackingDetailPage
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onOrderUpdated={(updated) => setSelectedOrder(updated)}
      />
    )
  }
  return <PackingOrdersPage onSelectOrder={setSelectedOrder} />
}
