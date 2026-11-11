'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import {
  slotNamed,
  nothingToFollow,
  noSlotOnTheServer,
} from '@/components/vela/phone-bar-slot'

/** The id of the place in the bar at the top of a phone held upright where a screen's own tools go. */
export const PHONE_BAR_TOOLS = 'phone-bar-tools'

const theTools = slotNamed(PHONE_BAR_TOOLS)

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
