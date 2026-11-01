import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { SYSTEM_STATE_LABELS } from '@/lib/system-terms'
import type { Reading } from '@/repository/system'
import { StatusText } from '@/components/vela/status'
import { Surface } from '@/components/vela/surface'

/** The face a group of values sits on: as wide as a group of settings, its rows reaching its sides. */
export const VALUE_FACE = 'max-w-[calc(720rem/16)] px-4 py-1.5'

/** Values in a group: one row each, the name at the left and the value at the right, parted by a hair. */
export function ValueRows({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <dl className={cn('-my-1 flex flex-col text-body', className)}>
      {children}
    </dl>
  )
}

export function ValueRow({
  name,
  children,
}: {
  name: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 border-b border-hair py-2.5 last:border-b-0">
      <dt className="min-w-0 flex-1 text-[calc(14.5rem/16)] font-medium text-ink">
        {name}
      </dt>
      <dd className="min-w-0 text-right tabular-nums text-ink-2">{children}</dd>
    </div>
  )
}

export function UnreadSurface({
  slot,
  reading,
}: {
  slot: string
  reading: Exclude<Reading<unknown>, { state: 'ok' }>
}) {
  return (
    <Surface data-slot={slot} className="max-w-[calc(720rem/16)] bg-surface-2">
      <StatusText tone="off" className="text-ui">
        {reading.state === 'unauthenticated'
          ? SYSTEM_STATE_LABELS.signedOut
          : SYSTEM_STATE_LABELS.unknown}
      </StatusText>
    </Surface>
  )
}
