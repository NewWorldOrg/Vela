import type { BrowserDecoding } from '@/lib/browser-decodes'
import type { components } from '@/repository/client/schema'
import type { PlaybackSource } from '@/repository/playback-sources'
import type { CaptionWindow, TimedCaption } from '@/lib/recording-captions'

export type CaptionStanding = 'ready' | 'coming' | 'none'

export const CAPTION_STANDINGS: Record<
  components['schemas']['CaptionStanding'],
  CaptionStanding
> = {
  ready: 'ready',
  coming: 'coming',
  none: 'none',
}

export type CaptionWindowRead =
  | { state: 'read'; window: CaptionWindow }
  | { state: 'coming' }
  | { state: 'none' }
  | { state: 'failed' }

type CaptionWindowAnswer =
  components['schemas']['BaseResponderOfCaptionWindowResponder']

type CaptionCueAnswer = components['schemas']['CaptionCueResponder']

function bytesOf(base64: string): Uint8Array {
  const text = atob(base64)
  const bytes = new Uint8Array(text.length)

  for (let at = 0; at < text.length; at += 1) {
    bytes[at] = text.charCodeAt(at)
  }

  return bytes
}

function toCue(cue: CaptionCueAnswer): TimedCaption {
  const picture = cue.picture

  return {
    atSec: Number(cue.atSec),
    picture: picture
      ? {
          left: Number(picture.left),
          top: Number(picture.top),
          width: Number(picture.width),
          height: Number(picture.height),
          png: bytesOf(picture.png),
        }
      : null,
  }
}

const REFUSED: Partial<Record<number, CaptionWindowRead>> = {
  404: { state: 'none' },
  409: { state: 'coming' },
}

export function videoCaptionsHref(
  id: string,
  fromSec: number,
  source?: PlaybackSource,
  decodes: readonly BrowserDecoding[] = [],
): string {
  const from = Number.isFinite(fromSec)
    ? Math.max(0, Math.floor(fromSec * 1000) / 1000)
    : 0
  const asked = new URLSearchParams({ from: String(from) })

  if (source) {
    asked.set('source', source)
  }

  for (const one of decodes) {
    asked.append('decodes', one)
  }

  return `/api/videos/${encodeURIComponent(id)}/captions?${asked}`
}

export function captionWindowRead(
  status: number,
  answer: CaptionWindowAnswer | undefined,
): CaptionWindowRead {
  const data = answer?.data

  if (status !== 200 || !data || !Array.isArray(data.cues)) {
    return REFUSED[status] ?? { state: 'failed' }
  }

  try {
    return {
      state: 'read',
      window: {
        canvas: {
          width: Number(data.canvas.width),
          height: Number(data.canvas.height),
        },
        untilSec: Number(data.untilSec),
        cues: data.cues.map(toCue),
      },
    }
  } catch (error) {
    console.warn('[captions] the captions answered could not be read', error)

    return { state: 'failed' }
  }
}
