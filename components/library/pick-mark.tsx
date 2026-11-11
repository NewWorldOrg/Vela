'use client'

import { cn } from '@/lib/utils'
import { CheckIcon } from '@/components/vela/icons'

/** The mark over a picture while the library is choosing: a rounded square cut from the picture by a white edge, filled with a tick once taken. */
export function PickMark({
  taken,
  size = 'row',
  className,
}: {
  taken: boolean
  size?: 'tile' | 'row' | 'phone'
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="pick-mark"
      data-taken={taken || undefined}
      className={cn(
        'pointer-events-none absolute z-[2] grid place-items-center text-on-accent',
        MARK_PLACE[size],
        MARK_SIZE[size],
        taken
          ? 'bg-accent-fill shadow-[0_0_0_2px_#fff,0_1px_3px_rgba(0,0,0,.35)]'
          : 'bg-[rgba(20,20,22,.22)] shadow-[inset_0_0_0_2px_#fff,0_1px_3px_rgba(0,0,0,.35)]',
        className,
      )}
    >
      {taken && <CheckIcon className={TICK_SIZE[size]} strokeWidth={3} />}
    </span>
  )
}

export const MARK_PLACE = {
  tile: 'top-[calc(9rem/16)] left-[calc(9rem/16)]',
  row: 'top-1.5 left-1.5',
  phone: 'top-1.5 left-1.5',
} as const

export const MARK_SIZE = {
  tile: 'size-[calc(22rem/16)] rounded-[calc(6rem/16)]',
  row: 'size-[calc(18rem/16)] rounded-[calc(6rem/16)]',
  phone: 'size-5 rounded-[calc(6rem/16)]',
} as const

const TICK_SIZE = {
  tile: 'size-[calc(15rem/16)]',
  row: 'size-3',
  phone: 'size-[calc(13rem/16)]',
} as const
