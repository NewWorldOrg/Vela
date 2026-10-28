import { LiveFeed } from '@/components/live/live-feed'
import {
  aVideo,
  mediaCarriage,
  type Asked,
  type MediaCarriage,
} from '@/components/vela/media-carriage'

export type LiveCarriage = MediaCarriage

/** Tries a media source, then the managed one, then HLS in the video itself. */
export function liveCarriage(video: () => Asked = aVideo): LiveCarriage {
  return mediaCarriage(LiveFeed.supported(), video)
}
