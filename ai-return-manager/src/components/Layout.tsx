import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  return (
    <div className="p-8 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
      {(title || subtitle) && (
        <div className="mb-4 pb-3 border-b border-[var(--border)]">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--text3)] mt-1 tracking-wide">{subtitle}</p>}
        </div>
      )}

      <div>
        {children}
      </div>
    </div>
  )
}



