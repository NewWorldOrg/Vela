import type { ComponentProps, ReactNode } from 'react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

export function TabBar({
  className,
  children,
  'aria-label': ariaLabel = 'メイン',
  ...props
}: ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="tab-bar"
      aria-label={ariaLabel}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 hidden border-t border-hair bg-bg',
        'pr-[env(safe-area-inset-right)] pb-(--safe-bottom) pl-[env(safe-area-inset-left)]',
        'upright:block [body:has([data-fill])_&]:hidden',
        'sideways:block sideways:top-0 sideways:right-auto sideways:w-[calc(68rem/16+env(safe-area-inset-left))] sideways:border-t-0 sideways:border-r sideways:border-hair sideways:pr-0 sideways:pb-0',
        'sideways:[body:has([data-watching])_&]:hidden',
        className,
      )}
      {...props}
    >
      <ul className="flex h-[calc(var(--tab-bar)-1px)] sideways:h-full sideways:flex-col sideways:justify-center sideways:gap-1 sideways:pb-(--safe-bottom)">
        {children}
      </ul>
    </nav>
  )
}

export function TabBarItem({
  active,
  asChild,
  icon,
  label,
  badge,
  className,
  children,
  ...props
}: ComponentProps<'a'> & {
  active?: boolean
  asChild?: boolean
  icon: ReactNode
  label: string
  badge?: ReactNode
}) {
  const Comp = asChild ? Slot.Root : 'a'

  return (
    <li className="flex min-w-0 flex-1 sideways:h-[calc(60rem/16)] sideways:flex-none">
      <Comp
        data-slot="tab-bar-item"
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group/tab relative flex min-w-0 flex-1 flex-col items-center justify-center gap-[calc(2rem/16)] text-ink-2 no-underline outline-none',
          'transition-colors duration-[140ms] ease-toy hover:text-ink',
          'sideways:mx-1.5 sideways:rounded-xl',
          active && 'text-acc-text hover:text-acc-text sideways:bg-accent-tint',
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'flex h-[calc(28rem/16)] w-[calc(52rem/16)] items-center justify-center rounded-full',
            'transition-[box-shadow] duration-[140ms] ease-toy',
            'group-focus-visible/tab:shadow-ring [&_svg]:size-[calc(22rem/16)]',
            active && 'bg-accent-tint sideways:bg-transparent',
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            'max-w-full truncate text-cap leading-none font-medium',
            active && 'font-semibold',
          )}
        >
          {label}
        </span>
        {badge}
        {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : null}
      </Comp>
    </li>
  )
}

/** A count a tab carries of things waiting on the person, in amber over the corner of its icon. Read aloud after the tab's name. */
export function TabBadge({
  count,
  saying,
  className,
}: {
  count: number
  saying: string
  className?: string
}) {
  return (
    <span
      data-slot="tab-badge"
      className={cn(
        'absolute top-[calc(3rem/16)] left-[calc(50%+10rem/16)] h-[calc(18rem/16)] min-w-[calc(18rem/16)] rounded-full bg-warn-fill px-[calc(5rem/16)] text-center font-code text-micro leading-[calc(18rem/16)] font-bold text-on-warn',
        className,
      )}
    >
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{saying}</span>
    </span>
  )
}
