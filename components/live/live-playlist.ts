export type PlaylistFault = 'unsupported' | 'dropped'

export interface PlaylistHeard {
  onPicture: () => void
  onRefusedToPlay: () => void
  onFault: (fault: PlaylistFault) => void
}

export interface LivePlaylist {
  leave: () => void
}

export type OpenPlaylist = (
  video: HTMLVideoElement,
  href: string,
  heard: PlaylistHeard,
) => LivePlaylist

/** Hands the video a playlist to play by itself, and plays the picture once it has loaded. */
export const openPlaylist: OpenPlaylist = (video, href, heard) => {
  const pictured = () => {
    heard.onPicture()
    void video.play().catch(heard.onRefusedToPlay)
  }
  const failed = () =>
    heard.onFault(
      video.error?.code === MediaError.MEDIA_ERR_DECODE
        ? 'unsupported'
        : 'dropped',
    )
  const ended = () => heard.onFault('dropped')

  video.addEventListener('loadeddata', pictured, { once: true })
  video.addEventListener('error', failed)
  video.addEventListener('ended', ended)
  video.src = href

  return {
    leave: () => {
      video.removeEventListener('loadeddata', pictured)
      video.removeEventListener('error', failed)
      video.removeEventListener('ended', ended)
      video.removeAttribute('src')
      video.load()
    },
  }
}
