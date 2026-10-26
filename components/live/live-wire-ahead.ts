import { controlFrame } from '@/lib/live-wire'
import type { FormatSettled } from '@/lib/playback-format'

import type { LiveSocket } from '@/components/live/live-session'

/** How long a wire opened at the press waits for the player to take it before it is closed. */
export const WIRE_KEPT_AHEAD_MS = 5000

const OPEN = 1

const CLOSED_CLEANLY = 1000

type Heard =
  | { kind: 'open'; event: Event }
  | { kind: 'message'; event: MessageEvent }
  | { kind: 'close'; event: CloseEvent }
  | { kind: 'error'; event: Event }

/**
 * A wire opened before anyone listens to it. What it hears is kept, and handed on in the order it was heard once it
 * has been taken; what nobody listens for by then is dropped.
 */
class KeptWire implements LiveSocket {
  onopen: ((event: Event) => void) | null = null

  private readonly socket: LiveSocket

  private readonly heard: Heard[] = []

  private listening: {
    message: ((event: MessageEvent) => void) | null
    close: ((event: CloseEvent) => void) | null
    error: ((event: Event) => void) | null
  } = { message: null, close: null, error: null }

  private handing = false

  private taken = false

  constructor(socket: LiveSocket) {
    this.socket = socket
    socket.binaryType = 'arraybuffer'
    socket.onopen = (event) => this.hear({ kind: 'open', event })
    socket.onmessage = (event) => this.hear({ kind: 'message', event })
    socket.onclose = (event) => this.hear({ kind: 'close', event })
    socket.onerror = (event) => this.hear({ kind: 'error', event })
  }

  get binaryType(): BinaryType {
    return this.socket.binaryType
  }

  set binaryType(type: BinaryType) {
    this.socket.binaryType = type
  }

  get readyState(): number {
    return this.socket.readyState
  }

  get onmessage(): ((event: MessageEvent) => void) | null {
    return this.listening.message
  }

  set onmessage(listener: ((event: MessageEvent) => void) | null) {
    this.listening.message = listener
    this.taken ||= listener !== null
    this.handOn()
  }

  get onclose(): ((event: CloseEvent) => void) | null {
    return this.listening.close
  }

  set onclose(listener: ((event: CloseEvent) => void) | null) {
    this.listening.close = listener
    this.taken ||= listener !== null
    this.handOn()
  }

  get onerror(): ((event: Event) => void) | null {
    return this.listening.error
  }

  set onerror(listener: ((event: Event) => void) | null) {
    this.listening.error = listener
    this.taken ||= listener !== null
    this.handOn()
  }

  send(data: ArrayBuffer | ArrayBufferView<ArrayBuffer>): void {
    this.socket.send(data)
  }

  close(code?: number, reason?: string): void {
    this.socket.close(code, reason)
  }

  private hear(heard: Heard) {
    this.heard.push(heard)
    this.handOn()
  }

  private handOn() {
    if (!this.taken || this.handing || this.heard.length === 0) {
      return
    }

    this.handing = true
    queueMicrotask(() => {
      this.handing = false
      this.handOnNow()
    })
  }

  private handOnNow() {
    for (let next = this.heard.shift(); next; next = this.heard.shift()) {
      const listener =
        next.kind === 'open'
          ? this.onopen
          : (this.listening[next.kind] as ((event: Event) => void) | null)

      listener?.(next.event)
    }
  }
}

let ahead: {
  href: string
  wire: KeptWire
  expiry: ReturnType<typeof setTimeout>
} | null = null

/**
 * Opens the wire for a channel at the moment it is chosen, for the player to take once it has been drawn. A wire
 * opened earlier and not taken is closed, and so is this one if nothing takes it in time.
 */
export function openWireAhead(
  href: string,
  open: (href: string) => LiveSocket,
  keptMs: number = WIRE_KEPT_AHEAD_MS,
): void {
  letGoOfTheWireAhead()

  const wire = new KeptWire(open(href))

  ahead = {
    href,
    wire,
    expiry: setTimeout(letGoOfTheWireAhead, keptMs),
  }
}

/** The wire opened ahead for this address, handed over once; nothing for any other address. */
export function takeWireAhead(href: string): LiveSocket | undefined {
  if (!ahead || ahead.href !== href) {
    return undefined
  }

  const { wire, expiry } = ahead

  clearTimeout(expiry)
  ahead = null

  return wire
}

function letGoOfTheWireAhead() {
  if (!ahead) {
    return
  }

  const { wire, expiry } = ahead

  clearTimeout(expiry)
  ahead = null
  wire.onmessage = null
  wire.onclose = null
  wire.onerror = null

  try {
    if (wire.readyState === OPEN) {
      wire.send(controlFrame('leaving'))
    }

    wire.close(CLOSED_CLEANLY)
  } catch {}
}

let profileInUse: string | undefined

/** Notes the profile a player is using, so that a wire opened ahead for the next channel asks for the same one. */
export function holdWireProfile(profile: string | undefined): () => void {
  profileInUse = profile

  return () => {
    if (profileInUse === profile) {
      profileInUse = undefined
    }
  }
}

export function wireProfileInUse(): string | undefined {
  return profileInUse
}

let formatInUse: FormatSettled | undefined

/** Notes the format a player settled on, so that a wire opened ahead for the next channel asks for the same one. */
export function holdWireFormat(format: FormatSettled): () => void {
  formatInUse = format

  return () => {
    if (formatInUse === format) {
      formatInUse = undefined
    }
  }
}

export function wireFormatInUse(): FormatSettled | undefined {
  return formatInUse
}
