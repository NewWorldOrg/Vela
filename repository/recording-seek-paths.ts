import type { components } from '@/repository/client/schema'
import type { SeekEvent } from '@/repository/recording-segments'

/** Where a seek in a recording is taken, the path the browser sends to itself when the page may not run again. */
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
