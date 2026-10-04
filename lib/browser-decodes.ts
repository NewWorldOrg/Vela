import { storingCookie } from '@/lib/stored-flag'

export const DECODES_COOKIE = 'vela-decodes'

export type BrowserDecoding = 'h265'

export const H265: BrowserDecoding = 'h265'

const NONE = 'none'

/** The type Carina writes an H.265 artefact as: tagged hvc1, Main, level 4.1. */
export const H265_IN_MP4 = 'video/mp4; codecs="hvc1.1.6.L123.B0"'

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
  return said === H265 ? [H265] : []
}

/** Whether both the element and the media capabilities say the browser plays an H.265 artefact. */
export async function decodesH265(probe: DecodingProbe): Promise<boolean> {
  try {
    if (probe.canPlayType(H265_IN_MP4) !== CERTAIN) {
      return false
    }

    if (!probe.decodingInfo) {
      return true
    }

    const info = await probe.decodingInfo({
      type: 'file',
      video: {
        contentType: H265_IN_MP4,
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

export function decodesCookie(h265: boolean): string {
  return storingCookie(DECODES_COOKIE, h265 ? H265 : NONE)
}
