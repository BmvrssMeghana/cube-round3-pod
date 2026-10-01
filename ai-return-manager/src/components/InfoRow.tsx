import type { ReactNode } from 'react'

interface InfoRowProps {
  label: string
  value: ReactNode
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-widest text-white/30 shrink-0">
        {label}
      </span>
      <span className="text-sm text-right text-white/80 font-medium">{value}</span>
    </div>
  )
}
