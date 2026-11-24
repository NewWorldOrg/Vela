'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import {
  slotNamed,
  nothingToFollow,
  noSlotOnTheServer,
} from '@/lib/phone-bar-slot'

export const PHONE_BAR_LEAD = 'phone-bar-lead'

const theLead = slotNamed(PHONE_BAR_LEAD)

export function PhoneBarLeadSlot() {
  return (
    <div
      id={PHONE_BAR_LEAD}
      data-slot="phone-bar-lead"
      className="flex min-w-0 flex-1 items-center gap-2.5 empty:hidden"
    />
  )
}

export function PhoneBarLead({ children }: { children: ReactNode }) {
  const slot = useSyncExternalStore(nothingToFollow, theLead, noSlotOnTheServer)

  return slot ? createPortal(children, slot) : null
}
