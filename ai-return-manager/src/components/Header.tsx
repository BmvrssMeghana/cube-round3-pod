import type { UserRole } from '../types'
import { FloatingIslandNav } from './FloatingIslandNav'

interface HeaderProps {
  activeRole: UserRole
  onRoleChange: (role: UserRole) => void
}

const NAV_ITEMS = [
  { id: 'customer' as UserRole, name: 'Customer' },
  { id: 'packing'  as UserRole, name: 'Packing Manager' },
  { id: 'returns'  as UserRole, name: 'Return Manager' },
]

export function Header({ activeRole, onRoleChange }: HeaderProps) {
  return (
    <header className="bg-black/80 backdrop-blur-md border-b border-white/10">
      {/* Title */}
      <div className="flex items-center justify-center px-6 pt-4 pb-3">
        <h1 className="text-xl font-black tracking-[0.2em] uppercase text-white select-none">
          Return Manager
        </h1>
      </div>

      {/* Floating Island Nav — centred below the title */}
      <div className="flex justify-center pb-4">
        <FloatingIslandNav
          items={NAV_ITEMS}
          activeRole={activeRole}
          onRoleChange={onRoleChange}
        />
      </div>
    </header>
  )
}
