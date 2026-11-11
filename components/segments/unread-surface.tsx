import { SYSTEM_STATE_LABELS } from '@/lib/system-terms'
import type { Reading } from '@/repository/system'
import { StatusText } from '@/components/vela/status-text'
import { Surface } from '@/components/vela/surface'

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
