/** How a browser takes a stream: fed to a media source, handed a playlist, or not at all. */
export type MediaCarriage = 'feed' | 'playlist' | 'none'

const HLS = 'application/vnd.apple.mpegurl'

export type Asked = Pick<HTMLVideoElement, 'canPlayType'>

let probe: Asked | undefined

export function aVideo(): Asked {
  probe ??= document.createElement('video')

  return probe
}

/** Feeds a browser that has a media source, and otherwise hands the playlist to a video that plays HLS by itself. */
export function mediaCarriage(fed: boolean, video: () => Asked): MediaCarriage {
  if (fed) {
    return 'feed'
  }

  return video().canPlayType(HLS) === '' ? 'none' : 'playlist'
}
