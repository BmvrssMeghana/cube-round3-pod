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
      <div className="max-w-xl mx-auto">
        <form onSubmit={handleSubmit} className="card-rm p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-6">

            {/* Reasons */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text2)] mb-3">
                Return Reason <span className="text-[var(--red)]">*</span>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {RETURN_REASONS.map((r) => (
                  <label key={r.value}
                    className={`flex items-center gap-3 cursor-pointer rounded-lg px-3.5 py-3 border transition-all ${
                      reason === r.value
                        ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--text)] font-semibold'
                        : 'border-[var(--border)] bg-[var(--bg3)] text-[var(--text2)] hover:border-[var(--border2)]'
                    }`}>
                    <input type="radio" name="reason" value={r.value} checked={reason === r.value}
                      onChange={() => setReason(r.value)} className="accent-[var(--accent)]" />
                    <span className="text-xs">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text2)] mb-1.5">
                Additional Details <span className="text-[var(--text3)] font-normal">(optional)</span>
              </label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                placeholder="Describe the issue in detail…"
                className="w-full rounded-lg bg-[var(--bg3)] border border-[var(--border2)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--accent)] resize-none transition-colors" />
            </div>

            {/* Photo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text2)] mb-1.5">
                Product Photo <span className="text-[var(--text3)] font-normal">(recommended)</span>
              </label>
              <input type="file" accept="image/*" onChange={handlePhotoChange}
                className="block w-full text-xs text-[var(--text2)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-[var(--border2)] file:text-xs file:font-semibold file:bg-[var(--bg3)] file:text-[var(--text)] hover:file:bg-[var(--border)] cursor-pointer" />
              {preview && (
                <div className="mt-3 rounded-lg overflow-hidden border border-[var(--border)] w-40 h-40 bg-[var(--bg3)]">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <ErrorMessage message={error} onDismiss={() => setError(null)} />

            <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
              <button type="button" onClick={onCancel}
                className="btn-secondary-rm flex-1">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="btn-primary-rm flex-1">
                {submitting ? 'Submitting…' : 'Submit Return'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  )
}

