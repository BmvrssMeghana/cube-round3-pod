"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import { cn } from "../lib/utils"
import type { UserRole } from "../types"

interface NavItem {
  id: UserRole
  name: string
}

interface FloatingIslandNavProps {
  items: NavItem[]
  activeRole: UserRole
  onRoleChange: (role: UserRole) => void
  className?: string
}

export function FloatingIslandNav({
  items,
  activeRole,
  onRoleChange,
  className,
}: FloatingIslandNavProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className={cn(
        "relative bg-black/80 backdrop-blur-xl border border-white/10 text-white rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden flex items-center justify-center shadow-xl shadow-black/40",
        isOpen ? "w-auto px-2 py-2 h-12" : "w-4 h-4 p-0",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="open"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            {items.map((item) => {
              const isActive = item.id === activeRole
              return (
                <button
                  key={item.id}
                  onClick={() => onRoleChange(item.id)}
                  className={cn(
                    "relative px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-red-800 to-red-600 text-white shadow-lg shadow-red-900/50"
                      : "text-white/50 hover:text-white hover:bg-white/10"
                  )}
                >
                  {item.name}
                </button>
              )
            })}
          </motion.div>
        ) : (
          <motion.div
            key="dot"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.2 }}
            className="w-2 h-2 bg-gradient-to-r from-red-600 to-red-400 rounded-full"
          />
        )}
      </AnimatePresence>
    </nav>
  )
}
