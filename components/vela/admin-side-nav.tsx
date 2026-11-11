import type { ComponentProps, ReactNode } from 'react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const BELOW_TOP_BAR = 'top-(--top-bar)'

export function AdminSideNav({
  caption,
  className,
  children,
  'aria-label': ariaLabel,
  ...props
}: ComponentProps<'nav'> & { caption?: string }) {
  return (
    <nav
      data-slot="admin-side-nav"
      aria-label={ariaLabel ?? caption}
      className={cn(
        'w-[12.5rem] shrink-0 px-[calc(9rem/16)] max-[900px]:w-auto upright:hidden sideways:hidden',
        className,
      )}
      {...props}
    >
      <div className={cn('sticky py-3.5', BELOW_TOP_BAR)}>
        {caption && (
          <div className="mb-[calc(11rem/16)] px-2.5 font-code text-[calc(9.5rem/16)] tracking-[0.14em] text-ink-2 max-[900px]:hidden">
            {caption}
          </div>
        )}
        {children}
      </div>
    </nav>
  )
}

export function AdminSideNavItem({
  active,
  asChild,
  icon,
  label,
  className,
  children,
  ...props
}: ComponentProps<'a'> & {
  active?: boolean
  asChild?: boolean
  icon?: ReactNode
  label: string
}) {
  const Comp = asChild ? Slot.Root : 'a'

  return (
    <Comp
      data-slot="admin-side-nav-item"
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={cn(
        'tap-target mb-[calc(11rem/16)] flex items-center gap-2 rounded-full px-2.5 py-2 text-sub font-medium text-ink-2 no-underline outline-none max-[900px]:mb-[calc(18rem/16)]',
        'transition-[background-color,color,transform] duration-150 ease-toy',
        'hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring',
        '[&_svg]:size-3.5',
        active && 'bg-brand-soft font-bold text-brand',
        className,
      )}
      {...props}
    >
      {icon}
      <span className="whitespace-nowrap max-[900px]:hidden">{label}</span>
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : null}
    </Comp>
  )
}
