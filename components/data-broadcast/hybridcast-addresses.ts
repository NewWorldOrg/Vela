import {
  ADDRESS_ATTRIBUTES,
  pointedAttribute,
  pointedMarkup,
  pointedStyle,
  type Point,
} from '@/lib/hybridcast/rewrite'

type AddressWindow = Window & typeof globalThis

/** Where the number of a receiver's built-in sound is kept on the element that was given one, as `romsound://` is no address the frame may load. */
export const ROM_SOUND = 'data-hybridcast-romsound'

const ROM_SOUND_ADDRESS = /^romsound:\/\/(\d{1,3})\s*$/i

const MEDIA = new Set(['audio', 'video', 'source'])

/** The properties that set an attribute naming an address, by the interface they are on. */
const ADDRESS_PROPERTIES: [string, string][] = [
  ['HTMLImageElement', 'src'],
  ['HTMLImageElement', 'srcset'],
  ['HTMLSourceElement', 'src'],
  ['HTMLSourceElement', 'srcset'],
  ['HTMLScriptElement', 'src'],
  ['HTMLLinkElement', 'href'],
  ['HTMLIFrameElement', 'src'],
  ['HTMLMediaElement', 'src'],
  ['HTMLVideoElement', 'poster'],
  ['HTMLObjectElement', 'data'],
  ['HTMLEmbedElement', 'src'],
  ['HTMLTrackElement', 'src'],
  ['HTMLInputElement', 'src'],
  ['HTMLAnchorElement', 'href'],
  ['HTMLAreaElement', 'href'],
  ['HTMLFormElement', 'action'],
]

const WATCHED = [...ADDRESS_ATTRIBUTES, 'srcset', 'style']

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

/** One sample of silence as a WAV file, which a media element plays in place of a built-in sound. */
function silence(): Uint8Array {
  const bytes = new Uint8Array(45)
  const view = new DataView(bytes.buffer)
  const text = (at: number, value: string) =>
    [...value].forEach((char, index) =>
      view.setUint8(at + index, char.charCodeAt(0)),
    )

  text(0, 'RIFF')
  view.setUint32(4, 37, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 8000, true)
  view.setUint32(28, 8000, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  text(36, 'data')
  view.setUint32(40, 1, true)
  view.setUint8(44, 0x80)

  return bytes
}

/** What an attribute of an element is actually given for what the application wrote: an address pointed at the relay, a built-in sound swapped for silence and its number kept aside, or what was written. */
function writtenFor(
  window: AddressWindow,
  quiet: () => string,
  point: Point,
): (element: Element, name: string, value: string) => string {
  return (element, name, value) => {
    const sound = ROM_SOUND_ADDRESS.exec(value)

    if (sound && name.toLowerCase() === 'src' && MEDIA.has(element.localName)) {
      element.setAttribute(ROM_SOUND, sound[1])

      if (element.localName === 'source') {
        element.setAttribute('type', 'audio/wav')
      }

      return quiet()
    }

    return pointedAttribute(name, value, point) ?? value
  }
}

/** The number of the built-in sound a media element was given, on itself or on a source of it, or null. */
function romSoundOf(element: Element): number | null {
  const kept =
    element.getAttribute(ROM_SOUND) ??
    element.querySelector(`source[${ROM_SOUND}]`)?.getAttribute(ROM_SOUND)

  return kept === null || kept === undefined ? null : Number(kept)
}

/** Gives each element's `style` as the browser does, but with the `url()` of whatever is set on it by name pointed at the relay: the browser keeps those properties on each declaration rather than on its prototype, so they are reached through a stand-in for the declaration, one per element. */
function watchStyles(window: AddressWindow, point: Point): void {
  const prototype = window.HTMLElement.prototype
  const described = descriptorOf(prototype, 'style')
  const standIns = new WeakMap<CSSStyleDeclaration, CSSStyleDeclaration>()

  if (!described?.get) {
    return
  }

  const read = described.get

  Object.defineProperty(prototype, 'style', {
    ...described,
    get(this: HTMLElement) {
      const declaration = read.call(this) as CSSStyleDeclaration
      const held = standIns.get(declaration)

      if (held) {
        return held
      }

      const standIn = new Proxy(declaration, {
        get: (target, property) => {
          const value = Reflect.get(target, property, target) as unknown

          return typeof value === 'function' ? value.bind(target) : value
        },
        set: (target, property, value: unknown) =>
          Reflect.set(
            target,
            property,
            typeof value === 'string' && /url\(/i.test(value)
              ? pointedStyle(value, point)
              : value,
            target,
          ),
      })

      standIns.set(declaration, standIn)

      return standIn
    },
  })
}

/** Carina points every address of the markup it relays at the relay; what a script writes later is pointed here, resolved against the station URL: the address properties of the elements, `setAttribute`, the `url()` of styles set by name, with `setProperty` or as `cssText`, and markup written with `innerHTML`, `outerHTML` or `insertAdjacentHTML`, as each is written, before the browser loads it. Anything that lands in the document another way is pointed as it lands, which loads it again from the relay. A receiver's built-in sound (`romsound://`) is no address the frame may load: its element is given silence instead, and `play` tells the player which sound it was and plays nothing in the frame. */
export function pointAddressesWrittenLater(
  window: AddressWindow,
  point: Point,
  playRomSound: (sound: number) => void,
): void {
  let silent: string | null = null
  const quiet = () => {
    silent ??= window.URL.createObjectURL(
      new window.Blob([silence() as BlobPart], { type: 'audio/wav' }),
    )

    return silent
  }
  const written = writtenFor(window, quiet, point)
  const element = window.Element.prototype
  const setAttribute = element.setAttribute
  const interfaces = window as unknown as Record<
    string,
    { prototype: object } | undefined
  >

  ADDRESS_PROPERTIES.forEach(([name, property]) => {
    const prototype = interfaces[name]?.prototype
    const described = prototype ? descriptorOf(prototype, property) : undefined

    if (prototype && described?.set) {
      const set = described.set

      Object.defineProperty(prototype, property, {
        ...described,
        set(this: Element, value: unknown) {
          set.call(this, written(this, property, String(value)))
        },
      })
    }
  })

  element.setAttribute = function (this: Element, name: string, value: string) {
    setAttribute.call(this, name, written(this, name, String(value)))
  }

  const style = window.CSSStyleDeclaration.prototype
  const setProperty = style.setProperty

  style.setProperty = function (
    this: CSSStyleDeclaration,
    name: string,
    value: string | null,
    priority?: string,
  ) {
    setProperty.call(
      this,
      name,
      value === null ? null : pointedStyle(String(value), point),
      priority,
    )
  }
  const cssText = descriptorOf(style, 'cssText')

  if (cssText?.set) {
    const set = cssText.set

    Object.defineProperty(style, 'cssText', {
      ...cssText,
      set(this: CSSStyleDeclaration, value: unknown) {
        set.call(this, pointedStyle(String(value), point))
      },
    })
  }

  watchStyles(window, point)
  ;['innerHTML', 'outerHTML'].forEach((property) => {
    const described = descriptorOf(element, property)

    if (described?.set) {
      const set = described.set

      Object.defineProperty(element, property, {
        ...described,
        set(this: Element, value: unknown) {
          set.call(this, pointedMarkup(String(value), point))
        },
      })
    }
  })

  const insertAdjacentHTML = element.insertAdjacentHTML

  element.insertAdjacentHTML = function (
    this: Element,
    position: InsertPosition,
    markup: string,
  ) {
    insertAdjacentHTML.call(
      this,
      position,
      pointedMarkup(String(markup), point),
    )
  }

  const play = window.HTMLMediaElement.prototype.play

  window.HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    const sound = romSoundOf(this)

    if (sound !== null) {
      playRomSound(sound)

      return Promise.resolve()
    }

    return play.call(this)
  }

  const pointElement = (target: Element) => {
    WATCHED.forEach((name) => {
      const value = target.getAttribute(name)
      const rewritten = value === null ? value : written(target, name, value)

      if (rewritten !== null && rewritten !== value) {
        setAttribute.call(target, name, rewritten)
      }
    })
  }

  new window.MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === 'attributes') {
        pointElement(record.target as Element)

        return
      }

      record.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          pointElement(node as Element)
          ;(node as Element).querySelectorAll('*').forEach(pointElement)
        }
      })
    })
  }).observe(window.document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: WATCHED,
  })
}
