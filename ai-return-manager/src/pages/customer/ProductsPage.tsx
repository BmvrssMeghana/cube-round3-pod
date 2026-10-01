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
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-400/50 hover:text-green-400 ml-3">×</button>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="relative rounded-2xl overflow-hidden flex flex-col card-red glow-red group">
              {/* Radial glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(180,0,0,0.3),transparent_70%)] pointer-events-none" />

              {p.image_url && (
                <div className="relative h-44 overflow-hidden">
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
              )}

              <div className="relative z-10 p-4 flex flex-col flex-1 gap-2">
                <h3 className="font-bold text-white uppercase tracking-wide text-sm">{p.name}</h3>
                <p className="text-xs text-white/40 flex-1 leading-relaxed">{p.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-black text-white">${p.price.toFixed(2)}</span>
                  <span className="text-[10px] text-white/30 uppercase tracking-widest">{p.stock} in stock</span>
                </div>
                {p.stock > 0 ? (
                  <button onClick={() => { setOrdering(p); setSuccess(null) }}
                    className="mt-2 w-full rounded-full bg-gradient-to-r from-red-800 to-red-600 text-white text-xs font-bold uppercase tracking-widest py-2.5 hover:from-red-700 hover:to-red-500 transition-all shadow-lg shadow-red-900/40">
                    Order Now
                  </button>
                ) : (
                  <button disabled className="mt-2 w-full rounded-full bg-white/5 text-white/20 text-xs font-bold uppercase tracking-widest py-2.5 cursor-not-allowed">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl card-red glow-red p-6 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(180,0,0,0.25),transparent_70%)] rounded-2xl pointer-events-none" />
            <div className="relative z-10">
              <h3 className="text-lg font-black uppercase tracking-widest text-white mb-0.5">Place Order</h3>
              <p className="text-xs text-white/40 mb-5 uppercase tracking-wide">{ordering.name}</p>

              <form onSubmit={handleOrder} className="flex flex-col gap-3">
                {[
                  { label: 'Full Name', type: 'text', val: form.name, key: 'name', ph: 'Jane Smith' },
                  { label: 'Email', type: 'email', val: form.email, key: 'email', ph: 'jane@example.com' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{f.label}</label>
                    <input required type={f.type} value={f.val}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.ph}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 focus:bg-white/8 transition-colors" />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Quantity</label>
                  <input required type="number" min={1} max={ordering.stock} value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors" />
                </div>

                <ErrorMessage message={error} onDismiss={() => setError(null)} />

                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setOrdering(null)}
                    className="flex-1 rounded-full border border-white/15 text-white/60 text-xs font-bold uppercase tracking-widest py-2.5 hover:border-white/30 hover:text-white transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 rounded-full bg-gradient-to-r from-red-800 to-red-600 text-white text-xs font-bold uppercase tracking-widest py-2.5 hover:from-red-700 hover:to-red-500 disabled:opacity-40 transition-all">
                    {submitting ? 'Placing…' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
