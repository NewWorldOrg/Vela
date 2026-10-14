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
import {
  STATION_LOCATION,
  navigateTo,
  stationLocation,
  type StationNavigation,
} from '@/lib/hybridcast/location'
import { HybridcastReceiver } from '@/lib/hybridcast/receiver'
import {
  followThePicture,
  isBroadcastVideo,
} from '@/components/data-broadcast/hybridcast-picture'
import { addressPointer } from '@/lib/hybridcast/rewrite'
import { pointAddressesWrittenLater } from '@/components/data-broadcast/hybridcast-addresses'
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

/** Where the type of a broadcast's picture object is kept instead of `type`: an object with that type tries to load a plugin the frame's policy refuses, so the relay writes it here in the markup, and the receiver does so for one a script makes. */
export const QUIET_TYPE = 'data-hybridcast-type'

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
  station: () => URL
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

/** Whether an address a link or a form goes to lies outside the boundary, read as the application meant it. Addresses that name no server are not the boundary's to judge. */
function outsideTheBoundary(frame: Frame, written: string | null): boolean {
  let url: URL

  try {
    url = new URL(written ?? '', frame.window.location.href)
  } catch {
    return false
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false
  }

  return !frame.inside(intendedTarget(url, frame.relay, frame.station()).href)
}

/** Keeps the broadcast's picture object from trying to load a plugin, while the application sees it as written. Its type is kept in `QUIET_TYPE`, where the relay put it in the markup, and where the receiver puts one a script sets; `type` and `getAttribute('type')` read it back. The picture is drawn by the player under the frame, so the object draws nothing. */
function quietTheBroadcastVideo(window: ReceiverWindow): void {
  const proto = window.HTMLObjectElement.prototype
  const type = descriptorOf(proto, 'type')
  const element = window.Element.prototype
  const getAttribute = element.getAttribute
  const setAttribute = element.setAttribute
  const quiet = (object: Element, value: unknown) => {
    setAttribute.call(object, QUIET_TYPE, String(value))
    object.removeAttribute('type')
  }

  if (type?.get && type.set) {
    const read = type.get
    const write = type.set

    Object.defineProperty(proto, 'type', {
      ...type,
      get(this: HTMLObjectElement) {
        return getAttribute.call(this, QUIET_TYPE) ?? read.call(this)
      },
      set(this: HTMLObjectElement, value: unknown) {
        if (isBroadcastVideo(value)) {
          quiet(this, value)
        } else {
          write.call(this, value)
        }
      },
    })
  }

  element.getAttribute = function (this: Element, name: string) {
    const kept =
      this.localName === 'object' && name.toLowerCase() === 'type'
        ? getAttribute.call(this, QUIET_TYPE)
        : null

    return kept ?? getAttribute.call(this, name)
  }
  element.setAttribute = function (this: Element, name: string, value: string) {
    if (
      this.localName === 'object' &&
      name.toLowerCase() === 'type' &&
      isBroadcastVideo(value)
    ) {
      quiet(this, value)

      return
    }

    setAttribute.call(this, name, value)
  }
}

/** Keeps links and forms to the boundary: one that goes outside it is not followed, and the application stays where it is (IPTVFJ STD-0010 7.6.1). Inside it they go through the relay, as their addresses were pointed there. A document that leaves by its script, which cannot be held back from inside, is closed by the player. */
function keepToTheBoundary(frame: Frame): void {
  const stay = (event: Event, written: string | null) => {
    if (outsideTheBoundary(frame, written)) {
      event.preventDefault()
      frame.window.console.warn(
        'Hybridcast: the application stays where it is; that address is outside its boundary',
      )
    }
  }

  frame.window.document.addEventListener(
    'click',
    (event) => {
      const link =
        event.target instanceof frame.window.Element
          ? event.target.closest('a[href], area[href]')
          : null

      if (link) {
        stay(event, link.getAttribute('href'))
      }
    },
    true,
  )
  frame.window.document.addEventListener(
    'submit',
    (event) => {
      const form = event.target

      if (form instanceof frame.window.HTMLFormElement) {
        stay(event, form.getAttribute('action'))
      }
    },
    true,
  )
}

function relayNetwork(frame: Frame): void {
  const { window, relay, station, inside } = frame
  const route: Route = (written) =>
    routeRequest(written, relay, station(), inside)
  const beacon = window.navigator.sendBeacon?.bind(window.navigator)

  window.fetch = relayedFetch(window.fetch.bind(window), route)
  window.XMLHttpRequest = relayedXhr(window.XMLHttpRequest, route)
  window.WebSocket = relayedWebSocket(window.WebSocket, (written) =>
    routeSocket(written, relay, station(), inside),
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

/** The station URL's location, as the application's scripts reach it once the relay has rewritten their `location` to `__hcLocation`: it reads as the broadcaster's server, and going anywhere goes through the relay inside the boundary, and back to the documents outside it. Assigning it goes where the address says, as a location does. */
function giveTheStationLocation(frame: Frame, leave: (to: URL) => void): void {
  const { window, relay } = frame
  const nav: StationNavigation = {
    relay,
    station: frame.station,
    inside: frame.inside,
    go: (target, how) =>
      window.location[how](
        `${relay.origin}${relayedAddress(relay.app, target)}`,
      ),
    hash: (hash) => {
      window.location.hash = hash
    },
    reload: () => window.location.reload(),
    leave,
  }
  const location = stationLocation(nav)

  Object.defineProperty(window, STATION_LOCATION, {
    configurable: false,
    enumerable: false,
    get: () => location,
    set: (address: unknown) => navigateTo(nav, String(address), 'assign'),
  })
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
  const entered = new URL(documentAt)
  const frame: Frame = {
    window,
    relay,
    station: () =>
      intendedTarget(new URL(window.location.href), relay, entered),
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
  giveTheStationLocation(frame, (to) =>
    port.postMessage({ kind: 'leave', to: to.href }),
  )
  giveTheNavigator(window, receiver)
  relayNetwork(frame)
  pointAddressesWrittenLater(
    window,
    addressPointer(relay, frame.station, () => window.location.href),
    (sound) => port.postMessage({ kind: 'romsound', sound }),
  )
  quietTheBroadcastVideo(window)
  keepToTheBoundary(frame)
  followThePicture(window, receiver)

  const sayLoaded = () => port.postMessage({ kind: 'loaded' })

  port.onmessage = (event) => {
    const message = receiverMessageOf(event.data)

    if (message?.kind === 'checkLoaded') {
      if (window.document.readyState === 'complete') {
        sayLoaded()
      } else {
        window.addEventListener('load', sayLoaded, { once: true })
      }

      return
    }

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
