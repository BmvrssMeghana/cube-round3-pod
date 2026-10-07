import { useEffect, useState } from 'react'
import type { UserRole } from '../types'

interface HeaderProps {
  activeRole: UserRole
  onRoleChange: (role: UserRole) => void
}

export function Header({ activeRole, onRoleChange }: HeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    if (current === 'dark') {
      setTheme('dark')
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
      setTheme('light')
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <header className="relative sticky top-0 z-50 flex items-center justify-between px-7 py-3.5 bg-[var(--bg2)] border-b border-[var(--border)]">
      {/* Left: Brand logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center font-black text-base border border-[rgba(13,148,136,0.3)] shadow-sm">
          ❖
        </div>
        <div>
          <span className="font-extrabold text-base tracking-tight text-[var(--text)] uppercase">RETURN</span>
        </div>
      </div>

      {/* Center: Dashboard title (Middle Upper) */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <h1 className="text-xl font-bold text-[var(--text)]">Dashboard</h1>
      </div>

      {/* Right: Role Switcher & Theme */}
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-[var(--bg3)] p-1.5 rounded-xl border-2 border-[var(--border2)] gap-2 shadow-inner">
          <button
            onClick={() => onRoleChange('returns')}
            className={`px-5 py-2 rounded-lg text-sm font-extrabold tracking-wider transition-all border ${
              activeRole === 'returns'
                ? 'bg-[var(--accent)] text-white border-[rgba(255,255,255,0.4)] shadow-md'
                : 'text-[var(--text2)] border-transparent hover:border-[var(--border2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]'
            }`}
          >
            Returns
          </button>
          <button
            onClick={() => onRoleChange('customer')}
            className={`px-5 py-2 rounded-lg text-sm font-extrabold tracking-wider transition-all border ${
              activeRole === 'customer'
                ? 'bg-[var(--accent)] text-white border-[rgba(255,255,255,0.4)] shadow-md'
                : 'text-[var(--text2)] border-transparent hover:border-[var(--border2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]'
            }`}
          >
            Customer
          </button>
          <button
            onClick={() => onRoleChange('packing')}
            className={`px-5 py-2 rounded-lg text-sm font-extrabold tracking-wider transition-all border ${
              activeRole === 'packing'
                ? 'bg-[var(--accent)] text-white border-[rgba(255,255,255,0.4)] shadow-md'
                : 'text-[var(--text2)] border-transparent hover:border-[var(--border2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]'
            }`}
          >
            Packing
          </button>
        </div>

        <button onClick={toggleTheme} className="btn-theme tracking-wider border-2 border-[var(--border2)]">
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </header>
  )
}



