import { LivePictures } from '@/lib/live-fragment'
import { codecsOf, mimeOf } from '@/lib/live-wire'
import { MediaFeed, type FeedFault } from '@/lib/media-feed'

export type { FeedFault } from '@/lib/media-feed'

export class LiveFeed {
  private readonly feed: MediaFeed

  private readonly pictures = new LivePictures()

  constructor(
    video: HTMLVideoElement,
    onFault: (fault: FeedFault) => void,
    onAppended: () => void,
  ) {
    this.feed = new MediaFeed(video, onFault, 'plainFirst', onAppended)
  }

  static supported(): boolean {
    return MediaFeed.supported('plainFirst')
  }

  header(init: Uint8Array): void {
    const codecs = codecsOf(init)

    this.pictures.header(init)
    this.feed.header(init, codecs && mimeOf(codecs))
  }

  append(bytes: Uint8Array): void {
    this.pictures.fragment(bytes, this.feed.start())
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

  pictureFrom(): number | undefined {
    return this.pictures.fromOf(this.feed.runs())
  }

  close(): void {
    this.feed.close()
  }
}
