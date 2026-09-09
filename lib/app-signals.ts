import { APP_EVENTS_PATH, type AppEvent } from '@/repository/events'

const DEBOUNCE_MS = 200

export const RECONNECT_MS = 10_000

export class SignalWatch {
  private debounce: ReturnType<typeof setTimeout> | undefined

  private reconnect: ReturnType<typeof setTimeout> | undefined

  private source: EventSource | undefined

  private stopped = false

  private readonly events: readonly AppEvent[]

  private readonly signalled: () => void

  private readonly ended: () => void

  constructor(
    events: readonly AppEvent[],
    signalled: () => void,
    ended: () => void,
  ) {
    this.events = events
    this.signalled = signalled
    this.ended = ended
  }

  listen(): void {
    const source = new EventSource(APP_EVENTS_PATH)

    for (const event of this.events) {
      source.addEventListener(event, this.noticed)
    }

    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED && !this.stopped) {
        void this.dropped()
      }
    }

    this.source = source
  }

  close(): void {
    this.stopped = true
    clearTimeout(this.debounce)
    clearTimeout(this.reconnect)
    this.source?.close()
  }

  private readonly noticed = (): void => {
    clearTimeout(this.debounce)
    this.debounce = setTimeout(this.signalled, DEBOUNCE_MS)
  }

  private readonly dropped = async (): Promise<void> => {
    this.source?.close()

    const refused = await sessionRefused()

    if (this.stopped) {
      return
    }

    if (refused) {
      this.stopped = true
      this.ended()

      return
    }

    this.reconnect = setTimeout(() => this.listen(), RECONNECT_MS)
  }
}

async function sessionRefused(): Promise<boolean> {
  const ask = new AbortController()

  try {
    const response = await fetch(APP_EVENTS_PATH, {
      headers: { accept: 'text/event-stream' },
      cache: 'no-store',
      signal: ask.signal,
    })

    return response.status === 401
  } catch {
    return false
  } finally {
    ask.abort()
  }
}
