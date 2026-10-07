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
        "relative bg-[var(--bg3)] backdrop-blur-xl border border-[var(--border2)] text-[var(--text)] rounded-full transition-all duration-300 ease-out overflow-hidden flex items-center justify-center shadow-lg",
        isOpen ? "w-auto px-2 py-1.5 h-11" : "w-4 h-4 p-0",
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
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            {items.map((item) => {
              const isActive = item.id === activeRole
              return (
                <button
                  key={item.id}
                  onClick={() => onRoleChange(item.id)}
                  className={cn(
                    "relative px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] text-white shadow-md"
                      : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]"
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
            className="w-2 h-2 bg-indigo-500 rounded-full"
          />
        )}
      </AnimatePresence>
    </nav>
  )
}
