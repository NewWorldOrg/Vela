import type { BrowserDecoding } from '@/lib/browser-decodes'
import type { PlacedVersion } from '@/lib/recording-data-broadcast'
import type { PlaybackSource } from '@/repository/playback-sources'
import {
  dataBroadcastRead,
  videoDataBroadcastHref,
  videoDataBroadcastModuleHref,
  type DataBroadcastRead,
} from '@/repository/video-data-broadcast'

export type ReadDataBroadcast = (
  id: string,
  source: PlaybackSource | undefined,
  signal: AbortSignal,
  decodes?: readonly BrowserDecoding[],
) => Promise<DataBroadcastRead>

/** Reads one version of a module: its bytes as the side channel carries them, or null when the recording holds no such version. */
export type ReadDataBroadcastModule = (
  id: string,
  placed: PlacedVersion,
  signal: AbortSignal,
) => Promise<Uint8Array | null>

export const readDataBroadcast: ReadDataBroadcast = async (
  id,
  source,
  signal,
  decodes,
) => {
  const answer = await fetch(videoDataBroadcastHref(id, source, decodes), {
    cache: 'no-store',
    headers: { accept: 'application/json' },
    signal,
  })

  return dataBroadcastRead(
    answer.status,
    answer.ok ? await answer.json() : undefined,
  )
}

export const readDataBroadcastModule: ReadDataBroadcastModule = async (
  id,
  placed,
  signal,
) => {
  const answer = await fetch(videoDataBroadcastModuleHref(id, placed), {
    signal,
  })

  if (answer.status === 404) {
    return null
  }

  if (!answer.ok) {
    throw new Error(`${answer.status} for a module of the data broadcast`)
  }

  return new Uint8Array(await answer.arrayBuffer())
}
