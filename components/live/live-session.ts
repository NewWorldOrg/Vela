import {
  controlFrame,
  readCaption,
  readCaptionCanvas,
  readControl,
  readFrame,
  type CaptionCanvas,
  type CaptionPicture,
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

/**
 * The part of a `WebSocket` the session drives. Named so that a story can hand
 * in a socket of its own and say what arrives on it.
 */
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
  /** The canvas the captions are drawn on, said before the first of them. */
  onCaptionCanvas: (canvas: CaptionCanvas) => void
  /** A caption to show from this stamp on — or, with nothing, the caption taken off. */
  onCaption: (picture: CaptionPicture | null, pts: number) => void
  onProgress: (startup: LiveStartup) => void
  onRefusal: (
    refusal: LiveRefusal,
    over: { ceiling?: TranscodeCeiling; detail?: LiveRefusalDetail },
  ) => void
  onEnding: (why: LiveSupplyEnd) => void
  /** Closed with neither a refusal nor an ending said first. */
  onDropped: (code: number) => void
}

export interface LiveSession {
  /** Say so, then close. The server frees the seat at once rather than on a timeout. */
  leave: () => void
}

const OPEN = 1

/** The wire's address, from the page's own: `https` becomes `wss`. */
function socketUrl(href: string): string {
  const url = new URL(href, window.location.href)

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

  return url.toString()
}

const openWebSocket: OpenSocket = (href) => new WebSocket(socketUrl(href))

/**
 * One viewing of one channel in one profile, from the handshake to leaving.
 *
 * Everything that arrives is a frame, and every frame goes one of four ways:
 * the header and the pictures go to whoever feeds the element, the captions
 * and their canvas to whoever lays them over it, a control message is answered
 * or reported, and anything else — the channels the wire has reserved and does
 * not use yet — is passed over. A ping is answered here,
 * because it is the wire's business and not the screen's.
 *
 * The close is read against what was said before it. A refusal and an ending
 * both come as a message and then a close, so a close after either is the end
 * the message announced; a close after neither is a wire that dropped, and
 * that is reported as such rather than retried on its own.
 */
export function openLiveSession(
  href: string,
  events: LiveSessionEvents,
  openSocket: OpenSocket = openWebSocket,
): LiveSession {
  const socket = openSocket(href)
  let said: 'nothing' | 'refusal' | 'ending' = 'nothing'
  let leaving = false

  socket.binaryType = 'arraybuffer'

  socket.onmessage = (event) => {
    if (!(event.data instanceof ArrayBuffer)) {
      return
    }

    const frame = readFrame(new Uint8Array(event.data))

    if (!frame) {
      return
    }

    switch (frame.channel) {
      case 'pictureHeader':
        events.onHeader(frame.payload)
        break
      case 'picture':
        events.onPicture(frame.payload, frame.pts)
        break
      case 'captionHeader': {
        const canvas = readCaptionCanvas(frame.payload)

        if (canvas) {
          events.onCaptionCanvas(canvas)
        }
        break
      }
      case 'caption': {
        const caption = readCaption(frame.payload)

        if (caption.said === 'shown') {
          events.onCaption(caption.picture, frame.pts)
        } else if (caption.said === 'cleared') {
          events.onCaption(null, frame.pts)
        }
        break
      }
      case 'control':
        heard(frame.payload)
        break
      default:
        break
    }
  }

  socket.onclose = (event) => {
    if (leaving || said !== 'nothing') {
      return
    }

    events.onDropped(event.code)
  }

  function heard(payload: Uint8Array) {
    const control = readControl(payload)

    switch (control.said) {
      case 'ping':
        if (socket.readyState === OPEN) {
          socket.send(controlFrame('pong'))
        }
        break
      case 'progress':
        events.onProgress(control.startup)
        break
      case 'refusal':
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

  return {
    leave: () => {
      leaving = true

      try {
        if (socket.readyState === OPEN) {
          socket.send(controlFrame('leaving'))
        }

        socket.close(1000)
      } catch {
        // A socket already gone has nothing to be told.
      }
    },
  }
}

/**
 * Whether the session the browser holds has gone. A socket that failed its
 * handshake reports no status, so the cheapest read the API has is asked
 * instead; only a refusal of the session itself is a sign-out, and anything
 * else — a network blip, an app restarting — is not.
 */
export async function askWhetherSignedOut(): Promise<boolean> {
  try {
    const answer = await fetch(LIVE_SESSION_PROBE_PATH, { cache: 'no-store' })

    void answer.body?.cancel()

    return answer.status === 401
  } catch {
    return false
  }
}

/** How a session's backlog is read. The screen asks the API; a story hands in its own. */
export type AskBacklog = (seat: LiveSeat) => Promise<LiveBacklog | undefined>

/**
 * What the session being watched has thrown away so far, asked of the API.
 *
 * The wire carries no such count, and the sessions it belongs to are listed
 * at one address for every viewer, so the seat's own is picked out of the
 * list. Anything short of an answer — a refused request, a body that is not
 * the list, a list the seat is not on — is no reading rather than a nought:
 * the count on screen is the last one read, and a moment the API could not
 * be asked is not a moment nothing was dropped.
 */
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
