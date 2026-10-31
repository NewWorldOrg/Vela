import type { ComponentProps, ReactNode } from 'react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'
import { ChevronLeftIcon, SettingsIcon } from '@/components/vela/icons'
import { VelaMark } from '@/components/vela/marks'
import { iconTilt } from '@/components/vela/tactile'

const TOP_BAR_HEIGHT = 'h-[calc(46rem/16)]'
const BELOW_TOP_BAR = 'top-[calc(46rem/16)]'

export const ADMIN_LIST_HEIGHT_CAP =
  'max-h-[calc(100dvh-66rem/16-var(--safe-bottom)-var(--tab-bar))]'

export function AppFrame({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="app-frame"
      className={cn(
        'dot-grid flex min-h-dvh flex-col bg-bg',
        'pr-[env(safe-area-inset-right)] pb-[calc(var(--safe-bottom)+var(--tab-bar))] pl-[env(safe-area-inset-left)]',
        'sideways:pl-[calc(68rem/16+env(safe-area-inset-left))]',
        'has-[[data-scroll=within]]:h-dvh has-[[data-scroll=within]]:overflow-hidden',
        className,
      )}
      {...props}
    />
  )
}

export function AppShell({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="app-shell"
      className={cn(
        'dot-grid flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-bg',
        className,
      )}
      {...props}
    />
  )
}

export function TopBar({ className, ...props }: ComponentProps<'header'>) {
  return (
    <header
      data-slot="top-bar"
      className={cn(
        'sticky top-0 z-30 flex items-center gap-1 border-b border-line bg-surface px-[calc(14rem/16)]',
        TOP_BAR_HEIGHT,
        'phone:h-[calc(52rem/16)] phone:gap-2 phone:border-b-0 phone:bg-bg phone:pr-3 phone:pl-4 phone:dot-grid',
        'upright:[body:has([data-watching])_&]:hidden sideways:[body:has([data-watching])_&]:hidden',
        className,
      )}
      {...props}
    />
  )
}

export function Brand({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="brand"
      className={cn(
        'heading mr-[calc(14rem/16)] flex items-center gap-1.5 text-title phone:hidden',
        className,
      )}
      {...props}
    >
      <VelaMark small className="size-4" />
      Vela
    </div>
  )
}

export function GlobalNav({
  className,
  'aria-label': ariaLabel = 'メイン',
  ...props
}: ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="global-nav"
      aria-label={ariaLabel}
      className={cn('flex flex-1 gap-0.5 phone:hidden', className)}
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
        'tap-target rounded-full px-[calc(11rem/16)] py-[calc(5rem/16)] text-sub font-medium text-ink-2 no-underline outline-none',
        'transition-[background-color,color] duration-150 ease-out',
        'hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring',
        active && 'bg-brand-soft font-bold text-brand',
        className,
      )}
      {...props}
    />
  )
}

export function SettingsLink({
  active,
  asChild,
  className,
  children = '設定',
  ...props
}: ComponentProps<'a'> & { active?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'a'

  return (
    <Comp
      data-slot="settings-link"
      aria-current={active ? 'page' : undefined}
      className={cn(
        'tap-target flex items-center gap-1.5 rounded-full border border-transparent px-3 py-[calc(5rem/16)] text-sub font-medium text-ink-2 no-underline outline-none phone:hidden',
        'transition-[background-color,color] duration-150 ease-out',
        'hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring',
        active && 'border-brand bg-brand-soft font-bold text-brand',
        className,
      )}
      {...props}
    >
      <SettingsIcon />
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  )
}

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
        'fixed inset-x-0 bottom-0 z-40 hidden border-t border-line bg-surface',
        'pr-[env(safe-area-inset-right)] pb-(--safe-bottom) pl-[env(safe-area-inset-left)]',
        'upright:block [body:has([data-fill])_&]:hidden',
        'sideways:block sideways:top-0 sideways:right-auto sideways:w-[calc(68rem/16+env(safe-area-inset-left))] sideways:border-t-0 sideways:border-r sideways:pr-0 sideways:pb-0',
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
          'transition-colors duration-150 ease-out hover:text-ink',
          active && 'text-brand hover:text-brand',
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'flex h-[calc(28rem/16)] w-[calc(52rem/16)] items-center justify-center rounded-full',
            'transition-[background-color,box-shadow] duration-150 ease-out',
            'group-focus-visible/tab:shadow-ring [&_svg]:size-[calc(20rem/16)]',
            active && 'bg-brand-soft',
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            'max-w-full truncate text-cap leading-none font-medium',
            active && 'font-bold',
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

/** A count a tab carries of things waiting on the person, in lemon over the corner of its icon. Read aloud after the tab's name. */
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
        'absolute top-[calc(3rem/16)] left-[calc(50%+10rem/16)] h-[calc(18rem/16)] min-w-[calc(18rem/16)] rounded-full bg-lemon px-[calc(5rem/16)] text-center font-code text-micro leading-[calc(18rem/16)] font-bold text-on-brand',
        className,
      )}
    >
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{saying}</span>
    </span>
  )
}

export function AdminBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="admin-body"
      className={cn('flex min-h-[calc(196rem/16)]', className)}
      {...props}
    />
  )
}

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
        'w-[11rem] shrink-0 border-r border-dashed border-line px-[calc(9rem/16)] max-[900px]:w-auto upright:hidden',
        className,
      )}
      {...props}
    >
      <div className={cn('sticky py-3.5', BELOW_TOP_BAR)}>
        {caption && (
          <div className="mb-[calc(11rem/16)] px-2.5 font-code text-[calc(9.5rem/16)] tracking-[0.14em] text-ink-3 max-[900px]:hidden">
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
        'tap-target mb-[calc(11rem/16)] flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sub font-medium text-ink-2 no-underline outline-none max-[900px]:mb-[calc(18rem/16)]',
        'transition-[background-color,color,transform] duration-150 ease-toy',
        'hover:translate-x-0.5 hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring',
        '[&_svg]:size-3.5',
        iconTilt,
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

const SCREEN_WIDTHS = {
  default: cn(
    'mx-auto w-full max-w-full',
    'min-[1441px]:max-w-[1600px] min-[1920px]:max-w-[1760px]',
    'min-[2560px]:max-w-[2240px] min-[3200px]:max-w-[3040px]',
  ),
  full: 'w-full',
} as const

export type ScreenWidth = keyof typeof SCREEN_WIDTHS

export type ScreenScroll = 'page' | 'within'

export function ScreenMain({
  width = 'default',
  scroll = 'page',
  rises = true,
  className,
  ...props
}: ComponentProps<'main'> & {
  width?: ScreenWidth
  scroll?: ScreenScroll
  rises?: boolean
}) {
  return (
    <main
      data-slot="screen-main"
      data-width={width}
      data-scroll={scroll}
      className={cn(
        rises && 'screen-rises',
        'min-h-0 flex-1',
        SCREEN_WIDTHS[width],
        className,
      )}
      {...props}
    />
  )
}

export function AdminMain({ className, ...props }: ComponentProps<'main'>) {
  return (
    <ScreenMain
      rises={false}
      data-slot="admin-main"
      className={cn(
        'min-w-0 px-[calc(18rem/16)] pt-4 pb-5 upright:px-4 upright:pt-1',
        className,
      )}
      {...props}
    />
  )
}

export function Crumb({ className, children, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="crumb"
      className={cn(
        'mb-[calc(5rem/16)] text-cap text-ink-3 phone:hidden',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  )
}

export function CrumbCurrent({ className, ...props }: ComponentProps<'b'>) {
  return <b className={cn('font-medium text-ink-2', className)} {...props} />
}

/** A tool in the bar at the top of a phone held upright: a round button of 40px. */
export const PHONE_BAR_BUTTON = 'size-10 [&_svg]:size-[calc(19rem/16)]!'

/** The name of the screen in the bar at the top of a phone held upright. Not a heading: the screen keeps its own, read aloud. */
export function PhoneBarTitle({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="phone-bar-title"
      aria-hidden="true"
      className={cn(
        'heading min-w-0 flex-1 truncate text-h1 leading-none tracking-[0.02em]',
        className,
      )}
      {...props}
    />
  )
}

/** The arrow back out of a screen pressed into, named for the screen it goes back to. */
export function PhoneBarBack({
  asChild,
  className,
  children,
  ...props
}: ComponentProps<'a'> & { asChild?: boolean; 'aria-label': string }) {
  const Comp = asChild ? Slot.Root : 'a'

  return (
    <Comp
      data-slot="phone-bar-back"
      className={cn(
        '-ml-3 flex size-11 shrink-0 items-center justify-center rounded-full text-brand no-underline outline-none',
        'focus-visible:shadow-ring [&_svg]:size-[calc(22rem/16)]',
        className,
      )}
      {...props}
    >
      <ChevronLeftIcon />
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  )
}
