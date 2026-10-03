import type { PlaybackSource } from '@/repository/playback-sources'
import {
  captionWindowRead,
  videoCaptionsHref,
  type CaptionWindowRead,
} from '@/repository/video-captions'

export type ReadCaptions = (
  id: string,
  fromSec: number,
  source: PlaybackSource | undefined,
  signal: AbortSignal,
) => Promise<CaptionWindowRead>

export const readCaptions: ReadCaptions = async (
  id,
  fromSec,
  source,
  signal,
) => {
  const answer = await fetch(videoCaptionsHref(id, fromSec, source), {
    cache: 'no-store',
    headers: { accept: 'application/json' },
    signal,
  })

  return captionWindowRead(
    answer.status,
    answer.ok ? await answer.json() : undefined,
  )
}
