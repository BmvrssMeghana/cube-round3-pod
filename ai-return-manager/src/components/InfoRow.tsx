import type { ReactNode } from 'react'

interface InfoRowProps {
  label: string
  value: ReactNode
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--border)] last:border-0">
      <span className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wider shrink-0">
        {label}
      </span>
      <span className="text-sm text-right text-[var(--text)] font-medium">{value}</span>
    </div>
  )
}

