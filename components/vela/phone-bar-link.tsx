'use client'

import { type ComponentProps } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { PHONE_BAR_BUTTON } from '@/components/vela/app-shell'
import { iconButtonVariants } from '@/components/vela/icon-button'

/** A tool in the bar that goes to another screen. */
export function PhoneBarLink({
  className,
  ...props
}: ComponentProps<typeof Link> & { 'aria-label': string }) {
  return (
    <Link
      data-slot="phone-bar-button"
      className={cn(iconButtonVariants(), PHONE_BAR_BUTTON, className)}
      {...props}
    />
  )
}
