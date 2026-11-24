import { MediaFeed } from '@/lib/media-feed'
import {
  aVideo,
  mediaCarriage,
  type Asked,
  type MediaCarriage,
} from '@/lib/media-carriage'

export type RecordingCarriage = MediaCarriage

export function recordingCarriage(
  video: () => Asked = aVideo,
): RecordingCarriage {
  return mediaCarriage(MediaFeed.supported('managedFirst'), video)
}
