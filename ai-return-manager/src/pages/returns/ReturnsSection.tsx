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
  const [open, setOpen] = useState(false)

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
    <div className="flex flex-1 min-h-0 overflow-hidden relative">

      {/* ── Sidebar ── */}
      <aside
        className={`
          shrink-0 border-r border-white/5 bg-black/50 backdrop-blur-sm
          flex flex-col overflow-hidden
          transition-all duration-300 ease-in-out
          ${open ? 'w-56' : 'w-12'}
        `}
      >
        {/* Toggle button — 3 lines (hamburger) when closed, × when open */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close sidebar' : 'Open sidebar'}
          className="shrink-0 flex flex-col items-center justify-center gap-1.5 h-12 w-12 hover:bg-white/5 transition-colors"
        >
          {open ? (
            /* × close icon */
            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            /* 3-line hamburger */
            <>
              <span className="block w-4 h-0.5 bg-white/50 rounded-full" />
              <span className="block w-4 h-0.5 bg-white/50 rounded-full" />
              <span className="block w-4 h-0.5 bg-white/50 rounded-full" />
            </>
          )}
        </button>

        {/* Divider */}
        <div className="h-px bg-white/5 mx-2" />

        {/* Nav content — only visible when open */}
        <div className={`flex flex-col flex-1 px-3 py-4 gap-1 overflow-hidden transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

          <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 px-4 mb-3">
            Return Manager
          </p>

          <ElasticSliderNav
            items={navItems}
            activeId={activeFilter}
            onChange={(id) => {
              setActiveFilter(id as Filter)
              // keep sidebar open after selection
            }}
          />

          <div className="mx-4 my-4 h-px bg-white/5" />

          <p className="text-[9px] text-white/15 uppercase tracking-widest px-4 leading-relaxed">
            Select a filter to view the relevant return requests.
          </p>
        </div>

        {/* Collapsed state — show dots indicating active filter */}
        {!open && (
          <div className="flex flex-col items-center gap-2 pt-4 px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveFilter(item.id as Filter); setOpen(true) }}
                title={`${item.label}: ${item.value}`}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  activeFilter === item.id
                    ? item.accent === 'red' ? 'bg-red-500 scale-125' : 'bg-white scale-125'
                    : 'bg-white/15 hover:bg-white/30'
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
