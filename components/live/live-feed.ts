import { codecsOf, mimeOf } from '@/lib/live-wire'

export type FeedFault = 'unsupported' | 'appendFailed'

const KEEP_BEHIND_SECONDS = 30

export class LiveFeed {
  private readonly source = new MediaSource()

  private readonly url: string

  private buffer: SourceBuffer | null = null

  private readonly queue: Uint8Array[] = []

  private mime: string | null = null

  private opened = false

  private closed = false

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly onFault: (fault: FeedFault) => void,
  ) {
    this.url = URL.createObjectURL(this.source)
    this.source.addEventListener(
      'sourceopen',
      () => {
        this.opened = true
        this.open()
      },
      { once: true },
    )
    video.src = this.url
  }

  static supported(): boolean {
    return typeof MediaSource !== 'undefined'
  }

  header(init: Uint8Array): void {
    if (this.closed || this.mime) {
      return
    }

    const codecs = codecsOf(init)
    const mime = codecs && mimeOf(codecs)

    if (!mime || !MediaSource.isTypeSupported(mime)) {
      this.onFault('unsupported')

      return
    }

    this.mime = mime
    this.queue.push(init)
    this.open()
  }

  append(bytes: Uint8Array): void {
    if (this.closed || !this.mime) {
      return
    }

    this.queue.push(bytes)
    this.drain()
  }

  end(): number | undefined {
    const held = this.buffer?.buffered

    return held && held.length > 0 ? held.end(held.length - 1) : undefined
  }

  runs(): { from: number; to: number }[] {
    const held = this.buffer?.buffered

    if (!held) {
      return []
    }

    const runs: { from: number; to: number }[] = []

    for (let index = 0; index < held.length; index += 1) {
      runs.push({ from: held.start(index), to: held.end(index) })
    }

    return runs
  }

  start(): number | undefined {
    const held = this.buffer?.buffered

    return held && held.length > 0 ? held.start(0) : undefined
  }

  close(): void {
    this.closed = true
    this.queue.length = 0

    try {
      if (this.source.readyState === 'open' && !this.buffer?.updating) {
        this.source.endOfStream()
      }
    } catch {}

    URL.revokeObjectURL(this.url)
  }

  private open(): void {
    if (this.buffer || !this.opened || !this.mime || this.closed) {
      return
    }

    let buffer: SourceBuffer

    try {
      buffer = this.source.addSourceBuffer(this.mime)
    } catch {
      this.onFault('unsupported')

      return
    }

    buffer.mode = 'segments'
    buffer.addEventListener('updateend', () => this.drain())
    buffer.addEventListener('error', () => this.onFault('appendFailed'))
    this.buffer = buffer
    this.drain()
  }

  private drain(): void {
    const buffer = this.buffer

    if (
      !buffer ||
      buffer.updating ||
      this.closed ||
      this.source.readyState !== 'open'
    ) {
      return
    }

    if (this.trim(buffer)) {
      return
    }

    const next = this.queue.shift()

    if (!next) {
      return
    }

    try {
      buffer.appendBuffer(next as BufferSource)
    } catch (refused) {
      if (
        refused instanceof DOMException &&
        refused.name === 'QuotaExceededError'
      ) {
        this.queue.unshift(next)
        this.trim(buffer, true)

        return
      }

      this.onFault('appendFailed')
    }
  }

  private trim(buffer: SourceBuffer, hard = false): boolean {
    const start = this.start()
    const playhead = this.video.currentTime
    const keep = hard ? KEEP_BEHIND_SECONDS / 3 : KEEP_BEHIND_SECONDS

    if (start === undefined || playhead - start <= keep * 2) {
      return false
    }

    buffer.remove(0, playhead - keep)

    return true
  }
}
