import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function AppFrame({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="app-frame"
      className={cn(
        'flex min-h-dvh flex-col bg-bg',
        'pr-[env(safe-area-inset-right)] pb-[calc(var(--safe-bottom)+var(--tab-bar))] pl-[env(safe-area-inset-left)]',
        'sideways:pl-[calc(68rem/16+env(safe-area-inset-left))]',
        'has-[[data-scroll=within]]:h-dvh has-[[data-scroll=within]]:overflow-hidden',
        'sideways:has-[[data-sideways-panes]]:h-dvh sideways:has-[[data-sideways-panes]]:overflow-hidden sideways:has-[[data-sideways-panes]]:pb-0',
        className,
      )}
      {...props}
    />
  )
}
