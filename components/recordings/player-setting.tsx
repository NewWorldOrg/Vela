'use client'

import type { ReactNode } from 'react'

/** One row of the gear: its name, and what is chosen there. */
export function Setting({
  label,
  children,
}: {
  label: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-dashed border-white/12 py-3.5 last:border-b-0">
      <span className="w-11 shrink-0 text-cap text-(--pl-ink-3)">{label}</span>
      {children}
    </div>
  )
}
