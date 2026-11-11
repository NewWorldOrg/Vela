import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** The name of the screen in the bar at the top of a phone held upright. Not a heading: the screen keeps its own, read aloud. */
export function PhoneBarTitle({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="phone-bar-title"
      aria-hidden="true"
      className={cn(
        'heading min-w-0 flex-1 truncate text-section leading-none',
        className,
      )}
      {...props}
    />
  )
}
