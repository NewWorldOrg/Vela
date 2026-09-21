import type { ReactNode } from 'react'

import type { StateTerm } from '@/lib/state-terms'
import type { BadgeWidth } from '@/components/ui/badge'

export const PILL_WIDTH: BadgeWidth = 'fixed'

export const STATE_COLUMN = 'w-[116px]'

export function StatusCell({ children }: { children: ReactNode }) {
  return (
    <span
      data-slot="status-cell"
      className="flex items-start justify-start text-left"
    >
      {children}
    </span>
  )
}

export function Folded({
  says,
}: {
  says?: (string | undefined | false)[] | string
}) {
  const said = (Array.isArray(says) ? says : [says]).filter(
    (one): one is string => Boolean(one),
  )

  return said.length > 0 ? (
    <span className="relative">
      <span className="sr-only">
        {said.map((one) => (
          <span key={one}>{one}</span>
        ))}
      </span>
    </span>
  ) : null
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
