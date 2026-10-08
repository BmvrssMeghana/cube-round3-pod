import { useState } from 'react'
import { Header } from './components/Header'
import { CustomerSection } from './pages/customer/CustomerSection'
import { PackingSection } from './pages/packing/PackingSection'
import { ReturnsSection } from './pages/returns/ReturnsSection'
import type { UserRole } from './types'

export default function App() {
  const [role, setRole] = useState<UserRole>('returns')

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
      <Header activeRole={role} onRoleChange={setRole} />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-auto bg-[var(--bg)]">
          {role === 'customer' && <CustomerSection />}
          {role === 'packing'  && <PackingSection />}
          {role === 'returns'  && <ReturnsSection />}
        </main>
      </div>
    </div>
  )
}


