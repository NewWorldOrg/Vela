import type { ComponentProps, ReactNode } from 'react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'
import { SettingsIcon, VelaMark } from '@/components/vela/icons'

const TOP_BAR_HEIGHT = 'h-[46px]'
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
        'sticky top-0 z-30 flex items-center gap-1 border-b border-line bg-surface px-[14px]',
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
        'heading mr-[14px] flex items-center gap-1.5 text-[14px]',
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
        'tap-target rounded-full px-[11px] py-[5px] text-sub font-medium text-ink-2 no-underline outline-none',
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
        'tap-target flex items-center gap-1.5 rounded-full border border-transparent px-3 py-[5px] text-sub font-medium text-ink-2 no-underline outline-none',
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
      className={cn('flex min-h-[196px]', className)}
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
        'w-[152px] shrink-0 border-r border-dashed border-line px-[9px] max-[900px]:w-auto',
        className,
      )}
      {...props}
    >
      <div className={cn('sticky py-3.5', BELOW_TOP_BAR)}>
        {caption && (
          <div className="mb-[11px] px-2.5 font-code text-[9.5px] tracking-[0.14em] text-ink-3 max-[900px]:hidden">
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
        'tap-target mb-[11px] flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sub font-medium text-ink-2 no-underline outline-none max-[900px]:mb-[18px]',
        'transition-[background-color,color,transform] duration-150 ease-toy',
        'hover:translate-x-0.5 hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring',
        '[&_svg]:size-3.5 [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-toy hover:[&_svg]:-rotate-6 hover:[&_svg]:scale-110',
        active && 'bg-brand-soft font-bold text-brand',
        className,
      )}
      {...props}
    >
      {icon}
      <span className="max-[900px]:hidden">{label}</span>
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : null}
    </Comp>
  )
}

const SCREEN_WIDTHS = {
  default: 'mx-auto w-full max-w-[1440px]',
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
      className={cn('min-h-0 flex-1', SCREEN_WIDTHS[width], className)}
      {...props}
    />
  )
}

export function AdminMain({ className, ...props }: ComponentProps<'main'>) {
  return (
    <ScreenMain
      data-slot="admin-main"
      className={cn('min-w-0 px-[18px] pt-4 pb-5', className)}
      {...props}
    />
  )
}

export function Crumb({ className, children, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="crumb"
      className={cn('mb-[5px] text-cap text-ink-3', className)}
      {...props}
    >
      {children}
    </p>
  )
}

export function CrumbCurrent({ className, ...props }: ComponentProps<'b'>) {
  return <b className={cn('font-medium text-ink-2', className)} {...props} />
}
