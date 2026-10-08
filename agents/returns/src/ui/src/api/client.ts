/**
 * Typed API client for the Return Manager backend.
 * All calls go through the `request` helper which handles errors uniformly.
 */
import type {
  CreateOrderPayload,
  CreateReturnPayload,
  DecisionPayload,
  Inspection,
  Order,
  Product,
  Return,
  Stats,
} from '../types'

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://return-manager-backend.onrender.com' : 'http://127.0.0.1:8000')

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
    })
  } catch (err) {
    // Retry with relative proxy path if direct 127.0.0.1 fetch fails
    res = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
    })
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      message = body.detail ?? JSON.stringify(body)
    } catch {
      // non-JSON error body — keep the status message
    }
    throw new Error(message)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// Multipart/form-data upload — no Content-Type header (browser sets boundary)
async function upload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      message = body.detail ?? JSON.stringify(body)
    } catch {}
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

// ─── Products ─────────────────────────────────────────────────────────────────

export const productsApi = {
  list: () => request<Product[]>('/products'),
  get: (id: number) => request<Product>(`/products/${id}`),
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export const ordersApi = {
  create: (payload: CreateOrderPayload) =>
    request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  list: () => request<Order[]>('/orders'),

  get: (id: number) => request<Order>(`/orders/${id}`),
}

// ─── Packing ──────────────────────────────────────────────────────────────────

export const packingApi = {
  uploadPhoto: (orderId: number, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return upload<Order>(`/packing/${orderId}/photo`, fd)
  },

  ship: (orderId: number) =>
    request<Order>(`/packing/${orderId}/ship`, { method: 'POST' }),
}

// ─── Returns ──────────────────────────────────────────────────────────────────

export const returnsApi = {
  create: (payload: CreateReturnPayload) =>
    request<Return>('/returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  list: () => request<Return[]>('/returns'),

  get: (id: number) => request<Return>(`/returns/${id}`),

  uploadPhoto: (returnId: number, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return upload<Return>(`/returns/${returnId}/photo`, fd)
  },
}

// ─── Inspections ──────────────────────────────────────────────────────────────

export const inspectionsApi = {
  run: (returnId: number) =>
    request<Inspection>(`/returns/${returnId}/inspect`, { method: 'POST' }),

  get: (returnId: number) => request<Inspection>(`/inspections/${returnId}`),
}

// ─── Decisions ────────────────────────────────────────────────────────────────

export const decisionsApi = {
  approve: (returnId: number, payload: DecisionPayload) =>
    request<Inspection>(`/returns/${returnId}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reject: (returnId: number, payload: DecisionPayload) =>
    request<Inspection>(`/returns/${returnId}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  manualReview: (returnId: number, payload: DecisionPayload) =>
    request<Inspection>(`/returns/${returnId}/manual-review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export const statsApi = {
  get: () => request<Stats>('/stats'),
}

// ─── Image URL helper ─────────────────────────────────────────────────────────

/**
 * Turn a relative upload path (e.g. "packing/order_1_abc.jpg")
 * into a full URL that can be used in an <img> src.
 */
export function imageUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null
  return `${BASE_URL}/uploads/${relativePath}`
}
