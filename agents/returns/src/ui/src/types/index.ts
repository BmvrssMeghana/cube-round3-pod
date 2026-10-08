// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'

export type ReturnStatus =
  | 'PENDING'
  | 'INSPECTING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'MANUAL_REVIEW'

export type DamageLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'

export type Recommendation = 'ACCEPT' | 'REJECT' | 'MANUAL_REVIEW'

export type FinalDecision = 'ACCEPTED' | 'REJECTED' | 'MANUAL_REVIEW'

export type UserRole = 'customer' | 'packing' | 'returns'

// ─── Domain models ────────────────────────────────────────────────────────────

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  required_components: string[]
  stock: number
}

export interface Order {
  id: number
  customer_name: string
  customer_email: string
  product_id: number
  quantity: number
  status: OrderStatus
  packing_photo_url: string | null
  created_at: string
  shipped_at: string | null
  product: Product | null
}

export interface Return {
  id: number
  order_id: number
  reason: string
  reason_description: string | null
  returned_photo_url: string | null
  status: ReturnStatus
  created_at: string
  updated_at: string
  order: Order | null
}

export interface DamageItem {
  type: string
  severity: 'low' | 'medium' | 'high'
  confidence: number
}

export interface ScratchItem {
  location: string
  severity: 'minor' | 'moderate' | 'severe'
}

export interface Inspection {
  id: number
  return_id: number
  product_match: boolean | null
  missing_parts: string[]
  damage: DamageItem[]
  scratches: ScratchItem[]
  return_reason_supported: boolean | null
  damage_level: DamageLevel | null
  confidence: number | null
  recommendation: Recommendation | null
  evidence: string[]
  final_decision: FinalDecision | null
  operator_note: string | null
  decided_by: string | null
  decided_at: string | null
  created_at: string
}

export interface Stats {
  total: number
  completed: number
  failed: number
}

// ─── Request payloads ─────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  customer_name: string
  customer_email: string
  product_id: number
  quantity: number
}

export interface CreateReturnPayload {
  order_id: number
  reason: string
  reason_description?: string
}

export interface DecisionPayload {
  decision: FinalDecision
  operator_note?: string
  decided_by?: string
}
