'use client'

import type { ReactNode } from 'react'

import { useOnAPhone } from '@/hooks/usePhone'

/** What a phone draws held either way, left out of the page everywhere else. */
export function OnAPhone({ children }: { children: ReactNode }) {
  return useOnAPhone() ? children : null
}
