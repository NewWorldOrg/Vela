import { codecsOf, mimeOf } from '@/lib/live-wire'
import { MediaFeed, type FeedFault } from '@/components/recordings/media-feed'

export type { FeedFault } from '@/components/recordings/media-feed'

export class LiveFeed {
  private readonly feed: MediaFeed

  constructor(video: HTMLVideoElement, onFault: (fault: FeedFault) => void) {
    this.feed = new MediaFeed(video, onFault, 'plainFirst')
  }

  static supported(): boolean {
    return MediaFeed.supported('plainFirst')
  }

  header(init: Uint8Array): void {
    const codecs = codecsOf(init)

    this.feed.header(init, codecs && mimeOf(codecs))
  }

  append(bytes: Uint8Array): void {
    this.feed.append(bytes)
  }

  end(): number | undefined {
    return this.feed.end()
  }

  runs(): { from: number; to: number }[] {
    return this.feed.runs()
  }

  start(): number | undefined {
    return this.feed.start()
  }

  close(): void {
    this.feed.close()
  }
}
