import type { ReactNode } from 'react'

import type { StateTerm } from '@/lib/state-terms'
import type { BadgeWidth } from '@/components/ui/badge'

export const PILL_WIDTH: BadgeWidth = 'fixed'

export const STATE_COLUMN = 'w-[156px]'

export function StatusCell({ children }: { children: ReactNode }) {
  return (
    <span
      data-slot="status-cell"
      className="flex items-center justify-start text-left"
    >
      {children}
    </span>
  )
}

export function alsoSays(
  term: StateTerm,
  ...more: (string | undefined | false)[]
): StateTerm {
  const rest = more.filter((one): one is string => Boolean(one))

  if (rest.length === 0) {
    return term
  }

  return {
    label: term.label,
    explanation: [term.explanation, ...rest].join('\n'),
  }
}
