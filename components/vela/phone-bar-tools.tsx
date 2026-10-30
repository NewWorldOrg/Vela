'use client'

import {
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { PHONE_BAR_BUTTON } from '@/components/vela/app-shell'
import { iconButtonVariants } from '@/components/vela/icon-button'

/** The id of the place in the bar at the top of a phone held upright where a screen's own tools go. */
export const PHONE_BAR_TOOLS = 'phone-bar-tools'

/** The id of the place where a screen puts what stands in for its name, as the guide puts its day. */
export const PHONE_BAR_LEAD = 'phone-bar-lead'

function nothingToFollow(): () => void {
  return () => undefined
}

function slotNamed(id: string): () => HTMLElement | null {
  return () => document.getElementById(id)
}

const theTools = slotNamed(PHONE_BAR_TOOLS)
const theLead = slotNamed(PHONE_BAR_LEAD)

function noSlotOnTheServer(): null {
  return null
}

/** The place itself, empty until a screen puts its tools in it. Drawn only on a phone. */
export function PhoneBarToolsSlot() {
  return (
    <div
      id={PHONE_BAR_TOOLS}
      data-slot="phone-bar-tools"
      className="flex shrink-0 items-center gap-2 empty:hidden sideways:min-w-0 sideways:flex-1 sideways:justify-end"
    />
  )
}

/** A screen's tools, carried up into the bar at the top of a phone held upright: up to two of them, before the theme. Nothing is drawn on the server or where the bar has no place for them. */
export function PhoneBarTools({ children }: { children: ReactNode }) {
  const slot = useSyncExternalStore(
    nothingToFollow,
    theTools,
    noSlotOnTheServer,
  )

  return slot ? createPortal(children, slot) : null
}

/** The place for what stands in for the screen's name; while something is in it, the name is not drawn. */
export function PhoneBarLeadSlot() {
  return (
    <div
      id={PHONE_BAR_LEAD}
      data-slot="phone-bar-lead"
      className="flex min-w-0 flex-1 items-center gap-2.5 empty:hidden"
    />
  )
}

/** What stands in for the screen's name in the bar at the top of a phone, held either way. */
export function PhoneBarLead({ children }: { children: ReactNode }) {
  const slot = useSyncExternalStore(nothingToFollow, theLead, noSlotOnTheServer)

  return slot ? createPortal(children, slot) : null
}

/** A tool in the bar: a round button of 40px, in the accent's soft ground while what it opens is open, with the count of what narrows over its corner. */
export function PhoneBarButton({
  open,
  count,
  className,
  children,
  ...props
}: ComponentProps<'button'> & {
  'aria-label': string
  open?: boolean
  count?: number
}) {
  return (
    <button
      type="button"
      data-slot="phone-bar-button"
      className={cn(
        iconButtonVariants(),
        PHONE_BAR_BUTTON,
        'relative',
        open && 'border-brand-line bg-brand-soft text-brand',
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-[calc(3rem/16)] -right-[calc(3rem/16)] h-[calc(18rem/16)] min-w-[calc(18rem/16)] rounded-full bg-brand px-[calc(5rem/16)] text-center font-code text-micro leading-[calc(18rem/16)] font-bold text-on-brand"
        >
          {count}
        </span>
      )}
    </button>
  )
}

/** A tool in the bar that goes to another screen. */
export function PhoneBarLink({
  className,
  ...props
}: ComponentProps<typeof Link> & { 'aria-label': string }) {
  return (
    <Link
      data-slot="phone-bar-button"
      className={cn(iconButtonVariants(), PHONE_BAR_BUTTON, className)}
      {...props}
    />
  )
}
