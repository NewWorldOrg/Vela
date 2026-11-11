'use client'

import { useRef, type Ref } from 'react'

import { cn } from '@/lib/utils'
import { foldBand, type FoldMotion } from '@/lib/live-fold'
import { useSettled } from '@/components/live/channel-fold'
import { stepOf } from '@/components/live/remote-column-palette'

/** Where the remote is drawn in the column, under the head: the remote stands at its own height at the top, and a window too short for it scrolls the column. It slides in from the right after the head, and out before it. */
export function RemoteSlot({
  id,
  motion,
  onLeft,
  slotRef,
}: {
  id: string
  motion: FoldMotion
  onLeft?: () => void
  slotRef: Ref<HTMLDivElement>
}) {
  const whole = useRef<HTMLDivElement>(null)

  useSettled(whole, onLeft ? motion.phase : 'still', onLeft)

  return (
    <div
      ref={whole}
      data-fold={motion.phase}
      className="-mr-1 min-h-0 overflow-x-hidden overflow-y-auto pr-1 pb-1 data-[fold=closing]:pointer-events-none"
    >
      <div
        id={id}
        ref={slotRef}
        data-slot="remote-slot"
        style={{ transitionDelay: stepOf(1, motion) }}
        className={cn('w-full', foldBand(motion))}
      />
    </div>
  )
}
