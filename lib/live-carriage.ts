import { LiveFeed } from '@/lib/live-feed'
import {
  aVideo,
  mediaCarriage,
  type Asked,
  type MediaCarriage,
} from '@/lib/media-carriage'

export type LiveCarriage = MediaCarriage

export function liveCarriage(video: () => Asked = aVideo): LiveCarriage {
  return mediaCarriage(LiveFeed.supported(), video)
}
