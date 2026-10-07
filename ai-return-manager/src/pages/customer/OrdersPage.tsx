import { useEffect, useState } from 'react'
import { inspectionsApi, ordersApi, returnsApi } from '../../api/client'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Layout } from '../../components/Layout'
import { OrderStatusBadge } from '../../components/StatusBadge'
import { Spinner } from '../../components/Spinner'
import type { Inspection, Order, Return } from '../../types'

interface OrdersPageProps {
  onRequestReturn: (order: Order) => void
}

function pct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${Math.round(v * 100)}%`
}

function cap(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function fmt(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString()
}

// ── Print styles for customer receipt ────────────────────────────────────────
const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  #customer-report, #customer-report * { visibility: visible !important; }
  #customer-report {
    position: fixed !important;
    top: 0 !important; left: 0 !important;
    width: 100% !important;
    padding: 40px !important;
    background: #fff !important;
    color: #000 !important;
    font-family: 'Manrope', system-ui, sans-serif;
  }
  .cr-title    { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #000; }
  .cr-sub      { font-size: 11px; color: #666; margin-top: 4px; }
  .cr-section  { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 12px; }
  .cr-sh       { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #4f46e5; margin-bottom: 8px; }
  .cr-grid     { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .cr-cell     { background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
  .cr-cl       { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.1em; }
  .cr-cv       { font-size: 13px; font-weight: 600; color: #000; margin-top: 2px; }
  .cr-badge    { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; border: 1px solid #ccc; }
  .no-print    { display: none !important; }
}
`

// ── Inline receipt renderer ───────────────────────────────────────────────────
function CustomerReceipt({
  order,
  ret,
  inspection,
}: {
  order: Order
  ret: Return
  inspection: Inspection | null
}) {
  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div id="customer-report" style={{ display: 'none' }}>
        <div className="cr-title">Return Receipt</div>
        <div className="cr-sub">
          Order #{order.id} · {order.product?.name ?? `Product #${order.product_id}`} · {new Date().toLocaleString()}
        </div>

        <div className="cr-section">
          <div className="cr-sh">Order Details</div>
          <div className="cr-grid">
            <div className="cr-cell"><div className="cr-cl">Customer</div><div className="cr-cv">{order.customer_name}</div></div>
            <div className="cr-cell"><div className="cr-cl">Email</div><div className="cr-cv">{order.customer_email}</div></div>
            <div className="cr-cell"><div className="cr-cl">Product</div><div className="cr-cv">{order.product?.name ?? '—'}</div></div>
            <div className="cr-cell"><div className="cr-cl">Order Date</div><div className="cr-cv">{fmt(order.created_at)}</div></div>
            <div className="cr-cell"><div className="cr-cl">Status</div><div className="cr-cv">{cap(order.status)}</div></div>
          </div>
        </div>

        <div className="cr-section">
          <div className="cr-sh">Return Details</div>
          <div className="cr-grid">
            <div className="cr-cell"><div className="cr-cl">Return ID</div><div className="cr-cv">#{ret.id}</div></div>
            <div className="cr-cell"><div className="cr-cl">Reason</div><div className="cr-cv">{cap(ret.reason)}</div></div>
            <div className="cr-cell"><div className="cr-cl">Return Status</div><div className="cr-cv">{cap(ret.status)}</div></div>
            <div className="cr-cell"><div className="cr-cl">Submitted</div><div className="cr-cv">{fmt(ret.created_at)}</div></div>
            {ret.reason_description && (
              <div className="cr-cell" style={{ gridColumn: 'span 2' }}>
                <div className="cr-cl">Description</div>
                <div className="cr-cv">{ret.reason_description}</div>
              </div>
            )}
          </div>
        </div>

        {inspection && (
          <div className="cr-section">
            <div className="cr-sh">AI Inspection Summary</div>
            <div className="cr-grid">
              <div className="cr-cell"><div className="cr-cl">Product Match</div><div className="cr-cv">{inspection.product_match ? '✓ Matched' : '✗ Mismatch'}</div></div>
              <div className="cr-cell"><div className="cr-cl">Missing Parts</div><div className="cr-cv">{inspection.missing_parts.length === 0 ? 'None' : inspection.missing_parts.map(cap).join(', ')}</div></div>
              <div className="cr-cell"><div className="cr-cl">Damage Level</div><div className="cr-cv">{cap(inspection.damage_level ?? 'None')}</div></div>
              <div className="cr-cell"><div className="cr-cl">AI Confidence</div><div className="cr-cv">{pct(inspection.confidence)}</div></div>
              <div className="cr-cell"><div className="cr-cl">AI Recommendation</div><div className="cr-cv">{cap(inspection.recommendation ?? '—')}</div></div>
              {inspection.final_decision && (
                <div className="cr-cell"><div className="cr-cl">Final Decision</div><div className="cr-cv">{cap(inspection.final_decision)}</div></div>
              )}
            </div>
            {inspection.evidence.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="cr-sh">Evidence</div>
                <ol style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: '#444' }}>
                  {inspection.evidence.map((e, i) => <li key={i}>{e}</li>)}
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="cr-section" style={{ fontSize: 10, color: '#aaa', textAlign: 'center' }}>
          This document was generated by the Return Manager AI System.
        </div>
      </div>
    </>
  )
}

// ── Download button per row ───────────────────────────────────────────────────
function DownloadReturnButton({ order }: { order: Order }) {
  const [loading, setLoading] = useState(false)
  const [ret, setRet] = useState<Return | null>(null)
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [ready, setReady] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const allReturns = await returnsApi.list()
      const found = allReturns.find((r) => r.order_id === order.id) ?? null
      setRet(found)

      if (found) {
        const insp = await inspectionsApi.get(found.id).catch(() => null)
        setInspection(insp)
      }

      setReady(true)
    } catch {
      setReady(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!ready) return
    const el = document.getElementById('customer-report')
    if (el) {
      el.style.display = 'block'
      setTimeout(() => {
        window.print()
        setTimeout(() => { el.style.display = 'none'; setReady(false) }, 500)
      }, 100)
    }
  }, [ready])

  if (!ret && !loading) return null

  return (
    <>
      {ret && <CustomerReceipt order={order} ret={ret} inspection={inspection} />}
      <button
        onClick={handleDownload}
        disabled={loading}
        title="Download return receipt"
        className="btn-secondary-rm"
      >
        {loading ? (
          <span className="h-3 w-3 rounded-full border border-[var(--text3)] border-t-[var(--text)] animate-spin" />
        ) : (
          <svg className="h-3.5 w-3.5 text-[var(--accent2)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
          </svg>
        )}
        Receipt
      </button>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function OrdersPage({ onRequestReturn }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ordersApi.list().then(setOrders).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  const canReturn = (o: Order) => o.status === 'SHIPPED' || o.status === 'DELIVERED'
  const hasReturn = (o: Order) => o.status === 'RETURN_REQUESTED'

  return (
    <Layout title="My Orders" subtitle="View your orders and request a return.">
      <ErrorMessage message={error} onDismiss={() => setError(null)} />
      {loading ? <Spinner /> : orders.length === 0 ? (
        <div className="card-rm p-12 text-center text-[var(--text3)] text-sm font-medium">No orders yet.</div>
      ) : (
        <div className="card-rm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--bg3)] border-b border-[var(--border)] text-[var(--text3)] text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Product</th>
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
                      <p className="font-semibold text-[var(--text)]">{o.product?.name ?? `#${o.product_id}`}</p>
                      <p className="text-xs text-[var(--text3)]">{new Date(o.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-[var(--text2)] font-medium">{o.customer_name}</p>
                      <p className="text-xs text-[var(--text3)]">{o.customer_email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasReturn(o) ? (
                          <>
                            <span className="text-xs text-[var(--amber)] font-semibold italic mr-1">In progress</span>
                            <DownloadReturnButton order={o} />
                          </>
                        ) : canReturn(o) ? (
                          <button onClick={() => onRequestReturn(o)}
                            className="btn-primary-rm">
                            Return
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--text3)] italic">N/A</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}

