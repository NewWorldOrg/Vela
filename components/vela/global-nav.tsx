import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

export function GlobalNav({
  className,
  'aria-label': ariaLabel = 'メイン',
  ...props
}: ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="global-nav"
      aria-label={ariaLabel}
      className={cn(
        'flex h-full flex-1 items-center gap-1 phone:hidden',
        className,
      )}
      {...props}
    />
  )
}

export function GlobalNavItem({
  active,
  asChild,
  className,
  ...props
}: ComponentProps<'a'> & { active?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'a'

  return (
    <Comp
      data-slot="global-nav-item"
      aria-current={active ? 'page' : undefined}
      className={cn(
        'tap-target relative flex h-9 items-center gap-1.5 rounded-full px-[calc(13*var(--px))] text-title font-semibold text-ink-2 no-underline outline-none',
        'transition-[background-color,color] duration-[140ms] ease-toy',
        'hover:bg-surface focus-visible:shadow-ring',
        active && 'bg-accent-tint text-acc-text hover:bg-accent-tint',
        className,
      )}
      {...props}
    />
  )
}

/** The count beside a destination's name: the conflicts left unsettled, on the reservations. */
export function NavCount({ count, saying }: { count: number; saying: string }) {
  return (
    <span
      data-slot="nav-count"
      className="inline-grid h-[calc(18*var(--px))] min-w-[calc(18*var(--px))] place-items-center rounded-full bg-warn-fill px-[5px] font-code text-micro leading-none font-bold text-on-warn"
    >
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{saying}</span>
    </span>
  )
}
