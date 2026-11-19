import type { components } from '@/repository/client/schema'
import type { SeekEvent } from '@/repository/recording-segments'

export function recordingSeeksHref(id: string): string {
  return `/api/recordings/${encodeURIComponent(id)}/seeks`
}

export function seekBody(
  seek: SeekEvent,
): components['schemas']['AddSeekEventRequest'] {
  return {
    event: seek.event,
    means: seek.means,
    fromSec: seek.fromSec,
    toSec: seek.toSec,
  }
}
