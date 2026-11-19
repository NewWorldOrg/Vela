'use client'

import type { ReactNode } from 'react'

import { usePhoneUpright } from '@/hooks/usePhone'

export function OnAnUprightPhone({ children }: { children: ReactNode }) {
  return usePhoneUpright() ? children : null
}
