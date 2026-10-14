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

const STYLE_IMPORT = /(@import\s*)(["'])([^"']*)\2/gi

/** A style with the address of each `url()`, and of each `@import` written as a string, pointed at the relay. */
export function pointedStyle(style: string, point: Point): string {
  return style
    .replace(STYLE_URL, (whole, _quote: string, address: string) => {
      const relayed = point(address)

      return relayed ? `url("${relayed}")` : whole
    })
    .replace(
      STYLE_IMPORT,
      (whole, lead: string, _quote: string, address: string) => {
        const relayed = point(address)

        return relayed ? `${lead}"${relayed}"` : whole
      },
    )
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
  'xlink:href',
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

const LETTER = /[A-Za-z]/

const SPACE = /[\t\n\f\r ]/

const TAG_NAME_ENDS = /[\t\n\f\r />]/

const ATTRIBUTE_NAME_ENDS = /[\t\n\f\r />=]/

const UNQUOTED_VALUE_ENDS = /[\t\n\f\r >]/

/** The elements whose text the browser reads as text up to their end tag, never as markup, in a document that runs scripts. */
const RAW_TEXT = new Set([
  'style',
  'script',
  'textarea',
  'title',
  'xmp',
  'iframe',
  'noembed',
  'noframes',
  'noscript',
  'plaintext',
])

const NAMED: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
}

const REFERENCE = /&(?:#(\d+);?|#[xX]([\da-fA-F]+);?|(amp|quot|apos|lt|gt);)/g

function character(code: number): string {
  return code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff)
    ? String.fromCodePoint(code)
    : '\uFFFD'
}

function decoded(value: string): string {
  return value.replace(
    REFERENCE,
    (_whole, decimal?: string, hex?: string, named?: string) => {
      if (named) {
        return NAMED[named]
      }

      return character(decimal ? Number(decimal) : parseInt(hex ?? '', 16))
    },
  )
}

function encoded(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/** The receiver script as the relay puts it into a page it hands over. */
const RECEIVER_SCRIPT =
  /<script\b(?:[^>"']|"[^"]*"|'[^']*')*\bdata-hybridcast-relay\b(?:[^>"']|"[^"]*"|'[^']*')*>\s*<\/script\s*>/gi

/** An attribute of a tag as the browser reads it: its name, and its value with where it is written, quotes and all, or no value. */
interface Attribute {
  name: string
  value: { text: string; from: number; to: number } | null
}

/** A tag as the browser reads it: its name, its attributes, and where it ends. */
interface Tag {
  name: string
  attributes: Attribute[]
  end: number
}

function until(source: string, from: number, ends: RegExp): number {
  let at = from

  while (at < source.length && !ends.test(source[at])) {
    at += 1
  }

  return at
}

function past(source: string, from: number, over: RegExp): number {
  let at = from

  while (at < source.length && over.test(source[at])) {
    at += 1
  }

  return at
}

function endAfter(source: string, end: string, from: number): number {
  const found = source.indexOf(end, from)

  return found < 0 ? source.length : found + end.length
}

/** The tag whose name begins at `from`, read as the browser's tokenizer reads it: an attribute begins after a space, after a slash or right after a quoted value, quotes open a value only where one begins, and only `>` outside a quoted value ends the tag. Null when the markup ends inside it, and the browser drops it. */
function tagAt(source: string, from: number): Tag | null {
  const nameEnd = until(source, from, TAG_NAME_ENDS)
  const attributes: Attribute[] = []
  let at = nameEnd

  while (at < source.length) {
    const char = source[at]

    if (char === '>') {
      return {
        name: source.slice(from, nameEnd).toLowerCase(),
        attributes,
        end: at + 1,
      }
    }

    if (SPACE.test(char) || char === '/') {
      at += 1
      continue
    }

    const nameTo = until(source, at + 1, ATTRIBUTE_NAME_ENDS)
    const name = source.slice(at, nameTo)
    const equals = past(source, nameTo, SPACE)

    if (source[equals] !== '=') {
      attributes.push({ name, value: null })
      at = equals
      continue
    }

    const valueFrom = past(source, equals + 1, SPACE)
    const quote = source[valueFrom]

    if (quote === '"' || quote === "'") {
      const close = source.indexOf(quote, valueFrom + 1)

      if (close < 0) {
        return null
      }

      attributes.push({
        name,
        value: {
          text: source.slice(valueFrom + 1, close),
          from: valueFrom,
          to: close + 1,
        },
      })
      at = close + 1
      continue
    }

    const valueTo = until(source, valueFrom, UNQUOTED_VALUE_ENDS)

    attributes.push({
      name,
      value: {
        text: source.slice(valueFrom, valueTo),
        from: valueFrom,
        to: valueTo,
      },
    })
    at = valueTo
  }

  return null
}

/** Where what begins with the `<` at `open` ends when it is no start tag: a comment, a CDATA section, an end tag, a declaration or a bogus comment, or the `<` alone as text. */
function notStartTagEnd(source: string, open: number): number {
  const next = source[open + 1] ?? ''

  if (source.startsWith('<!--', open)) {
    const body = open + 4

    if (source.startsWith('>', body) || source.startsWith('->', body)) {
      return source.indexOf('>', body) + 1
    }

    return Math.min(
      endAfter(source, '-->', body),
      endAfter(source, '--!>', body),
    )
  }

  if (source.startsWith('<![CDATA[', open)) {
    return endAfter(source, ']]>', open + 9)
  }

  if (next === '/' && LETTER.test(source[open + 2] ?? '')) {
    return tagAt(source, open + 2)?.end ?? source.length
  }

  if (next === '/' || next === '!' || next === '?') {
    return endAfter(source, '>', open + 2)
  }

  return open + 1
}

/** Where the text of a raw text element that begins at `from` ends: at its end tag, or at the end of the markup. */
function rawTextEnd(source: string, from: number, name: string): number {
  if (name === 'plaintext') {
    return source.length
  }

  const closing = new RegExp(`</${name}[\\t\\n\\f\\r />]`, 'gi')

  closing.lastIndex = from

  return closing.exec(source)?.index ?? source.length
}

/** A start tag with the values of its attributes that name an address pointed at the relay, and the rest of it as it was written. */
function pointedTag(
  source: string,
  open: number,
  tag: Tag,
  point: Point,
): string {
  let written = ''
  let at = open

  tag.attributes.forEach(({ name, value }) => {
    const pointed = value
      ? pointedAttribute(name, decoded(value.text), point)
      : null

    if (value && pointed !== null) {
      written += `${source.slice(at, value.from)}"${encoded(pointed)}"`
      at = value.to
    }
  })

  return written + source.slice(at, tag.end)
}

/** Markup written at run time, as `innerHTML` and the like take it, with the addresses and styles of its elements pointed at the relay, read as the browser reads it. The text between the tags is left alone, and so is what the browser never reads as markup: comments and the text of elements such as `script`, `textarea` and `title`. The text of a `style` element is a style and is pointed. Markup written into an element whose text is never markup, named by `within`, is that text: the style of a `style` element, and anything else left as it is. The receiver script is taken out: the relay puts it into every page it hands over, a fragment the application fetches to build its own markup from included, and it belongs only at the head of the document. */
export function pointedMarkup(
  markup: string,
  point: Point,
  within = '',
): string {
  if (within === 'style') {
    return pointedStyle(markup, point)
  }

  if (RAW_TEXT.has(within)) {
    return markup
  }

  const source = markup.replace(RECEIVER_SCRIPT, '')
  let written = ''
  let at = 0

  while (at < source.length) {
    const open = source.indexOf('<', at)

    if (open < 0) {
      return written + source.slice(at)
    }

    written += source.slice(at, open)

    const startsTag = LETTER.test(source[open + 1] ?? '')
    const tag = startsTag ? tagAt(source, open + 1) : null

    if (!tag) {
      at = startsTag ? source.length : notStartTagEnd(source, open)
      written += source.slice(open, at)
      continue
    }

    written += pointedTag(source, open, tag, point)
    at = tag.end

    if (RAW_TEXT.has(tag.name)) {
      const end = rawTextEnd(source, at, tag.name)
      const text = source.slice(at, end)

      written += tag.name === 'style' ? pointedStyle(text, point) : text
      at = end
    }
  }

  return written
}
