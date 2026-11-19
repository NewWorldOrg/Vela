'use client'

import type { ReactNode } from 'react'

import { useOnAPhone } from '@/hooks/usePhone'

export function OnAPhone({ children }: { children: ReactNode }) {
  return useOnAPhone() ? children : null
}
