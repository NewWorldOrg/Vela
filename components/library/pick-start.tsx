'use client'

import { cn } from '@/lib/utils'
import { MARK_PLACE, MARK_SIZE, PickMark } from '@/components/library/pick-mark'

/** On a mouse's screen, what the picture under the pointer shows while the library is not choosing; drawn with `group/pick` on what holds the picture and `data-resting` on it while the pointer rests there. */
export const SHOWN_AT_REST =
  'opacity-0 transition-opacity duration-[140ms] ease-toy group-data-resting/pick:opacity-100 group-has-[[data-slot=pick-start]:focus-visible]/pick:opacity-100'

/** On a mouse's screen, the check that comes up over the head of a recording's picture while the pointer rests on it, or while the keyboard is on it, and starts the library choosing with that one taken. */
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
