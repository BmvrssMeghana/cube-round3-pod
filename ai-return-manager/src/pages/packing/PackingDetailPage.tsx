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
        className="mb-5 text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white flex items-center gap-2 transition-colors">
        ← Back to orders
      </button>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Order details */}
        <div className="rounded-2xl card-red p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(180,0,0,0.2),transparent_70%)] pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Order Details</p>
            <InfoRow label="Status"   value={<OrderStatusBadge status={order.status} />} />
            <InfoRow label="Customer" value={order.customer_name} />
            <InfoRow label="Email"    value={order.customer_email} />
            <InfoRow label="Product"  value={order.product?.name ?? `#${order.product_id}`} />
            <InfoRow label="Qty"      value={order.quantity} />
            <InfoRow label="Placed"   value={new Date(order.created_at).toLocaleString()} />
            {order.shipped_at && <InfoRow label="Shipped" value={new Date(order.shipped_at).toLocaleString()} />}

            {order.product?.required_components?.length ? (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Required Components</p>
                <div className="flex flex-wrap gap-2">
                  {order.product.required_components.map((c) => (
                    <span key={c} className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
                      {c.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Packing photo */}
        <div className="rounded-2xl card-red p-5 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(180,0,0,0.2),transparent_70%)] pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Packing Photo</p>

            {packingPhotoSrc ? (
              <div className="rounded-xl overflow-hidden border border-white/10 aspect-video w-full">
                <img src={packingPhotoSrc} alt="Packing" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] aspect-video w-full flex items-center justify-center">
                <span className="text-xs text-white/20 uppercase tracking-widest">No photo yet</span>
              </div>
            )}

            {!isShipped && (
              <div className="flex flex-col gap-3">
                <input type="file" accept="image/*" onChange={handleFileChange}
                  className="block w-full text-xs text-white/40 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-white/10 file:text-white/60 hover:file:bg-white/15 cursor-pointer" />
                {preview && (
                  <div className="rounded-xl overflow-hidden border border-white/10 aspect-video w-full">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                {photoFile && (
                  <button onClick={handleUpload} disabled={uploading}
                    className="w-full rounded-full bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-widest py-2.5 hover:bg-white/15 disabled:opacity-40 transition-all">
                    {uploading ? 'Uploading…' : packingPhotoSrc ? 'Replace Photo' : 'Upload Packing Photo'}
                  </button>
                )}
              </div>
            )}

            <ErrorMessage message={error} onDismiss={() => setError(null)} />

            {!isShipped && order.status === 'PACKED' && !shipSuccess && (
              <button onClick={handleShip} disabled={shipping}
                className="w-full rounded-full bg-gradient-to-r from-red-800 to-red-600 text-white text-xs font-bold uppercase tracking-widest py-3 hover:from-red-700 hover:to-red-500 disabled:opacity-40 shadow-lg shadow-red-900/40 transition-all">
                {shipping ? 'Confirming…' : '✓ Confirm Shipment'}
              </button>
            )}

            {(isShipped || shipSuccess) && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-green-400 text-center">
                ✓ Order Shipped
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
