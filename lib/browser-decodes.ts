import { FORMAT_IN_MP4 } from '@/lib/playback-format'
import { storingCookie } from '@/lib/stored-flag'

export const DECODES_COOKIE = 'vela-decodes'

export type BrowserDecoding = 'h265' | 'av1'

export const BROWSER_DECODINGS: readonly BrowserDecoding[] = ['h265', 'av1']

const NONE = 'none'

const JOINED_BY = '.'

/** The type Carina writes an H.265 artefact as: tagged hvc1, Main, level 4.1. */
export const H265_IN_MP4 = FORMAT_IN_MP4.h265

export const AV1_IN_MP4 = FORMAT_IN_MP4.av1

const IN_MP4: Record<BrowserDecoding, string> = {
  h265: H265_IN_MP4,
  av1: AV1_IN_MP4,
}

const CERTAIN = 'probably'

export interface DecodingInfo {
  supported: boolean
}

export interface DecodingProbe {
  canPlayType: (type: string) => string
  decodingInfo?: (configuration: {
    type: 'file'
    video: {
      contentType: string
      width: number
      height: number
      bitrate: number
      framerate: number
    }
  }) => Promise<DecodingInfo>
}

export function decodesOf(said: string | null | undefined): BrowserDecoding[] {
  const named = (said ?? '').split(JOINED_BY)

  return BROWSER_DECODINGS.filter((one) => named.includes(one))
}

/** Whether both the element and the media capabilities say the browser plays a file in this coding. */
export async function decodesWith(
  probe: DecodingProbe,
  decoding: BrowserDecoding,
): Promise<boolean> {
  const type = IN_MP4[decoding]

  try {
    if (probe.canPlayType(type) !== CERTAIN) {
      return false
    }

    if (!probe.decodingInfo) {
      return true
    }

    const info = await probe.decodingInfo({
      type: 'file',
      video: {
        contentType: type,
        width: 1920,
        height: 1080,
        bitrate: 8_000_000,
        framerate: 30,
      },
    })

    return info.supported
  } catch {
    return false
  }
}

export async function browserDecodes(
  probe: DecodingProbe,
): Promise<BrowserDecoding[]> {
  const decodes: BrowserDecoding[] = []

  for (const one of BROWSER_DECODINGS) {
    if (await decodesWith(probe, one)) {
      decodes.push(one)
    }
  }

  return decodes
}

export function decodesCookie(decodes: readonly BrowserDecoding[]): string {
  return storingCookie(
    DECODES_COOKIE,
    decodes.length > 0 ? decodes.join(JOINED_BY) : NONE,
  )
}
