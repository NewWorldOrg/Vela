import { LiveFeed } from '@/components/live/live-feed'
import {
  aVideo,
  mediaCarriage,
  type Asked,
  type MediaCarriage,
} from '@/components/vela/media-carriage'

export type LiveCarriage = MediaCarriage

export function liveCarriage(video: () => Asked = aVideo): LiveCarriage {
  return mediaCarriage(LiveFeed.supported(), video)
}
