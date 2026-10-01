import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  return (
    <main className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-black uppercase tracking-widest text-white">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-white/40 tracking-wide">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </main>
  )
}
