import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { SYSTEM_STATE_LABELS } from '@/lib/system-terms'
import type { Reading } from '@/repository/system'
import { StatusText } from '@/components/vela/status'
import { Surface } from '@/components/vela/surface'

export function ValueRows({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-2.5 text-ui',
        className,
      )}
    >
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
    <>
      <dt className="text-ink-2">{name}</dt>
      <dd className="min-w-0 font-code tabular-nums text-ink-2">{children}</dd>
    </>
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
    <Surface data-slot={slot} className="bg-surface-2">
      <StatusText tone="off" className="text-ui">
        {reading.state === 'unauthenticated'
          ? SYSTEM_STATE_LABELS.signedOut
          : SYSTEM_STATE_LABELS.unknown}
      </StatusText>
    </Surface>
  )
}
