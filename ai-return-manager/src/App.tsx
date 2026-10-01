import { useState } from 'react'
import RibbonGlow from './components/RibbonGlow'
import { Header } from './components/Header'
import { CustomerSection } from './pages/customer/CustomerSection'
import { PackingSection } from './pages/packing/PackingSection'
import { ReturnsSection } from './pages/returns/ReturnsSection'
import type { UserRole } from './types'

export default function App() {
  const [role, setRole] = useState<UserRole>('customer')

  return (
    <div className="flex flex-col h-full relative">

      {/* ── RibbonGlow WebGL background — fixed, behind everything ── */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <RibbonGlow
          background="#000000"
          color1="#cc0000"
          color2="#ff2222"
          speed={24}
          hover={31}
          size={100}
          angle={-180}
        />
      </div>

      {/* ── App UI — sits above the background ── */}
      <div className="relative z-10 flex flex-col h-full">
        <Header activeRole={role} onRoleChange={setRole} />

        <div className="flex-1 overflow-auto">
          {role === 'customer' && <CustomerSection />}
          {role === 'packing'  && <PackingSection />}
          {role === 'returns'  && <ReturnsSection />}
        </div>
      </div>

    </div>
  )
}
