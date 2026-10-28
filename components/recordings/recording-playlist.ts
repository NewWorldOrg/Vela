import type { Carrying } from '@/components/recordings/recording-feed'

export type RecordingPlaylistFault = 'unplayable' | 'refused'

export interface RecordingPlaylistEvents {
  onFault: (fault: RecordingPlaylistFault) => void
  onCut: () => void
}

export type OpenRecordingPlaylist = (
  video: HTMLVideoElement,
  href: string,
  events: RecordingPlaylistEvents,
) => Carrying

/**
 * Hands the video a playlist of the recording transcoded as it plays. A failure once the picture has come is a cut,
 * to be opened again from where it stood; before that, or a picture the browser cannot decode, is a fault.
 */
export const openRecordingPlaylist: OpenRecordingPlaylist = (
  video,
  href,
  events,
) => {
  let pictured = false

  const pictureCame = () => {
    pictured = true
  }
  const failed = () => {
    if (video.error?.code === MediaError.MEDIA_ERR_DECODE) {
      events.onFault('unplayable')

      return
    }

    if (pictured) {
      events.onCut()

      return
    }

    events.onFault('refused')
  }

  video.addEventListener('loadeddata', pictureCame, { once: true })
  video.addEventListener('error', failed)
  video.src = href

  return {
    close: () => {
      video.removeEventListener('loadeddata', pictureCame)
      video.removeEventListener('error', failed)
      video.removeAttribute('src')
      video.load()
    },
  }
}
