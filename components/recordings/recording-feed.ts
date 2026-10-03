import { MediaFeed } from '@/components/recordings/media-feed'
import { readHeader, readsOn } from '@/lib/recording-stream'

export interface RecordingFeedEvents {
  onFault: () => void
  onCut: () => void
  onBuffered: () => void
}

export interface Carrying {
  close: () => void
}

export type FeedRecording = (
  video: HTMLVideoElement,
  href: string,
  events: RecordingFeedEvents,
) => Carrying

function joined(held: Uint8Array, more: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(held.length + more.length)

  bytes.set(held)
  bytes.set(more, held.length)

  return bytes
}

class RecordingFeed implements Carrying {
  private readonly aborter = new AbortController()

  private readonly feed: MediaFeed

  private head: Uint8Array | null = new Uint8Array(0)

  private wake: (() => void) | null = null

  private settled = false

  constructor(
    private readonly video: HTMLVideoElement,
    href: string,
    private readonly events: RecordingFeedEvents,
  ) {
    this.feed = new MediaFeed(
      video,
      () => this.fail(),
      'managedFirst',
      () => this.appended(),
    )
    this.feed.source.addEventListener('startstreaming', this.poke)
    video.addEventListener('timeupdate', this.poke)
    video.addEventListener('seeking', this.poke)
    void this.read(href)
  }

  close(): void {
    if (this.settled) {
      return
    }

    this.settled = true
    this.aborter.abort()
    this.feed.source.removeEventListener('startstreaming', this.poke)
    this.video.removeEventListener('timeupdate', this.poke)
    this.video.removeEventListener('seeking', this.poke)
    this.feed.close()
    this.wake?.()
  }

  private fail(): void {
    if (this.settled) {
      return
    }

    this.close()
    this.events.onFault()
  }

  private cut(): void {
    if (this.settled) {
      return
    }

    this.close()
    this.events.onCut()
  }

  private async read(href: string): Promise<void> {
    let response: Response

    try {
      response = await fetch(href, { signal: this.aborter.signal })
    } catch {
      this.fail()

      return
    }

    if (!response.ok || !response.body) {
      this.fail()

      return
    }

    await this.take(response.body.getReader())
  }

  private async take(reader: ReadableStreamDefaultReader<Uint8Array>) {
    try {
      while (!this.settled) {
        await this.room()

        const { value, done } = await reader.read()

        if (done) {
          this.finished()

          return
        }

        this.carry(value)
      }
    } catch {
      if (this.head) {
        this.fail()

        return
      }

      this.cut()
    } finally {
      reader.releaseLock()
    }
  }

  private finished(): void {
    if (this.head) {
      this.fail()

      return
    }

    this.feed.finish()
  }

  private carry(bytes: Uint8Array): void {
    if (!this.head) {
      this.feed.append(bytes)

      return
    }

    const held = joined(this.head, bytes)
    const reading = readHeader(held)

    if (reading.state === 'short') {
      this.head = held

      return
    }

    if (reading.state === 'unfit') {
      this.fail()

      return
    }

    this.head = null
    this.feed.header(held.subarray(0, reading.length), reading.mime)

    if (reading.length < held.length) {
      this.feed.append(held.subarray(reading.length))
    }
  }

  private room(): Promise<void> {
    if (this.readsOn()) {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      this.wake = resolve
    })
  }

  private readsOn(): boolean {
    if (this.settled || this.head) {
      return true
    }

    const end = this.feed.end()

    return readsOn({
      ahead: end === undefined ? 0 : end - this.video.currentTime,
      queued: this.feed.queued(),
      managed: this.feed.managed,
      streaming: this.feed.streaming(),
    })
  }

  private readonly poke = () => {
    this.feed.pump()

    if (!this.wake || !this.readsOn()) {
      return
    }

    const wake = this.wake

    this.wake = null
    wake()
  }

  private appended(): void {
    if (this.settled) {
      return
    }

    const start = this.feed.start()

    if (start !== undefined && this.video.currentTime < start) {
      this.video.currentTime = start
    }

    this.events.onBuffered()
    this.poke()
  }
}

export const feedRecording: FeedRecording = (video, href, events) => {
  if (!MediaFeed.supported('managedFirst')) {
    video.src = href

    return { close: () => {} }
  }

  return new RecordingFeed(video, href, events)
}
