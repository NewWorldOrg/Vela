import { MediaFeed } from '@/components/recordings/media-feed'
import {
  aVideo,
  mediaCarriage,
  type Asked,
  type MediaCarriage,
} from '@/components/vela/media-carriage'

export type RecordingCarriage = MediaCarriage

/** How this browser takes a recording transcoded as it plays: the managed media source, the plain one, then HLS. */
export function recordingCarriage(
  video: () => Asked = aVideo,
): RecordingCarriage {
  return mediaCarriage(MediaFeed.supported('managedFirst'), video)
}
