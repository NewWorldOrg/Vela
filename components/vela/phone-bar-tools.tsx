'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import {
  slotNamed,
  nothingToFollow,
  noSlotOnTheServer,
} from '@/lib/phone-bar-slot'

export const PHONE_BAR_TOOLS = 'phone-bar-tools'

const theTools = slotNamed(PHONE_BAR_TOOLS)

export function PhoneBarToolsSlot() {
  return (
    <div
      id={PHONE_BAR_TOOLS}
      data-slot="phone-bar-tools"
      className="flex shrink-0 items-center gap-2 empty:hidden sideways:min-w-0 sideways:flex-1 sideways:justify-end"
    />
  )
}

export function PhoneBarTools({ children }: { children: ReactNode }) {
  const slot = useSyncExternalStore(
    nothingToFollow,
    theTools,
    noSlotOnTheServer,
  )

  return slot ? createPortal(children, slot) : null
}
