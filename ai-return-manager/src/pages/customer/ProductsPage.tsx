import { useEffect, useState } from 'react'
import { ordersApi, productsApi } from '../../api/client'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Layout } from '../../components/Layout'
import { Spinner } from '../../components/Spinner'
import type { Product } from '../../types'

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ordering, setOrdering] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', email: '', qty: 1 })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    productsApi.list().then(setProducts).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!ordering) return
    setSubmitting(true)
    setError(null)
    try {
      const order = await ordersApi.create({
        customer_name: form.name,
        customer_email: form.email,
        product_id: ordering.id,
        quantity: form.qty,
      })
      setSuccess(`Order #${order.id} placed successfully!`)
      setOrdering(null)
      setForm({ name: '', email: '', qty: 1 })
      const updated = await productsApi.list()
      setProducts(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout title="Products" subtitle="Browse available products and place an order.">
      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      {success && (
        <div className="mb-6 rounded-lg border border-[rgba(13,148,136,0.3)] bg-[var(--green-bg)] px-4 py-3 text-sm text-[var(--green)] flex items-center justify-between font-medium">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-[var(--green)] opacity-70 hover:opacity-100 ml-3">×</button>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="card-rm card-rm-hover overflow-hidden flex flex-col group">
              {p.image_url && (
                <div className="relative h-44 overflow-hidden bg-[var(--bg3)]">
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}

              <div className="p-5 flex flex-col flex-1 gap-3">
                <div>
                  <h3 className="font-bold text-[var(--text)] text-base">{p.name}</h3>
                  <p className="text-xs text-[var(--text3)] mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--border)]">
                  <span className="text-xl font-extrabold text-[var(--text)]">${p.price.toFixed(2)}</span>
                  <span className="text-xs font-semibold text-[var(--text3)]">{p.stock} in stock</span>
                </div>

                {p.stock > 0 ? (
                  <button onClick={() => { setOrdering(p); setSuccess(null) }}
                    className="btn-primary-rm w-full">
                    Order Now
                  </button>
                ) : (
                  <button disabled className="btn-secondary-rm w-full opacity-50 cursor-not-allowed">
                    Out of Stock
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order modal */}
      {ordering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md card-rm p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--text)]">Place Order</h3>
                <p className="text-xs text-[var(--text3)]">{ordering.name}</p>
              </div>
              <button onClick={() => setOrdering(null)} className="text-[var(--text3)] hover:text-[var(--text)] text-lg">×</button>
            </div>

            <form onSubmit={handleOrder} className="flex flex-col gap-4">
              {[
                { label: 'Full Name', type: 'text', val: form.name, key: 'name', ph: 'Jane Smith' },
                { label: 'Email', type: 'email', val: form.email, key: 'email', ph: 'jane@example.com' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-wider mb-1.5">{f.label}</label>
                  <input required type={f.type} value={f.val}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.ph}
                    className="w-full rounded-lg bg-[var(--bg3)] border border-[var(--border2)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--accent)] transition-colors" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-wider mb-1.5">Quantity</label>
                <input required type="number" min={1} max={ordering.stock} value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
                  className="w-full rounded-lg bg-[var(--bg3)] border border-[var(--border2)] px-3.5 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors" />
              </div>

              <ErrorMessage message={error} onDismiss={() => setError(null)} />

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setOrdering(null)}
                  className="btn-secondary-rm flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="btn-primary-rm flex-1">
                  {submitting ? 'Placing…' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

