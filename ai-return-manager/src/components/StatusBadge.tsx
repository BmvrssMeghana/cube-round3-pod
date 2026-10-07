import type { DamageLevel, FinalDecision, OrderStatus, Recommendation, ReturnStatus } from '../types'

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'orange'

const variantClasses: Record<BadgeVariant, string> = {
  green:  'bg-[var(--green-bg)] text-[var(--green)] border border-[rgba(13,148,136,0.3)]',
  red:    'bg-[var(--red-bg)] text-[var(--red)] border border-[rgba(224,38,78,0.3)]',
  yellow: 'bg-[var(--amber-bg)] text-[var(--amber)] border border-[rgba(217,119,6,0.3)]',
  blue:   'bg-[var(--blue-bg)] text-[var(--blue)] border border-[rgba(37,99,235,0.3)]',
  gray:   'bg-[var(--muted-bg)] text-[var(--text3)] border border-[var(--border2)]',
  orange: 'bg-[var(--purple-bg)] text-[var(--purple)] border border-[rgba(124,58,237,0.3)]',
}

function badge(label: string, variant: BadgeVariant) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${variantClasses[variant]}`}>
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

