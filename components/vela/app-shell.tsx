import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export const ADMIN_LIST_HEIGHT_CAP =
  'max-h-[calc(100dvh-var(--top-bar)-20rem/16-var(--safe-bottom)-var(--tab-bar))]'

export function AppShell({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="app-shell"
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-xl bg-bg',
        className,
      )}
      {...props}
    />
  )
}

/** A tool in the bar at the top of a phone held upright: a round button of 40px. */
export const PHONE_BAR_BUTTON = 'size-10 [&_svg]:size-[calc(19rem/16)]!'
