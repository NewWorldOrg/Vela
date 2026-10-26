'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const ROW = 'border-b border-dashed border-white/12 py-3.5 last:border-b-0'

const CHOICES = 'flex flex-wrap items-center gap-x-3 gap-y-1.5'

/** One row of the gear: its name, what is chosen there, and the one line that says why it cannot be chosen. */
export function Setting({
  label,
  note,
  children,
}: {
  label: string
  note?: string
  children?: ReactNode
}) {
  const named = (
    <span className="w-11 shrink-0 text-cap text-(--pl-ink-3)">{label}</span>
  )

  if (note === undefined) {
    return (
      <div className={cn(CHOICES, ROW)}>
        {named}
        {children}
      </div>
    )
  }

  return (
    <div className={ROW}>
      <div className={CHOICES}>
        {named}
        {children}
      </div>
      <p
        data-slot="gear-reason"
        className="mt-2 w-0 min-w-full text-sub text-(--pl-ink-3)"
      >
        {note}
      </p>
    </div>
  )
}
