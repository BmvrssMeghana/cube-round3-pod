import { useState } from 'react'
import { packingApi } from '../../api/client'
import { ErrorMessage } from '../../components/ErrorMessage'
import { InfoRow } from '../../components/InfoRow'
import { Layout } from '../../components/Layout'
import { OrderStatusBadge } from '../../components/StatusBadge'
import type { Order } from '../../types'

interface PackingDetailPageProps {
  order: Order
  onBack: () => void
  onOrderUpdated: (order: Order) => void
}

export function PackingDetailPage({ order: initialOrder, onBack, onOrderUpdated }: PackingDetailPageProps) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [shipping, setShipping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shipSuccess, setShipSuccess] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    setPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleUpload() {
    if (!photoFile) return
    setUploading(true); setError(null)
    try {
      const updated = await packingApi.uploadPhoto(order.id, photoFile)
      setOrder(updated); onOrderUpdated(updated)
      setPhotoFile(null); setPreview(null)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Upload failed') }
    finally { setUploading(false) }
  }

  async function handleShip() {
    setShipping(true); setError(null)
    try {
      const updated = await packingApi.ship(order.id)
      setOrder(updated); onOrderUpdated(updated); setShipSuccess(true)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to ship') }
    finally { setShipping(false) }
  }

  const packingPhotoSrc = order.packing_photo_url ?? null
  const isShipped = order.status === 'SHIPPED' || order.status === 'DELIVERED'

  return (
    <Layout title={`Order #${order.id}`} subtitle={order.product?.name ?? `Product #${order.product_id}`}>
      <button onClick={onBack}
        className="mb-5 text-xs font-bold uppercase tracking-wider text-[var(--accent2)] hover:text-[var(--accent)] flex items-center gap-1.5 transition-colors">
        ← Back to orders
      </button>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order details */}
        <div className="card-rm p-6 flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] pb-2 border-b border-[var(--border)]">Order Details</h3>
          <InfoRow label="Status"   value={<OrderStatusBadge status={order.status} />} />
          <InfoRow label="Customer" value={order.customer_name} />
          <InfoRow label="Email"    value={order.customer_email} />
          <InfoRow label="Product"  value={order.product?.name ?? `#${order.product_id}`} />
          <InfoRow label="Qty"      value={order.quantity} />
          <InfoRow label="Placed"   value={new Date(order.created_at).toLocaleString()} />
          {order.shipped_at && <InfoRow label="Shipped" value={new Date(order.shipped_at).toLocaleString()} />}

          {order.product?.required_components?.length ? (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] mb-2">Required Components</p>
              <div className="flex flex-wrap gap-2">
                {order.product.required_components.map((c) => (
                  <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text2)]">
                    {c.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Packing photo */}
        <div className="card-rm p-6 flex flex-col gap-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] pb-2 border-b border-[var(--border)]">Packing Photo</h3>

          {packingPhotoSrc ? (
            <div className="rounded-lg overflow-hidden border border-[var(--border)] aspect-video w-full bg-[var(--bg3)]">
              <img src={packingPhotoSrc} alt="Packing" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--border2)] bg-[var(--bg3)] aspect-video w-full flex items-center justify-center">
              <span className="text-xs text-[var(--text3)] font-medium">No packing photo uploaded yet</span>
            </div>
          )}

          {!isShipped && (
            <div className="flex flex-col gap-3">
              <input type="file" accept="image/*" onChange={handleFileChange}
                className="block w-full text-xs text-[var(--text2)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-[var(--border2)] file:text-xs file:font-semibold file:bg-[var(--bg3)] file:text-[var(--text)] hover:file:bg-[var(--border)] cursor-pointer" />
              {preview && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] aspect-video w-full bg-[var(--bg3)]">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              {photoFile && (
                <button onClick={handleUpload} disabled={uploading}
                  className="btn-secondary-rm w-full">
                  {uploading ? 'Uploading…' : packingPhotoSrc ? 'Replace Photo' : 'Upload Packing Photo'}
                </button>
              )}
            </div>
          )}

          <ErrorMessage message={error} onDismiss={() => setError(null)} />

          {!isShipped && order.status === 'PACKED' && !shipSuccess && (
            <button onClick={handleShip} disabled={shipping}
              className="btn-primary-rm w-full py-3">
              {shipping ? 'Confirming…' : '✓ Confirm Shipment'}
            </button>
          )}

          {(isShipped || shipSuccess) && (
            <div className="rounded-lg border border-[rgba(13,148,136,0.3)] bg-[var(--green-bg)] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--green)] text-center">
              ✓ Order Shipped
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

