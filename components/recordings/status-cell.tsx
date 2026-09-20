import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const CHIPS =
  'flex flex-col items-stretch gap-[3px] [&_[data-slot=badge]]:w-full [&_[data-slot=badge]]:justify-start'

export function StatusCell({
  note,
  noteTone = 'text-ink-3',
  noteClassName,
  children,
}: {
  note?: ReactNode
  noteTone?: string
  noteClassName?: string
  children: ReactNode
}) {
  return (
    <span
      data-slot="status-cell"
      className="flex flex-col items-stretch gap-[3px]"
    >
      <span data-slot="status-cell-chips" className={CHIPS}>
        {children}
      </span>
      {note && (
        <span
          className={cn(
            'block text-[10.5px] leading-relaxed',
            noteTone,
            noteClassName,
          )}
        >
          {note}
        </span>
      )}
    </span>
  )
}
