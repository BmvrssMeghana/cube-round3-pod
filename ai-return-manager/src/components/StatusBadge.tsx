import type { DamageLevel, FinalDecision, OrderStatus, Recommendation, ReturnStatus } from '../types'

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'orange'

const variantClasses: Record<BadgeVariant, string> = {
  green:  'bg-green-500/15 text-green-400 border border-green-500/30',
  red:    'bg-red-500/15 text-red-400 border border-red-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  blue:   'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  gray:   'bg-white/5 text-white/40 border border-white/10',
  orange: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
}

function badge(label: string, variant: BadgeVariant) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${variantClasses[variant]}`}>
      {label}
    </span>
  )
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, [string, BadgeVariant]> = {
    PENDING:          ['Pending',          'gray'],
    PACKED:           ['Packed',           'blue'],
    SHIPPED:          ['Shipped',          'blue'],
    DELIVERED:        ['Delivered',        'green'],
    RETURN_REQUESTED: ['Return Requested', 'yellow'],
    RETURNED:         ['Returned',         'orange'],
  }
  const [label, variant] = map[status] ?? [status, 'gray']
  return badge(label, variant)
}

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  const map: Record<ReturnStatus, [string, BadgeVariant]> = {
    PENDING:       ['Pending',       'gray'],
    INSPECTING:    ['Inspecting',    'blue'],
    ACCEPTED:      ['Accepted',      'green'],
    REJECTED:      ['Rejected',      'red'],
    MANUAL_REVIEW: ['Manual Review', 'yellow'],
  }
  const [label, variant] = map[status] ?? [status, 'gray']
  return badge(label, variant)
}

export function DamageLevelBadge({ level }: { level: DamageLevel | null }) {
  if (!level) return badge('Unknown', 'gray')
  const map: Record<DamageLevel, [string, BadgeVariant]> = {
    NONE:   ['None',   'green'],
    LOW:    ['Low',    'yellow'],
    MEDIUM: ['Medium', 'orange'],
    HIGH:   ['High',   'red'],
  }
  const [label, variant] = map[level] ?? [level, 'gray']
  return badge(label, variant)
}

export function RecommendationBadge({ rec }: { rec: Recommendation | null }) {
  if (!rec) return badge('—', 'gray')
  const map: Record<Recommendation, [string, BadgeVariant]> = {
    ACCEPT:        ['Accept',        'green'],
    REJECT:        ['Reject',        'red'],
    MANUAL_REVIEW: ['Manual Review', 'yellow'],
  }
  const [label, variant] = map[rec] ?? [rec, 'gray']
  return badge(label, variant)
}

export function FinalDecisionBadge({ decision }: { decision: FinalDecision | null }) {
  if (!decision) return null
  const map: Record<FinalDecision, [string, BadgeVariant]> = {
    ACCEPTED:      ['Accepted by Operator',   'green'],
    REJECTED:      ['Rejected by Operator',   'red'],
    MANUAL_REVIEW: ['Sent for Manual Review', 'yellow'],
  }
  const [label, variant] = map[decision] ?? [decision, 'gray']
  return badge(label, variant)
}
