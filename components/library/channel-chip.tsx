'use client'

import { cn } from '@/lib/utils'
import { BAND_CONTROL } from '@/components/vela/filter-select'

const CHIP =
  'tap-target inline-flex cursor-pointer items-center rounded-full px-[calc(13rem/16)] whitespace-nowrap shadow-pop transition-[translate,box-shadow,background-color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg active:translate-x-px active:translate-y-px active:shadow-pop-none'

export function ChannelChip({
  label,
  on,
  onClick,
}: {
  label: string
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        CHIP,
        BAND_CONTROL,
        on
          ? 'border border-brand-line bg-brand-soft font-bold text-brand'
          : 'border border-line-strong bg-surface font-medium text-ink-2',
      )}
    >
      {label}
    </button>
  )
}
