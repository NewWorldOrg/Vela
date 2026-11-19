'use client'

import { cn } from '@/lib/utils'
import {
  PICKED_TAIL,
  PICKED_UNIT,
  pickedSaying,
  type PickedSubject,
} from '@/lib/library-picking'

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
