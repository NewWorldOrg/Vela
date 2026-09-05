import type { ComponentProps, ReactNode } from 'react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'
import { SettingsIcon, VelaMark } from '@/components/vela/icons'

/**
 * The top bar's height, and so where anything pinned beneath it begins. Both
 * are written as the class Tailwind needs, so that the number lives once.
 */
const TOP_BAR_HEIGHT = 'h-[46px]'
const BELOW_TOP_BAR = 'top-[46px]'

/**
 * The most a list on an admin page may be tall: the window less the top bar
 * and the page's own bottom padding (`AdminMain`), so that a page scrolled to
 * its end shows the list's header row just under the top bar and its last row
 * at the window's edge.
 *
 * A screen that is only a list pins itself to the window and lets the list
 * take what is left (`ScreenMain scroll="within"`). A list that sits under
 * something that is read — a form — cannot: the form takes the window and
 * leaves the list nothing. Such a list is bounded instead: it grows with its
 * rows until it would reach past the window, and from there scrolls inside.
 */
export const ADMIN_LIST_HEIGHT_CAP = 'max-h-[calc(100dvh-66px)]'

/**
 * The window-filling frame every route inside the shell is drawn in: the top
 * bar, then the screen.
 *
 * The frame is not a scroll container, and neither is the screen inside it.
 * The document scrolls, so the scrollbar is at the edge of the window rather
 * than at the edge of a column narrower than the window, and nothing here is
 * a scroller the browser would let the keyboard land on and draw its focus
 * ring around. The frame is only as tall as the window when the screen asks
 * for that (`ScreenMain scroll="within"`), which is what gives a list inside
 * it a height to fill; otherwise it is at least the window and grows with
 * the page.
 */
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

/**
 * The application frame as a story draws it. Everyday areas — 番組表 / ライブ /
 * ライブラリ / 予約 — live in the top bar. The occasional ones sit behind 設定
 * in an admin area with its own side navigation.
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
        'w-[152px] shrink-0 border-r border-dashed border-line px-[9px] max-[900px]:w-auto',
        className,
      )}
      {...props}
    >
      {/*
        The column runs the height of the page so its rule does, while the
        items stay in view under the top bar as the page scrolls. The padding
        travels with the items, so they sit where they sat before the scroll.
      */}
      <div className={cn('sticky py-3.5', BELOW_TOP_BAR)}>
        {/*
          The gap under the caption matches the 11px between the rows below it.
          Widening the rows' gaps to keep their areas apart left the caption at
          7px, nearer to the first row than the rows are to each other, and a
          heading that sits closer to what follows than that follows itself
          reads as one of the rows rather than as the head of them.
        */}
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

/**
 * The gap under a row is what keeps the 44px areas from reaching into one
 * another, so it follows the row's height: 33px with its label, 26px once the
 * label is dropped at 900px. Both leave a 44px pitch, which is the areas laid
 * edge to edge — no overlap, and no strip between them that answers to nobody.
 */
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

/**
 * How wide a screen is read, in two steps the screen picks by name.
 *
 * Nothing bounded a screen before this, so every one of them was as wide as
 * the window: at 2560 a row of a list ran the whole desk and the eye lost the
 * line between a value and the label it belongs to. The step is held here and
 * chosen by name, the way the width of a surface over the page is — a number
 * written per screen is a number half of them will be missing.
 *
 * `full` is not a screen that happens to be wide. It is a screen whose content
 * is an axis: the guide is hours across and services down, and the live screen,
 * once a channel is chosen, puts a picture beside the list it is chosen from.
 * Bounding either would take away the thing being read rather than tidy it. A
 * screen asks for it while it has that content and not by name alone: live
 * before a channel is chosen has no picture, and takes the step instead.
 */
const SCREEN_WIDTHS = {
  default: 'mx-auto w-full max-w-[1440px]',
  full: 'w-full',
} as const

export type ScreenWidth = keyof typeof SCREEN_WIDTHS

/**
 * What scrolls when a screen is taller than the window, chosen by name.
 *
 * `page` is the document: the screen grows with what is on it and the window
 * scrolls, with the scrollbar at its edge. It is every screen that is read.
 *
 * `within` pins the frame to the window and gives the screen exactly what is
 * left under the top bar, so that a list inside it can take the rest and
 * scroll on its own with its header row held. Nothing but the list moves. It
 * is for a screen whose content is the axis being read, which is the guide.
 *
 * Neither makes `<main>` the scroller. A screen that scrolled inside its own
 * column put the scrollbar at the column's edge, inside the window, and made
 * the column a thing the keyboard could land on, ringed in the browser's
 * default blue.
 */
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
