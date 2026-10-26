import { LiveFeed } from '@/components/live/live-feed'

/** How a browser takes a live channel: fed to a media source, handed a playlist, or not at all. */
export type LiveCarriage = 'feed' | 'playlist' | 'none'

const HLS = 'application/vnd.apple.mpegurl'

type Asked = Pick<HTMLVideoElement, 'canPlayType'>

let probe: Asked | undefined

function aVideo(): Asked {
  probe ??= document.createElement('video')

  return probe
}

/** Tries a media source, then the managed one, then HLS in the video itself. */
export function liveCarriage(video: () => Asked = aVideo): LiveCarriage {
  if (LiveFeed.supported()) {
    return 'feed'
  }

  return video().canPlayType(HLS) === '' ? 'none' : 'playlist'
}
