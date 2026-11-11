'use client'

import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { PHONE_BAR_BUTTON } from '@/components/vela/app-shell'
import { iconButtonVariants } from '@/components/vela/icon-button'

/** A tool in the bar: a round button of 40px, in the accent's soft ground while what it opens is open, with the count of what narrows over its corner. */
export function PhoneBarButton({
  open,
  count,
  className,
  children,
  ...props
}: ComponentProps<'button'> & {
  'aria-label': string
  open?: boolean
  count?: number
}) {
  return (
    <button
      type="button"
      data-slot="phone-bar-button"
      className={cn(
        iconButtonVariants(),
        PHONE_BAR_BUTTON,
        'relative',
        open && 'border-brand-line bg-brand-soft text-brand',
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-[calc(3rem/16)] -right-[calc(3rem/16)] h-[calc(18rem/16)] min-w-[calc(18rem/16)] rounded-full bg-accent-fill px-[calc(5rem/16)] text-center font-code text-micro leading-[calc(18rem/16)] font-bold text-on-accent"
        >
          {count}
        </span>
      )}
    </button>
  )
}
