import type { ComponentProps, ReactNode } from 'react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'
import { SettingsIcon, VelaMark } from '@/components/vela/icons'

const TOP_BAR_HEIGHT = 'h-[calc(46rem/16)]'
const BELOW_TOP_BAR = 'top-[46px]'

export const ADMIN_LIST_HEIGHT_CAP = 'max-h-[calc(100dvh-66px)]'

export function AppFrame({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="app-frame"
      className={cn(
        'dot-grid flex min-h-dvh flex-col bg-bg',
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
        'heading mr-[calc(14rem/16)] flex items-center gap-1.5 text-title',
        className,
      )}
      {...props}
    >
      <VelaMark className="size-4 text-brand" />
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
      className={cn('flex flex-1 gap-0.5', className)}
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
        'tap-target flex items-center gap-1.5 rounded-full border border-transparent px-3 py-[calc(5rem/16)] text-sub font-medium text-ink-2 no-underline outline-none',
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
        'w-[11rem] shrink-0 border-r border-dashed border-line px-[calc(9rem/16)] max-[900px]:w-auto',
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
        '[&_svg]:size-3.5 [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-toy hover:[&_svg]:-rotate-6 hover:[&_svg]:scale-110',
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

/*
 * The cap is measured against the window and not against the letters, so it is
 * the one width on the screen that stays in px. Above 3200 the island was
 * floating in 640px of field on each side; 3040 leaves 400.
 */
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
  className,
  ...props
}: ComponentProps<'main'> & { width?: ScreenWidth; scroll?: ScreenScroll }) {
  return (
    <main
      data-slot="screen-main"
      data-width={width}
      data-scroll={scroll}
      className={cn(
        'screen-rises min-h-0 flex-1',
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
      data-slot="admin-main"
      className={cn('min-w-0 px-[calc(18rem/16)] pt-4 pb-5', className)}
      {...props}
    />
  )
}

export function Crumb({ className, children, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="crumb"
      className={cn('mb-[calc(5rem/16)] text-cap text-ink-3', className)}
      {...props}
    >
      {children}
    </p>
  )
}

export function CrumbCurrent({ className, ...props }: ComponentProps<'b'>) {
  return <b className={cn('font-medium text-ink-2', className)} {...props} />
}
