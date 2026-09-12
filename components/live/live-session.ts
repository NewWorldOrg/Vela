import {
  controlFrame,
  readCaption,
  readCaptionCanvas,
  readControl,
  readFrame,
  type CaptionCanvas,
  type CaptionPicture,
  type LiveFrame,
  type LiveRefusal,
  type LiveRefusalDetail,
  type LiveStartup,
  type LiveSupplyEnd,
  type TranscodeCeiling,
} from '@/lib/live-wire'
import {
  LIVE_SESSION_PROBE_PATH,
  LIVE_SESSIONS_PATH,
} from '@/repository/live-paths'
import {
  backlogOf,
  readLiveSessions,
  type LiveBacklog,
  type LiveSeat,
} from '@/repository/live-sessions'

export interface LiveSocket {
  binaryType: BinaryType
  readyState: number
  onopen: ((event: Event) => void) | null
  onmessage: ((event: MessageEvent) => void) | null
  onclose: ((event: CloseEvent) => void) | null
  onerror: ((event: Event) => void) | null
  send(data: ArrayBuffer | ArrayBufferView): void
  close(code?: number, reason?: string): void
}

export type OpenSocket = (href: string) => LiveSocket

export interface LiveSessionEvents {
  onHeader: (init: Uint8Array) => void
  onPicture: (payload: Uint8Array, pts: number) => void
  onCaptionCanvas: (canvas: CaptionCanvas) => void
  onCaption: (picture: CaptionPicture | null, pts: number) => void
  onProgress: (startup: LiveStartup) => void
  onRefusal: (
    refusal: LiveRefusal,
    over: { ceiling?: TranscodeCeiling; detail?: LiveRefusalDetail },
  ) => void
  onEnding: (why: LiveSupplyEnd) => void
  onDropped: (code: number) => void
}

export interface LiveSession {
  leave: () => void
}

const OPEN = 1

const CLOSED_CLEANLY = 1000

export const FRESH_WIRE_EVERY_MS = 15 * 60 * 1000

export const FRESH_WIRE_AGAIN_AFTER_MS = 30 * 1000

function socketUrl(href: string): string {
  const url = new URL(href, window.location.href)

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

  return url.toString()
}

const openWebSocket: OpenSocket = (href) => new WebSocket(socketUrl(href))

export function openLiveSession(
  href: string,
  events: LiveSessionEvents,
  openSocket: OpenSocket = openWebSocket,
): LiveSession {
  let said: 'nothing' | 'refusal' | 'ending' = 'nothing'
  let leaving = false
  let headerGiven = false
  let lastPicturePts = -1
  let lastCaptionPts = -1
  let laying: LiveSocket | null = null
  let laid: ReturnType<typeof setTimeout> | null = null
  let carrying: LiveSocket = openSocket(href)

  attach(carrying)
  arm(FRESH_WIRE_EVERY_MS)

  function attach(socket: LiveSocket) {
    socket.binaryType = 'arraybuffer'

    socket.onmessage = (event) => {
      if (!(event.data instanceof ArrayBuffer)) {
        return
      }

      const frame = readFrame(new Uint8Array(event.data))

      if (frame) {
        took(socket, frame)
      }
    }

    socket.onclose = (event) => {
      if (leaving || said !== 'nothing') {
        return
      }

      if (socket === laying) {
        laying = null

        return
      }

      if (event.code === CLOSED_CLEANLY) {
        said = 'ending'
        events.onEnding('letGo')

        return
      }

      events.onDropped(event.code)
    }
  }

  function took(socket: LiveSocket, frame: LiveFrame) {
    switch (frame.channel) {
      case 'pictureHeader':
        if (!headerGiven) {
          headerGiven = true
          events.onHeader(frame.payload)
        }
        break
      case 'picture':
        if (frame.pts > lastPicturePts) {
          lastPicturePts = frame.pts
          events.onPicture(frame.payload, frame.pts)
        }

        if (socket === laying) {
          carry()
        }
        break
      case 'captionHeader': {
        const canvas = readCaptionCanvas(frame.payload)

        if (canvas) {
          events.onCaptionCanvas(canvas)
        }
        break
      }
      case 'caption': {
        if (frame.pts <= lastCaptionPts) {
          break
        }

        lastCaptionPts = frame.pts

        const caption = readCaption(frame.payload)

        if (caption.said === 'shown') {
          events.onCaption(caption.picture, frame.pts)
        } else if (caption.said === 'cleared') {
          events.onCaption(null, frame.pts)
        }
        break
      }
      case 'control':
        heard(socket, frame.payload)
        break
      default:
        break
    }
  }

  function heard(socket: LiveSocket, payload: Uint8Array) {
    const control = readControl(payload)

    switch (control.said) {
      case 'ping':
        if (socket.readyState === OPEN) {
          socket.send(controlFrame('pong'))
        }
        break
      case 'progress':
        if (socket === carrying) {
          events.onProgress(control.startup)
        }
        break
      case 'refusal':
        if (socket === laying) {
          laying = null
          letGo(socket)

          break
        }

        said = 'refusal'
        events.onRefusal(control.refusal, {
          ceiling: control.ceiling,
          detail: control.detail,
        })
        break
      case 'ending':
        said = 'ending'
        events.onEnding(control.why)
        break
      default:
        break
    }
  }

  function carry() {
    const fresh = laying

    if (!fresh) {
      return
    }

    const worn = carrying

    laying = null
    carrying = fresh
    letGo(worn)
    arm(FRESH_WIRE_EVERY_MS)
  }

  function lay() {
    laid = null

    if (leaving || said !== 'nothing') {
      return
    }

    if (laying) {
      const stale = laying

      laying = null
      letGo(stale)
    }

    const fresh = openSocket(href)

    laying = fresh
    attach(fresh)
    arm(FRESH_WIRE_AGAIN_AFTER_MS)
  }

  function arm(after: number) {
    if (laid !== null) {
      clearTimeout(laid)
    }

    laid = setTimeout(lay, after)
  }

  function letGo(socket: LiveSocket) {
    socket.onmessage = null
    socket.onclose = null
    socket.onerror = null

    try {
      if (socket.readyState === OPEN) {
        socket.send(controlFrame('leaving'))
      }

      socket.close(CLOSED_CLEANLY)
    } catch {}
  }

  return {
    leave: () => {
      leaving = true

      if (laid !== null) {
        clearTimeout(laid)
        laid = null
      }

      if (laying) {
        const stale = laying

        laying = null
        letGo(stale)
      }

      letGo(carrying)
    },
  }
}

export async function askWhetherSignedOut(): Promise<boolean> {
  try {
    const answer = await fetch(LIVE_SESSION_PROBE_PATH, { cache: 'no-store' })

    void answer.body?.cancel()

    return answer.status === 401
  } catch {
    return false
  }
}

export type AskBacklog = (seat: LiveSeat) => Promise<LiveBacklog | undefined>

export const askLiveBacklog: AskBacklog = async (seat) => {
  try {
    const answer = await fetch(LIVE_SESSIONS_PATH, { cache: 'no-store' })

    if (!answer.ok) {
      void answer.body?.cancel()

      return undefined
    }

    const sessions = readLiveSessions(await answer.json())

    return sessions ? backlogOf(sessions, seat) : undefined
  } catch {
    return undefined
  }
}
