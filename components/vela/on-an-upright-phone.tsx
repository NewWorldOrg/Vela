'use client'

import type { ReactNode } from 'react'

import { useOnAPhone, usePhoneUpright } from '@/hooks/usePhone'

/** What only a phone held upright draws, left out of the page everywhere else: the server draws none of it, and the phone adds it once the page is its own. */
export function OnAnUprightPhone({ children }: { children: ReactNode }) {
  return usePhoneUpright() ? children : null
}

/** What a phone draws held either way, left out of the page everywhere else. */
export function OnAPhone({ children }: { children: ReactNode }) {
  return useOnAPhone() ? children : null
}
