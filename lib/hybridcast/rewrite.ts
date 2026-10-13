import {
  relayedAddress,
  relayedTarget,
  writtenTarget,
  type AppRelay,
} from '@/lib/hybridcast/relay'

/** The relay address for an address an application writes at run time, or null to leave it as it is. */
export type Point = (written: string) => string | null

const WEB = new Set(['http:', 'https:'])

/** Points addresses an application writes at run time at the relay, as Carina points the ones in the markup it hands over: resolved against the station URL the frame stands for, and left as they are when the relay already has them, when they name no server, or when they are only a fragment. */
export function addressPointer(
  relay: AppRelay,
  station: () => URL,
  frameAt: () => string,
): Point {
  return (written) => {
    const value = written.trim()

    if (value.length === 0 || value.startsWith('#')) {
      return null
    }

    let here: URL

    try {
      here = new URL(value, frameAt())
    } catch {
      return null
    }

    if (relayedTarget(here, relay)) {
      return null
    }

    const target = writtenTarget(value, relay, station())

    return target && WEB.has(target.protocol)
      ? relayedAddress(relay.app, target)
      : null
  }
}

const STYLE_URL = /url\(\s*(["']?)([^"')]*)\1\s*\)/gi

/** A style with the address of each `url()` pointed at the relay. */
export function pointedStyle(style: string, point: Point): string {
  return style.replace(STYLE_URL, (whole, _quote: string, address: string) => {
    const relayed = point(address)

    return relayed ? `url("${relayed}")` : whole
  })
}

/** A `srcset` with the address of each candidate pointed at the relay, and its descriptor kept. */
export function pointedSrcset(srcset: string, point: Point): string {
  return srcset
    .split(',')
    .map((candidate) => {
      const found = /^(\s*)(\S+)(.*)$/.exec(candidate)

      if (!found) {
        return candidate
      }

      const relayed = point(found[2])

      return relayed ? `${found[1]}${relayed}${found[3]}` : candidate
    })
    .join(',')
}

/** The attributes of an element that name an address the browser loads or goes to. */
export const ADDRESS_ATTRIBUTES = new Set([
  'src',
  'href',
  'action',
  'formaction',
  'poster',
  'data',
  'background',
])

/** A value written as an attribute's, pointed at the relay as its name says: an address, a `srcset`, or a style. Null to leave it as it is. */
export function pointedAttribute(
  name: string,
  value: string,
  point: Point,
): string | null {
  const lowered = name.toLowerCase()

  if (ADDRESS_ATTRIBUTES.has(lowered)) {
    return point(value)
  }

  if (lowered === 'srcset') {
    const pointed = pointedSrcset(value, point)

    return pointed === value ? null : pointed
  }

  if (lowered === 'style') {
    const pointed = pointedStyle(value, point)

    return pointed === value ? null : pointed
  }

  return null
}

const TAG = /<([A-Za-z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g

const ATTRIBUTE = /(\s)([^\s"'>/=]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'=<>`]+)/g

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
}

function decoded(value: string): string {
  return value.replace(
    /&(?:amp|quot|#39|lt|gt);/g,
    (entity) => ENTITIES[entity],
  )
}

function encoded(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/** The receiver script as the relay puts it into a page it hands over. */
const RECEIVER_SCRIPT =
  /<script\b(?:[^>"']|"[^"]*"|'[^']*')*\bdata-hybridcast-relay\b(?:[^>"']|"[^"]*"|'[^']*')*>\s*<\/script\s*>/gi

/** Markup written at run time, as `innerHTML` and the like take it, with the addresses and styles of its elements pointed at the relay. The text between the tags is left alone. The receiver script is taken out: the relay puts it into every page it hands over, a fragment the application fetches to build its own markup from included, and it belongs only at the head of the document. */
export function pointedMarkup(markup: string, point: Point): string {
  return markup
    .replace(RECEIVER_SCRIPT, '')
    .replace(TAG, (tag, name: string, attributes: string) => {
      const rewritten = attributes.replace(
        ATTRIBUTE,
        (
          whole,
          lead: string,
          attribute: string,
          equals: string,
          written: string,
        ) => {
          const quoted = written.startsWith('"') || written.startsWith("'")
          const value = decoded(quoted ? written.slice(1, -1) : written)
          const pointed = pointedAttribute(attribute, value, point)

          return pointed === null
            ? whole
            : `${lead}${attribute}${equals}"${encoded(pointed)}"`
        },
      )

      return `<${name}${rewritten}>`
    })
}
