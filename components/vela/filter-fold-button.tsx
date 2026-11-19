'use client'

import { cn } from '@/lib/utils'
import { BAND_CONTROL, BAND_PRESS } from '@/components/vela/band'
import { FilterIcon } from '@/components/vela/icons'

export type FoldsOn = 'phone' | 'handheld'

const BUTTON_SHOWN_ON: Record<FoldsOn, string> = {
  phone: 'min-[600px]:hidden',
  handheld: 'hidden max-[600px]:inline-flex sideways:inline-flex',
}

const FOLDED_ON: Record<FoldsOn, string> = {
  phone: 'max-[600px]:hidden',
  handheld: 'max-[600px]:hidden sideways:hidden',
}

export function foldedFiltersOf(
  open: boolean,
  on: FoldsOn = 'phone',
): string | undefined {
  return open ? undefined : FOLDED_ON[on]
}

export function FilterFoldButton({
  open,
  onOpenChange,
  controls,
  narrowed,
  on = 'phone',
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  controls: string
  narrowed: number
  on?: FoldsOn
  className?: string
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={() => onOpenChange(!open)}
      className={cn(
        BAND_CONTROL,
        BAND_PRESS,
        'shrink-0',
        BUTTON_SHOWN_ON[on],
        open && 'border-brand bg-brand-soft text-brand [&_svg]:text-brand',
        className,
      )}
    >
      <FilterIcon />
      絞り込み
      {narrowed > 0 && ' '}
      {narrowed > 0 && (
        <b className="font-code font-bold text-brand tabular-nums">
          {narrowed}
        </b>
      )}
    </button>
  )
}
