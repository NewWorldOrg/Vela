import { codecsOf, mimeOf } from '@/lib/live-wire'

/** Why the picture could not be put in front of the element. */
export type FeedFault = 'unsupported' | 'appendFailed'

/** How much of the picture already played is kept behind the playhead. */
const KEEP_BEHIND_SECONDS = 30

/**
 * The fMP4 the wire carries, handed to a `MediaSource` one segment at a time.
 *
 * A `SourceBuffer` takes one append at a time and says so with `updating`, so
 * everything that arrives while it is busy waits in line here and goes in as
 * the buffer frees. The buffer runs in `segments` mode: each segment is placed
 * where its own timestamps say, so a segment that never arrives leaves a hole
 * rather than shifting everything after it a segment early for the rest of the
 * programme — which is what `sequence` mode does, once.
 *
 * The header names the codecs, so nothing is opened until it has arrived and
 * been read; a header this browser cannot decode is a fault, not a stall.
 */
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

  /** The header: names the codecs and, once the source is open, the buffer. */
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

  /** One more segment, in line behind whatever is still going in. */
  append(bytes: Uint8Array): void {
    if (this.closed || !this.mime) {
      return
    }

    this.queue.push(bytes)
    this.drain()
  }

  /** How far the picture held reaches, in the element's own seconds. */
  end(): number | undefined {
    const held = this.buffer?.buffered

    return held && held.length > 0 ? held.end(held.length - 1) : undefined
  }

  /**
   * The runs of picture the element holds, oldest first.
   *
   * A segment that never arrived leaves a hole rather than shifting what
   * follows it, so what is held is a run and not always one run. Which run the
   * playhead is inside is what says whether the newest picture is somewhere it
   * can be played to.
   */
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

  /** Where the picture held begins. */
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
    } catch {
      // Ending a source that is already ending is nothing to do.
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

  /**
   * Lets go of what played long enough ago, so a programme watched for hours
   * does not fill the buffer's quota. Answers whether a removal was started,
   * which the buffer reports the end of like any other update.
   */
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
