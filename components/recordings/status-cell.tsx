import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import type { BadgeWidth } from '@/components/ui/badge'

export const COLUMN_WIDE: BadgeWidth = 'column'

const CHIPS = 'flex flex-col items-stretch gap-[3px]'

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
