'use client'

import { cn } from '@/lib/utils'
import { MARK_PLACE, MARK_SIZE, PickMark } from '@/components/library/pick-mark'

export const SHOWN_AT_REST =
  'opacity-0 transition-opacity duration-[140ms] ease-toy group-data-resting/pick:opacity-100 group-has-[[data-slot=pick-start]:focus-visible]/pick:opacity-100'

export function PickStart({
  title,
  size,
  onStart,
}: {
  title: string
  size: 'tile' | 'row'
  onStart: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={false}
      aria-label={`${title} を選ぶ`}
      data-slot="pick-start"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onStart()
      }}
      className={cn(
        'tap-target absolute z-[3] grid cursor-pointer place-items-center outline-none focus-visible:shadow-ring',
        MARK_PLACE[size],
        MARK_SIZE[size],
        SHOWN_AT_REST,
        'focus-visible:opacity-100',
      )}
    >
      <PickMark taken={false} size={size} className="static" />
    </button>
  )
}
