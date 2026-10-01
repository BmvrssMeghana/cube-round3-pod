/**
 * ElasticSliderNav — vertical left sidebar nav with elastic sliding indicator.
 * Used in the Return Manager section to show Total / Completed / Failed filters.
 */
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
    <div className="relative" ref={listRef}>
      {/* Sliding indicator */}
      <div
        className="absolute left-0 right-0 rounded-xl bg-gradient-to-r from-red-900/60 to-red-700/30 border border-red-500/20 pointer-events-none"
        style={{
          top: sliderStyle.top,
          height: sliderStyle.height,
          transition: elastic
            ? 'top 0.35s cubic-bezier(0.34,1.56,0.64,1), height 0.35s cubic-bezier(0.34,1.56,0.64,1)'
            : 'none',
        }}
      />

      {/* Items */}
      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            data-id={item.id}
            onClick={() => onChange(item.id)}
            className={`relative z-10 w-full flex items-center justify-between px-4 py-4 rounded-xl transition-colors ${
              isActive ? 'text-white' : 'text-white/30 hover:text-white/60'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            <span className={`text-2xl font-black tabular-nums leading-none ${
              item.accent === 'red' ? 'text-red-500' : 'text-white'
            }`}>
              {item.value}
            </span>
          </button>
        )
      })}
    </div>
  )
}
