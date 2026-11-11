'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import {
  slotNamed,
  nothingToFollow,
  noSlotOnTheServer,
} from '@/components/vela/phone-bar-slot'

/** The id of the place where a screen puts what stands in for its name, as the guide puts its day. */
export const PHONE_BAR_LEAD = 'phone-bar-lead'

const theLead = slotNamed(PHONE_BAR_LEAD)

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
