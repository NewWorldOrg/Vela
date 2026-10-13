import type { Rect } from '@/lib/caption-placement'
import type { BmlKey } from '@/lib/bml/keys'
import { insideBoundary } from '@/lib/hybridcast/boundary'
import { APP_KEY_CODE, keyGlobals } from '@/lib/hybridcast/keys'
import {
  APP_SIZE,
  appStateOf,
  frameNameOf,
  receiverMessageOf,
  type AppState,
} from '@/lib/hybridcast/messages'
import { HybridcastReceiver } from '@/lib/hybridcast/receiver'
import {
  intendedTarget,
  relayedAddress,
  relayedTarget,
  routeRequest,
  routeSocket,
  writtenTarget,
  type AppRelay,
} from '@/lib/hybridcast/relay'
import {
  relayedBeacon,
  relayedFetch,
  relayedWebSocket,
  relayedXhr,
  type Route,
} from '@/lib/hybridcast/wrappers'

export type ReceiverWindow = Window & typeof globalThis

/** What the application's documents carry in the user agent: that the receiver runs Hybridcast, and no maker. */
export const HYBRIDCAST_AGENT = 'Hybridcast/1.0'

const BROADCAST_VIDEO = 'video/x-iptvf-broadcast'

/** The attributes of each element that name an address the browser loads or goes to. */
const ADDRESSED: Record<string, string[]> = {
  a: ['href'],
  area: ['href'],
  audio: ['src'],
  embed: ['src'],
  form: ['action'],
  frame: ['src'],
  iframe: ['src'],
  img: ['src'],
  input: ['src'],
  link: ['href'],
  object: ['data'],
  script: ['src'],
  source: ['src'],
  track: ['src'],
  video: ['src', 'poster'],
}

const STYLE_URL = /url\(\s*(["']?)([^"')]*)\1\s*\)/gi

const KEY_NAME: Record<BmlKey, string> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  enter: 'Enter',
  back: 'BrowserBack',
  d: 'Unidentified',
  red: 'ColorF0Red',
  green: 'ColorF1Green',
  yellow: 'ColorF2Yellow',
  blue: 'ColorF3Blue',
}

interface Frame {
  window: ReceiverWindow
  relay: AppRelay
  documentAt: URL
  inside: (address: string) => boolean
}

function descriptorOf(
  object: object,
  property: string,
): PropertyDescriptor | undefined {
  for (
    let at: object | null = object;
    at;
    at = Object.getPrototypeOf(at) as object | null
  ) {
    const found = Object.getOwnPropertyDescriptor(at, property)

    if (found) {
      return found
    }
  }

  return undefined
}

/** The relay address for an address written into the markup at run time, or null to leave it as it is: one the relay already has, one that names no server, a fragment. */
function pointed(frame: Frame, written: string): string | null {
  const value = written.trim()

  if (value.length === 0 || value.startsWith('#')) {
    return null
  }

  let here: URL

  try {
    here = new URL(value, frame.window.location.href)
  } catch {
    return null
  }

  if (relayedTarget(here, frame.relay)) {
    return null
  }

  const target = writtenTarget(value, frame.relay, frame.documentAt)

  return target && (target.protocol === 'http:' || target.protocol === 'https:')
    ? relayedAddress(frame.relay.app, target)
    : null
}

function pointedStyle(frame: Frame, style: string): string {
  return style.replace(STYLE_URL, (whole, _quote: string, address: string) => {
    const relayed = pointed(frame, address)

    return relayed ? `url("${relayed}")` : whole
  })
}

/** Points the addresses of one element at the relay: the ones it loads or goes to, and the `url()` of its style. */
function pointElement(frame: Frame, element: Element): void {
  ;(ADDRESSED[element.localName] ?? []).forEach((name) => {
    const written = element.getAttribute(name)
    const relayed = written === null ? null : pointed(frame, written)

    if (relayed) {
      element.setAttribute(name, relayed)
    }
  })

  const style = element.getAttribute('style')
  const relayed =
    style && /url\(/i.test(style) ? pointedStyle(frame, style) : style

  if (style && relayed !== style) {
    element.setAttribute('style', relayed as string)
  }
}

/** Carina points every address of the markup it relays at the relay; what a script writes into the document later is pointed here. A script's own address is pointed as it is set, as a script element is fetched the moment it is placed; the rest as it lands, which loads it again from the relay. */
function pointAddressesWrittenLater(frame: Frame): void {
  const { window } = frame
  const scriptSource = descriptorOf(window.HTMLScriptElement.prototype, 'src')
  const setAttribute = window.Element.prototype.setAttribute

  if (scriptSource?.set) {
    const set = scriptSource.set

    Object.defineProperty(window.HTMLScriptElement.prototype, 'src', {
      ...scriptSource,
      set(this: HTMLScriptElement, value: unknown) {
        set.call(this, pointed(frame, String(value)) ?? value)
      },
    })
  }

  window.Element.prototype.setAttribute = function (
    this: Element,
    name: string,
    value: string,
  ) {
    const relayed =
      this.localName === 'script' && name.toLowerCase() === 'src'
        ? pointed(frame, String(value))
        : null

    setAttribute.call(this, name, relayed ?? value)
  }

  const point = (node: Node) => {
    if (node.nodeType !== 1) {
      return
    }

    const element = node as Element

    pointElement(frame, element)
    element.querySelectorAll('*').forEach((inner) => pointElement(frame, inner))
  }

  new window.MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === 'attributes') {
        pointElement(frame, record.target as Element)
      } else {
        record.addedNodes.forEach(point)
      }
    })
  }).observe(window.document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [...new Set(Object.values(ADDRESSED).flat()), 'style'],
  })
}

/** Keeps the frame on the relay. A document that goes elsewhere on its own goes through the relay instead when the address is inside the boundary, and stays where it is when it is not (IPTVFJ STD-0010 7.6.1). The player closes the frame on any document that opens elsewhere all the same. */
function keepOnTheRelay(frame: Frame): void {
  const navigation = (frame.window as { navigation?: EventTarget }).navigation

  navigation?.addEventListener('navigate', (event) => {
    const going = event as Event & {
      cancelable: boolean
      destination: { url: string; sameDocument: boolean }
      downloadRequest: string | null
      formData: FormData | null
    }

    if (
      going.destination.sameDocument ||
      !going.cancelable ||
      going.downloadRequest !== null
    ) {
      return
    }

    const destination = new URL(going.destination.url)

    if (relayedTarget(destination, frame.relay)) {
      return
    }

    going.preventDefault()

    const target = intendedTarget(destination, frame.relay, frame.documentAt)

    if (going.formData !== null || !frame.inside(target.href)) {
      frame.window.console.warn(
        'Hybridcast: the application stays where it is; that address is outside its boundary',
      )

      return
    }

    queueMicrotask(() =>
      frame.window.location.assign(
        `${frame.relay.origin}${relayedAddress(frame.relay.app, target)}`,
      ),
    )
  })
}

function relayNetwork(frame: Frame): void {
  const { window, relay, documentAt, inside } = frame
  const route: Route = (written) =>
    routeRequest(written, relay, documentAt, inside)
  const beacon = window.navigator.sendBeacon?.bind(window.navigator)

  window.fetch = relayedFetch(window.fetch.bind(window), route)
  window.XMLHttpRequest = relayedXhr(window.XMLHttpRequest, route)
  window.WebSocket = relayedWebSocket(window.WebSocket, (written) =>
    routeSocket(written, relay, documentAt, inside),
  )

  if (beacon) {
    window.navigator.sendBeacon = relayedBeacon(beacon, route)
  }
}

/** Hands a key of the remote to the document as a `keydown` and a `keyup` with the code of its `VK_*`, at what has the focus. */
function press(window: ReceiverWindow, key: BmlKey): void {
  const code = APP_KEY_CODE[key]
  const target: EventTarget =
    window.document.activeElement ?? window.document.body ?? window.document

  ;['keydown', 'keyup'].forEach((type) => {
    const event = new window.KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      key: KEY_NAME[key],
    })

    Object.defineProperty(event, 'keyCode', { get: () => code })
    Object.defineProperty(event, 'which', { get: () => code })
    target.dispatchEvent(event)
  })
}

function clipped(box: DOMRect): Rect | null {
  const left = Math.max(0, box.left)
  const top = Math.max(0, box.top)
  const right = Math.min(APP_SIZE.width, box.right)
  const bottom = Math.min(APP_SIZE.height, box.bottom)

  return right > left && bottom > top
    ? { left, top, width: right - left, height: bottom - top }
    : null
}

/** Follows the broadcast's picture as the document places it, the first `object` of its type that is laid out, and tells the player whenever it moves, once per frame at most. */
function followThePicture(
  window: ReceiverWindow,
  receiver: HybridcastReceiver,
): void {
  let told: string | null = null
  let asked = false

  const measure = () => {
    asked = false

    const object = [...window.document.querySelectorAll('object')].find(
      (found) =>
        (found.getAttribute('type') ?? '').toLowerCase() === BROADCAST_VIDEO &&
        clipped(found.getBoundingClientRect()) !== null,
    )
    const rect = object ? clipped(object.getBoundingClientRect()) : null
    const said = JSON.stringify(rect)

    if (said !== told) {
      told = said
      receiver.videoAt(rect)
    }
  }

  const ask = () => {
    if (!asked) {
      asked = true
      window.requestAnimationFrame(measure)
    }
  }

  new window.MutationObserver(ask).observe(window.document, {
    subtree: true,
    childList: true,
    attributes: true,
  })
  window.addEventListener('resize', ask)
  window.addEventListener('load', ask)
  window.document.addEventListener('transitionend', ask, true)
  window.document.addEventListener('animationend', ask, true)
  ask()
}

function giveTheNavigator(
  window: ReceiverWindow,
  receiver: HybridcastReceiver,
): void {
  const api = receiver.api()
  const agent = `${window.navigator.userAgent} ${HYBRIDCAST_AGENT}`
  const given: Record<string, unknown> = { ...api, userAgent: agent }

  Object.entries(given).forEach(([name, value]) =>
    Object.defineProperty(window.navigator, name, {
      configurable: true,
      enumerable: true,
      get: () => value,
    }),
  )

  keyGlobals().forEach(([name, code]) => {
    ;(window as unknown as Record<string, number>)[name] = code
  })
}

/** Keeps the state in the frame's name, where the next document of the application reads it, and gives the application a name of its own in its place. */
function keepTheName(
  window: ReceiverWindow,
  receiver: () => HybridcastReceiver,
): (state: AppState) => void {
  const name = descriptorOf(window, 'name')
  const write = name?.set

  Object.defineProperty(window, 'name', {
    configurable: true,
    enumerable: true,
    get: () => receiver().name,
    set: (value: unknown) => {
      receiver().name = String(value)
    },
  })

  return (state) => write?.call(window, frameNameOf(state))
}

/** Starts the receiver in a document of the application, from the script element Carina put first into it: the relay it is on, where its WebSockets are carried, the broadcaster's URL of the document, and Vela's origin, which the script came from. The state is the one the frame carries in its name. Without any of them, nothing is given and the document never says it opened, so the player closes the frame. */
export function startHybridcastReceiver(
  window: ReceiverWindow,
  script: HTMLScriptElement | null,
): HybridcastReceiver | null {
  const relayPath = script?.dataset.hybridcastRelay
  const socketPath = script?.dataset.hybridcastSocket
  const documentAt = script?.dataset.hybridcastDocument
  const state = appStateOf(window.name)

  if (!script || !relayPath || !socketPath || !documentAt || !state) {
    return null
  }

  const origin = new URL(script.src).origin
  const relay: AppRelay = { origin, app: relayPath, socket: socketPath }
  const channel = new window.MessageChannel()
  const port = channel.port1
  const boundary = state.application.boundary
  const frame: Frame = {
    window,
    relay,
    documentAt: new URL(documentAt),
    inside: (address) => insideBoundary(boundary, address),
  }
  let made: HybridcastReceiver | null = null
  const keep = keepTheName(window, () => made as HybridcastReceiver)
  const receiver = new HybridcastReceiver({
    documentAt,
    state,
    say: (message) => port.postMessage(message),
    keep,
    warn: (text) => window.console.warn(text),
    now: () => window.performance.now(),
    setTimeout: (run, ms) => window.setTimeout(run, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  })

  made = receiver
  giveTheNavigator(window, receiver)
  relayNetwork(frame)
  pointAddressesWrittenLater(frame)
  keepOnTheRelay(frame)
  followThePicture(window, receiver)

  port.onmessage = (event) => {
    const message = receiverMessageOf(event.data)

    if (message?.kind === 'key') {
      if (receiver.takes(message.key)) {
        press(window, message.key)
      }

      return
    }

    if (message) {
      receiver.take(message)
    }
  }
  window.parent.postMessage(
    { kind: 'hello', relay: relayPath, document: documentAt },
    origin,
    [channel.port2],
  )

  return receiver
}
