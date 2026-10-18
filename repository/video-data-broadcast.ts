import type { BrowserDecoding } from '@/lib/browser-decodes'
import type { PlaybackSource } from '@/repository/playback-sources'
import {
  timelineOf,
  type DataBroadcastTimeline,
  type PlacedVersion,
} from '@/lib/recording-data-broadcast'

export type DataBroadcastRead =
  | { state: 'read'; timeline: DataBroadcastTimeline }
  | { state: 'coming' }
  | { state: 'none' }
  | { state: 'failed' }

const REFUSED: Partial<Record<number, DataBroadcastRead>> = {
  404: { state: 'none' },
  409: { state: 'coming' },
}

/** The route that answers the catalog of a recording's data broadcast over the source played, the whole of it at once. */
export function videoDataBroadcastHref(
  id: string,
  source?: PlaybackSource,
  decodes: readonly BrowserDecoding[] = [],
): string {
  const asked = new URLSearchParams()

  if (source) {
    asked.set('source', source)
  }

  for (const one of decodes) {
    asked.append('decodes', one)
  }

  const query = asked.toString()

  return `/api/videos/${encodeURIComponent(id)}/data-broadcast${query ? `?${query}` : ''}`
}

/** The route that answers one version of a module, as the live side channel carries it. */
export function videoDataBroadcastModuleHref(
  id: string,
  placed: Pick<PlacedVersion, 'tag' | 'downloadId' | 'id' | 'version'>,
): string {
  return `/api/videos/${encodeURIComponent(id)}/data-broadcast/modules/${placed.tag}/${placed.downloadId}/${placed.id}/${placed.version}`
}

export function dataBroadcastRead(
  status: number,
  answer: unknown,
): DataBroadcastRead {
  if (status !== 200) {
    return REFUSED[status] ?? { state: 'failed' }
  }

  const data = (answer as { data?: unknown } | null)?.data
  const timeline = timelineOf(data)

  if (!timeline) {
    console.warn('[data broadcast] the catalog answered could not be read')

    return { state: 'failed' }
  }

  return { state: 'read', timeline }
}
