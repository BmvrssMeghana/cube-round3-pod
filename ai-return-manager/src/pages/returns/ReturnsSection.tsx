import { useEffect, useState } from 'react'
import { statsApi } from '../../api/client'
import { ElasticSliderNav } from '../../components/ElasticSliderNav'
import type { Return, Stats } from '../../types'
import { InspectReturnPage } from './InspectReturnPage'
import { ReturnsListPage } from './ReturnsListPage'

type Filter = 'total' | 'completed' | 'failed'

export function ReturnsSection() {
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [activeFilter, setActiveFilter] = useState<Filter>('total')
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, failed: 0 })
  const [open, setOpen] = useState(true)

  useEffect(() => {
    statsApi.get().then(setStats).catch(() => {})
    const id = setInterval(() => statsApi.get().then(setStats).catch(() => {}), 10_000)
    return () => clearInterval(id)
  }, [])

  const navItems = [
    { id: 'total',     label: 'Total Returns',    value: stats.total,     accent: 'white' as const },
    { id: 'completed', label: 'Completed Returns', value: stats.completed, accent: 'white' as const },
    { id: 'failed',    label: 'Failed Returns',    value: stats.failed,    accent: 'red'   as const },
  ]

  if (selectedReturn) {
    return (
      <InspectReturnPage
        ret={selectedReturn}
        onBack={() => setSelectedReturn(null)}
      />
    )
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative bg-[var(--bg)] text-[var(--text)]">

      {/* ── Sidebar ── */}
      <aside
        className={`
          shrink-0 border-r border-[var(--border)] bg-[var(--bg2)]
          flex flex-col overflow-hidden
          transition-all duration-300 ease-in-out z-20
          ${open ? 'w-60' : 'w-14'}
        `}
      >
        {/* Toggle button */}
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)] min-h-[52px]">
          {open && (
            <div className="px-2">
              <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">Navigation</span>
            </div>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close sidebar' : 'Open sidebar'}
            className="p-2 rounded-lg hover:bg-[var(--bg3)] text-[var(--text2)] transition-colors mx-auto"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Nav content */}
        <div className={`flex flex-col flex-1 px-3 py-4 gap-2 overflow-hidden transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text3)] px-3 mb-1">
            Filter Returns
          </p>

          <ElasticSliderNav
            items={navItems}
            activeId={activeFilter}
            onChange={(id) => {
              setActiveFilter(id as Filter)
            }}
          />

          <div className="mx-3 my-4 h-px bg-[var(--border)]" />

          <p className="text-xs text-[var(--text3)] px-3 leading-relaxed">
            Select a filter to inspect specific return categories.
          </p>
        </div>

        {/* Collapsed state */}
        {!open && (
          <div className="flex flex-col items-center gap-3 pt-4 px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveFilter(item.id as Filter); setOpen(true) }}
                title={`${item.label}: ${item.value}`}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  activeFilter === item.id
                    ? item.accent === 'red' ? 'bg-[var(--red)] scale-125' : 'bg-[var(--accent)] scale-125'
                    : 'bg-[var(--border2)] hover:bg-[var(--text3)]'
                }`}
              />
            ))}
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto">
        <ReturnsListPage
          onSelectReturn={setSelectedReturn}
          filter={activeFilter}
        />
      </div>

    </div>
  )
}

