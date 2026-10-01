import { useState } from 'react'
import { returnsApi } from '../../api/client'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Layout } from '../../components/Layout'
import type { Order } from '../../types'

const RETURN_REASONS = [
  { value: 'defective',           label: 'Defective / Not working' },
  { value: 'damaged_in_shipping', label: 'Damaged in shipping' },
  { value: 'wrong_item',          label: 'Wrong item received' },
  { value: 'not_as_described',    label: 'Not as described' },
  { value: 'changed_mind',        label: 'Changed my mind' },
  { value: 'missing_parts',       label: 'Missing parts / accessories' },
]

interface RequestReturnPageProps {
  order: Order
  onSuccess: () => void
  onCancel: () => void
}

export function RequestReturnPage({ order, onSuccess, onCancel }: RequestReturnPageProps) {
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhoto(file)
    setPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason) { setError('Please select a return reason.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const ret = await returnsApi.create({ order_id: order.id, reason, reason_description: description || undefined })
      if (photo) await returnsApi.uploadPhoto(ret.id, photo)
      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout title="Request Return"
      subtitle={`Order #${order.id} · ${order.product?.name ?? `Product #${order.product_id}`}`}>
      <div className="max-w-lg">
        <form onSubmit={handleSubmit} className="rounded-2xl card-red p-6 flex flex-col gap-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(180,0,0,0.2),transparent_70%)] pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-5">

            {/* Reasons */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">
                Return Reason <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col gap-2">
                {RETURN_REASONS.map((r) => (
                  <label key={r.value}
                    className={`flex items-center gap-3 cursor-pointer rounded-xl px-4 py-3 border transition-all ${
                      reason === r.value
                        ? 'border-red-500/50 bg-red-500/10'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/5'
                    }`}>
                    <input type="radio" name="reason" value={r.value} checked={reason === r.value}
                      onChange={() => setReason(r.value)} className="accent-red-500" />
                    <span className="text-sm text-white/70">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
                Additional Details <span className="text-white/20">(optional)</span>
              </label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                placeholder="Describe the issue…"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 resize-none transition-colors" />
            </div>

            {/* Photo */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
                Product Photo <span className="text-white/20">(recommended)</span>
              </label>
              <input type="file" accept="image/*" onChange={handlePhotoChange}
                className="block w-full text-xs text-white/40 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-white/10 file:text-white/60 hover:file:bg-white/15 cursor-pointer" />
              {preview && (
                <div className="mt-3 rounded-xl overflow-hidden border border-white/10 w-40 h-40">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <ErrorMessage message={error} onDismiss={() => setError(null)} />

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onCancel}
                className="flex-1 rounded-full border border-white/15 text-white/50 text-xs font-bold uppercase tracking-widest py-2.5 hover:border-white/30 hover:text-white/70 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 rounded-full bg-gradient-to-r from-red-800 to-red-600 text-white text-xs font-bold uppercase tracking-widest py-2.5 hover:from-red-700 hover:to-red-500 disabled:opacity-40 transition-all">
                {submitting ? 'Submitting…' : 'Submit Return'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  )
}
