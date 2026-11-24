export type MediaCarriage = 'feed' | 'playlist' | 'none'

const HLS = 'application/vnd.apple.mpegurl'

export type Asked = Pick<HTMLVideoElement, 'canPlayType'>

let probe: Asked | undefined

export function aVideo(): Asked {
  probe ??= document.createElement('video')

  return probe
}

export function mediaCarriage(fed: boolean, video: () => Asked): MediaCarriage {
  if (fed) {
    return 'feed'
  }

  return video().canPlayType(HLS) === '' ? 'none' : 'playlist'
}
