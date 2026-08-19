import type { ComponentProps, ReactNode } from 'react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'
import { SettingsIcon, VelaMark } from '@/components/vela/icons'

/**
 * The application frame. Everyday areas — 番組表 / ライブ / ライブラリ / 予約 —
 * live in the top bar. The occasional ones sit behind 設定 in an admin area
 * with its own side navigation.
 */
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
        'flex h-[46px] items-center gap-1 border-b border-line bg-surface px-[14px]',
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
        'rounded-full px-[11px] py-[5px] text-sub font-medium text-ink-2 no-underline outline-none',
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
        'flex items-center gap-1.5 rounded-full border border-transparent px-3 py-[5px] text-sub font-medium text-ink-2 no-underline outline-none',
        'transition-[background-color,color] duration-150 ease-out',
        'hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring',
        active && 'border-brand-line bg-brand-soft font-bold text-brand',
        className,
      )}
      {...props}
    >
      <SettingsIcon />
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  )
}

/** The two-column body of the admin area: side navigation plus the page. */
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
        'w-[152px] shrink-0 border-r border-dashed border-line px-[9px] py-3.5 max-[900px]:w-auto',
        className,
      )}
      {...props}
    >
      {caption && (
        <div className="mb-[7px] px-2.5 font-code text-[9.5px] tracking-[0.14em] text-ink-3 max-[900px]:hidden">
          {caption}
        </div>
      )}
      {children}
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
        'mb-px flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sub font-medium text-ink-2 no-underline outline-none',
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

export function AdminMain({ className, ...props }: ComponentProps<'main'>) {
  return (
    <main
      data-slot="admin-main"
      className={cn(
        'min-w-0 flex-1 overflow-y-auto px-[18px] pt-4 pb-5',
        className,
      )}
      {...props}
    />
  )
}

/** 設定 / チューナー — the trail above an admin page heading. */
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
