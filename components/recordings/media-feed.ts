export type FeedFault = 'unsupported' | 'appendFailed'

export type SourceOrder = 'plainFirst' | 'managedFirst'

type SourceKind = typeof MediaSource

const KEEP_BEHIND_SECONDS = 30

function managedKind(): SourceKind | undefined {
  return (globalThis as { ManagedMediaSource?: SourceKind }).ManagedMediaSource
}

function plainKind(): SourceKind | undefined {
  return typeof MediaSource === 'undefined' ? undefined : MediaSource
}

function kindFor(order: SourceOrder): SourceKind | undefined {
  return order === 'managedFirst'
    ? (managedKind() ?? plainKind())
    : (plainKind() ?? managedKind())
}

/** A media source fed with a fragmented MP4, a header and then its fragments. */
export class MediaFeed {
  readonly source: MediaSource

  readonly managed: boolean

  private readonly kind: SourceKind

  private readonly url: string

  private readonly remotePlaybackWas: boolean

  private buffer: SourceBuffer | null = null

  private readonly queue: Uint8Array[] = []

  private mime: string | null = null

  private opened = false

  private closed = false

  private finishing = false

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly onFault: (fault: FeedFault) => void,
    order: SourceOrder,
    private readonly onAppended: () => void = () => {},
  ) {
    const kind = kindFor(order)

    if (!kind) {
      throw new Error('this browser has no media source to feed')
    }

    this.kind = kind
    this.managed = kind === managedKind()
    this.source = new kind()
    this.url = URL.createObjectURL(this.source)
    this.remotePlaybackWas = video.disableRemotePlayback
    this.source.addEventListener(
      'sourceopen',
      () => {
        this.opened = true
        this.open()
      },
      { once: true },
    )

    if (this.managed) {
      video.disableRemotePlayback = true
    }

    video.src = this.url
  }

  static supported(order: SourceOrder): boolean {
    return kindFor(order) !== undefined
  }

  header(init: Uint8Array, mime: string | null): void {
    if (this.closed || this.mime) {
      return
    }

    if (!mime || !this.kind.isTypeSupported(mime)) {
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

  finish(): void {
    this.finishing = true
    this.drain()
  }

  queued(): number {
    return this.queue.length
  }

  streaming(): boolean {
    return (
      (this.source as MediaSource & { streaming?: boolean }).streaming ?? true
    )
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

  pump(): void {
    this.drain()
  }

  close(): void {
    this.closed = true
    this.queue.length = 0

    try {
      if (this.source.readyState === 'open' && !this.buffer?.updating) {
        this.source.endOfStream()
      }
    } catch {}

    if (this.managed) {
      this.video.disableRemotePlayback = this.remotePlaybackWas
    }

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
    buffer.addEventListener('updateend', () => {
      this.onAppended()
      this.drain()
    })
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
      this.endWhenFinished()

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

  private endWhenFinished(): void {
    if (!this.finishing) {
      return
    }

    try {
      this.source.endOfStream()
    } catch {}
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
