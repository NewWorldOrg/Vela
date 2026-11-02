'use client'

import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { BAND_PRESS } from '@/components/vela/band'
import { IconButton } from '@/components/vela/icon-button'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/vela/icons'

/** Steps a day at a time: a side without a day to go to cannot be pressed, and `今日` is there only away from today. */
export function DatePager({
  label,
  onPrev,
  onNext,
  onToday,
  todayLabel = '今日',
  prevLabel = '前の日',
  nextLabel = '次の日',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  label: string
  onPrev?: () => void
  onNext?: () => void
  onToday?: () => void
  todayLabel?: string
  prevLabel?: string
  nextLabel?: string
}) {
  return (
    <div
      data-slot="date-pager"
      className={cn('flex shrink-0 items-center gap-2', className)}
      {...props}
    >
      <IconButton aria-label={prevLabel} disabled={!onPrev} onClick={onPrev}>
        <ChevronLeftIcon />
      </IconButton>
      <span className="min-w-[calc(88rem/16)] text-center font-code text-title font-bold whitespace-nowrap tabular-nums">
        {label}
      </span>
      <IconButton aria-label={nextLabel} disabled={!onNext} onClick={onNext}>
        <ChevronRightIcon />
      </IconButton>
      {onToday && (
        <button
          type="button"
          onClick={onToday}
          className={cn(BAND_PRESS, 'ml-1 h-9')}
        >
          {todayLabel}
        </button>
      )}
    </div>
  )
}
