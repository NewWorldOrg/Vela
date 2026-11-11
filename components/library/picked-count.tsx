'use client'

import { cn } from '@/lib/utils'
import {
  PICKED_TAIL,
  PICKED_UNIT,
  pickedSaying,
  type PickedSubject,
} from '@/lib/library-picking'

/** How many are picked, or while none is, that recordings are to be chosen. On a phone's band the word after the count goes when the width is too narrow for the three presses beside it. */
export function PickedCount({
  count,
  subject,
  className,
  onABand = false,
}: {
  count: number
  subject: PickedSubject
  className: string
  onABand?: boolean
}) {
  if (count === 0) {
    return (
      <span className={cn(className, 'text-ink-2')}>
        {pickedSaying(count, subject)}
      </span>
    )
  }

  return (
    <span className={cn(className, 'text-ink')}>
      <span className="font-code">{count}</span>
      {onABand ? (
        <>
          {PICKED_UNIT}
          <span className="max-[479px]:hidden">{PICKED_TAIL}</span>
        </>
      ) : (
        `${PICKED_UNIT}${PICKED_TAIL}`
      )}
    </span>
  )
}
