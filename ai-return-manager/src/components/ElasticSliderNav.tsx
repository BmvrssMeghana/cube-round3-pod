import { useEffect, useRef, useState } from 'react'

interface NavItem {
  id: string
  label: string
  value: number
  accent?: 'white' | 'red'
}

interface ElasticSliderNavProps {
  items: NavItem[]
  activeId: string
  onChange: (id: string) => void
}

const NAV_ICONS: Record<string, string> = {
  total: '❖',
  completed: '⊞',
  failed: '✦',
}

export function ElasticSliderNav({ items, activeId, onChange }: ElasticSliderNavProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [sliderStyle, setSliderStyle] = useState({ top: 0, height: 0 })
  const [elastic, setElastic] = useState(false)

  // Move the sliding indicator to the active item
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector<HTMLButtonElement>(`[data-id="${activeId}"]`)
    if (!activeEl) return

    const parentTop = listRef.current.getBoundingClientRect().top
    const itemTop   = activeEl.getBoundingClientRect().top
    const relTop    = itemTop - parentTop

    setElastic(true)
    setSliderStyle({ top: relTop, height: activeEl.offsetHeight })

    const t = setTimeout(() => setElastic(false), 300)
    return () => clearTimeout(t)
  }, [activeId])

  return (
    <div className="relative flex flex-col gap-1.5" ref={listRef}>
      {/* Sliding indicator matching reference pill */}
      <div
        className="absolute left-0 right-0 rounded-xl bg-[var(--purple-bg)] border border-[rgba(124,58,237,0.2)] pointer-events-none shadow-sm"
        style={{
          top: sliderStyle.top,
          height: sliderStyle.height,
          transition: elastic
            ? 'top 0.3s cubic-bezier(0.34,1.56,0.64,1), height 0.3s cubic-bezier(0.34,1.56,0.64,1)'
            : 'none',
        }}
      />

      {/* Items */}
      {items.map((item) => {
        const isActive = item.id === activeId
        const icon = NAV_ICONS[item.id] || '✦'
        return (
          <button
            key={item.id}
            data-id={item.id}
            onClick={() => onChange(item.id)}
            className={`relative z-10 w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
              isActive ? 'text-[#6366f1] font-bold' : 'text-[var(--text2)] font-medium hover:text-[var(--text)] hover:bg-[var(--bg3)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-sm ${isActive ? 'text-[#6366f1]' : 'text-[var(--text3)]'}`}>{icon}</span>
              <span className="text-[13px] tracking-tight">{item.label}</span>
            </div>
            <span className={`text-sm font-bold tabular-nums ${
              item.accent === 'red' ? 'text-[var(--red)]' : isActive ? 'text-[#6366f1]' : 'text-[var(--text3)]'
            }`}>
              {item.value}
            </span>
          </button>
        )
      })}
    </div>
  )
}

