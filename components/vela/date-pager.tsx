'use client'

import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/vela/icon-button'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/vela/icons'

/**
 * Day-by-day paging for the programme guide. The date is set in the code face
 * with tabular figures so the digits stay in the same columns as it changes.
 */
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
      className={cn('flex items-center gap-2.5', className)}
      {...props}
    >
      <IconButton aria-label={prevLabel} onClick={onPrev}>
        <ChevronLeftIcon />
      </IconButton>
      <span className="min-w-[88px] text-center font-code text-[14px] font-medium tabular-nums">
        {label}
      </span>
      <IconButton aria-label={nextLabel} onClick={onNext}>
        <ChevronRightIcon />
      </IconButton>
      <span
        aria-hidden="true"
        className="mx-0.5 h-[22px] w-px border-l border-dashed border-line-strong"
      />
      <Button variant="outline" size="sm" onClick={onToday}>
        {todayLabel}
      </Button>
    </div>
  )
}
