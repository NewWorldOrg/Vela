'use client'

import { createContext, use, type ReactNode } from 'react'

import { useUnfolding, type Unfolding } from '@/components/vela/unfold'

const UnfoldedService = createContext<Unfolding | null>(null)

export function UnfoldingServices({ children }: { children: ReactNode }) {
  return <UnfoldedService value={useUnfolding()}>{children}</UnfoldedService>
}

export function useUnfolded(): Unfolding {
  const held = use(UnfoldedService)

  if (held === null) {
    throw new Error(
      'A service table unfolds through the provider above it, and there is none.',
    )
  }

  return held
}
