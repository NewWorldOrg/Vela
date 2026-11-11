import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const TOP_BAR_HEIGHT = 'h-(--top-bar)'

export function TopBar({ className, ...props }: ComponentProps<'header'>) {
  return (
    <header
      data-slot="top-bar"
      className={cn(
        'sticky top-0 z-30 flex items-center gap-10 bg-bg px-10 max-[1365px]:gap-8 max-[1365px]:px-6',
        TOP_BAR_HEIGHT,
        'phone:h-[calc(52rem/16)] phone:gap-2 phone:pr-3 phone:pl-4',
        'upright:[body:has([data-watching])_&]:hidden sideways:[body:has([data-watching])_&]:hidden',
        className,
      )}
      {...props}
    />
  )
}
