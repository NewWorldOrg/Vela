import type { Rect, Size } from '@/lib/caption-placement'
import { paletteOf, readClut, type Palette } from '@/lib/bml/palette'
import { pathOf, resolveReference, type BmlAddress } from '@/lib/bml/paths'
import type { BmlResource } from '@/lib/bml/resources'
import {
  BML_PROPERTIES,
  DEFAULT_USED_KEYS,
  RESOLUTIONS,
  cssOf,
  cssSheetOf,
  declarationsOf,
  featuresOf,
  matches,
  pixelsOf,
  specificityOf,
  styleSheetOf,
  type Aspect,
  type BmlFeatures,
  type StyleRule,
  type StyleSheet,
  type StyledElement,
  type UsedKeyGroup,
} from '@/lib/bml/style'

export interface XmlNodeLike {
  nodeType: number
  nodeValue: string | null
}

export interface XmlElementLike extends XmlNodeLike {
  localName: string | null
  getAttribute(name: string): string | null
  attributes: ArrayLike<{ name: string; value: string }>
  childNodes: ArrayLike<XmlNodeLike>
}

export interface XmlParser {
  parseFromString(
    source: string,
    type: 'application/xml',
  ): {
    documentElement: XmlElementLike | null
    getElementsByTagName(name: string): ArrayLike<unknown>
  }
}

export type HtmlTag = 'div' | 'p' | 'span' | 'br' | 'a' | 'img' | 'input'

export interface NavLinks {
  index?: number
  up?: number
  down?: number
  left?: number
  right?: number
}

export interface PageElement {
  kind: 'element'
  tag: HtmlTag
  bmlTag: string
  attributes: [string, string][]
  style: string
  nav: NavLinks
  children: PageNode[]
}

export interface PageText {
  kind: 'text'
  text: string
}

export type PageNode = PageElement | PageText

export type PageScript = { source: string } | { src: string }

export interface PageEvent {
  id: string | null
  type: string | null
  attributes: [string, string][]
}

export interface BmlPage {
  address: BmlAddress
  body: PageElement
  styleSheet: string
  scripts: PageScript[]
  events: PageEvent[]
  resolution: Size
  aspect: Aspect
  palette: Palette
  videoRect: Rect | null
  usedKeys: UsedKeyGroup[]
  warnings: string[]
}

export type BmlReading =
  { read: 'page'; page: BmlPage } | { read: 'malformed'; why: string }

export interface DocumentContext {
  address: BmlAddress
  lookup: (address: BmlAddress) => BmlResource | undefined
  image: (resource: BmlResource, palette: Palette) => string | null
}

const ELEMENT = 1

const TEXT = 3

const CDATA = 4

const HTML_TAG: Record<string, HtmlTag> = {
  body: 'div',
  div: 'div',
  p: 'p',
  span: 'span',
  br: 'br',
  a: 'a',
  input: 'input',
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/x-arib-png'])

const QUIET_IN_HEAD = new Set(['title', 'meta'])

const GATHERED = new Set(['style', 'link', 'script', 'bevent'])

const GEOMETRY = ['left', 'top', 'width', 'height']

const WATCHED = new Set([...BML_PROPERTIES, ...GEOMETRY])

const KEPT_ATTRIBUTES = new Set(['id', 'class'])

const INPUT_ATTRIBUTES = new Set(['value', 'maxlength'])

/** Reads a document's text as XML: its `bml` root, or null when it is not well formed or not BML. */
export function parseBml(
  source: string,
  parser: XmlParser,
): XmlElementLike | null {
  try {
    const parsed = parser.parseFromString(source, 'application/xml')
    const root = parsed.documentElement

    return root &&
      root.localName === 'bml' &&
      parsed.getElementsByTagName('parsererror').length === 0
      ? root
      : null
  } catch {
    return null
  }
}

function elementsIn(node: XmlElementLike): XmlElementLike[] {
  return Array.from(node.childNodes).filter(
    (child): child is XmlElementLike => child.nodeType === ELEMENT,
  )
}

function textOf(node: XmlElementLike): string {
  return Array.from(node.childNodes)
    .filter((child) => child.nodeType === TEXT || child.nodeType === CDATA)
    .map((child) => child.nodeValue ?? '')
    .join('')
}

function nameOf(node: XmlElementLike): string {
  return (node.localName ?? '').toLowerCase()
}

class Conversion {
  readonly warnings = new Set<string>()

  readonly sheets: string[] = []

  readonly scripts: PageScript[] = []

  readonly events: PageEvent[] = []

  private readonly context: DocumentContext

  private readonly cascaded = new Map<XmlElementLike, Map<string, string>>()

  private readonly styled = new Map<XmlElementLike, StyledElement>()

  private rules: StyleRule[] = []

  private palette: Palette = paletteOf(null)

  private resolution: Size = RESOLUTIONS['960x540']

  videoRect: Rect | null = null

  constructor(context: DocumentContext) {
    this.context = context
  }

  gather(node: XmlElementLike, inHead: boolean): void {
    for (const child of elementsIn(node)) {
      const name = nameOf(child)

      if (GATHERED.has(name)) {
        this.take(name, child)
      } else if (inHead && !QUIET_IN_HEAD.has(name)) {
        this.warnings.add(`unsupported element: ${name}`)
      } else if (!inHead) {
        this.gather(child, false)
      }
    }
  }

  private take(name: string, node: XmlElementLike): void {
    switch (name) {
      case 'style':
        this.sheets.push(textOf(node))
        return
      case 'link':
        this.link(node)
        return
      case 'script':
        this.script(node)
        return
      default:
        this.bevent(node)
    }
  }

  private link(node: XmlElementLike): void {
    const href = node.getAttribute('href')
    const resource = href ? this.resource(href) : undefined

    if (resource?.kind === 'css') {
      this.sheets.push(new TextDecoder().decode(resource.body))
    } else {
      this.warnings.add('missing style sheet')
    }
  }

  private script(node: XmlElementLike): void {
    const src = node.getAttribute('src')
    const address = src ? resolveReference(src, this.context.address) : null

    this.scripts.push(
      address ? { src: pathOf(address) } : { source: textOf(node) },
    )
  }

  private bevent(node: XmlElementLike): void {
    for (const item of elementsIn(node)) {
      if (nameOf(item) !== 'beitem') {
        this.warnings.add(`unsupported element: ${nameOf(item)}`)
        continue
      }

      this.events.push({
        id: item.getAttribute('id'),
        type: item.getAttribute('type'),
        attributes: Array.from(item.attributes, ({ name, value }) => [
          name,
          value,
        ]),
      })
    }
  }

  resource(reference: string): BmlResource | undefined {
    const address = resolveReference(reference, this.context.address)

    return address ? this.context.lookup(address) : undefined
  }

  cascade(body: XmlElementLike): BmlFeatures {
    const sheets: StyleSheet[] = this.sheets.map(styleSheetOf)

    sheets.forEach((sheet) =>
      sheet.warnings.forEach((w) => this.warnings.add(w)),
    )
    this.rules = sheets.flatMap((sheet) => sheet.rules)
    this.cascadeInto(body, null)

    const features = featuresOf(this.cascaded.get(body) ?? new Map())

    this.resolution = features.resolution ?? this.resolution
    this.palette = this.paletteFor(features.clut)

    return features
  }

  private paletteFor(clut: string | undefined): Palette {
    if (!clut) {
      return paletteOf(null)
    }

    const resource = this.resource(clut)
    const entries = resource ? readClut(resource.body) : null

    if (!entries) {
      this.warnings.add('missing colour table')
    }

    return paletteOf(entries)
  }

  private cascadeInto(node: XmlElementLike, parent: StyledElement | null) {
    const element: StyledElement = {
      tag: nameOf(node),
      id: node.getAttribute('id'),
      classes: (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean),
      parent,
    }
    const picked = this.rules
      .flatMap((rule, order) =>
        rule.selectors
          .filter((selector) => matches(selector, element))
          .map((selector) => ({
            rule,
            order,
            specificity: specificityOf(selector),
          })),
      )
      .sort(
        (a, b) =>
          compareSpecificity(a.specificity, b.specificity) || a.order - b.order,
      )
    const values = new Map<string, string>()
    const inline = declarationsOf(node.getAttribute('style') ?? '')

    for (const { property, value } of [
      ...picked.flatMap(({ rule }) => rule.declarations),
      ...inline,
    ]) {
      if (WATCHED.has(property)) {
        values.set(property, value)
      }
    }

    this.cascaded.set(node, values)
    this.styled.set(node, element)
    elementsIn(node).forEach((child) => this.cascadeInto(child, element))
  }

  styleSheet(): string {
    const converted = cssSheetOf(
      { rules: this.rules, warnings: [] },
      this.palette,
    )

    converted.warnings.forEach((w) => this.warnings.add(w))

    return converted.css
  }

  get paletteInUse(): Palette {
    return this.palette
  }

  convert(
    node: XmlElementLike,
    offset: { left: number; top: number },
  ): PageNode | null {
    const name = nameOf(node)

    if (GATHERED.has(name)) {
      return null
    }

    if (name === 'object') {
      return this.object(node, offset)
    }

    if (name === 'img') {
      return this.image(node, node.getAttribute('src'))
    }

    const tag = HTML_TAG[name]

    if (!tag) {
      this.warnings.add(`unsupported element: ${name}`)
    }

    return this.element(node, tag ?? 'div', offset)
  }

  private element(
    node: XmlElementLike,
    tag: HtmlTag,
    offset: { left: number; top: number },
  ): PageElement {
    const values = this.cascaded.get(node) ?? new Map<string, string>()
    const within =
      nameOf(node) === 'body'
        ? offset
        : {
            left: offset.left + (pixelsOf(values.get('left')) ?? 0),
            top: offset.top + (pixelsOf(values.get('top')) ?? 0),
          }
    const children = Array.from(node.childNodes).flatMap((child) =>
      this.child(child, within),
    )

    return this.shaped(node, tag, children)
  }

  private child(
    child: XmlNodeLike,
    within: { left: number; top: number },
  ): PageNode[] {
    if (child.nodeType === TEXT || child.nodeType === CDATA) {
      return [{ kind: 'text', text: child.nodeValue ?? '' }]
    }

    if (child.nodeType !== ELEMENT) {
      return []
    }

    const converted = this.convert(child as XmlElementLike, within)

    return converted ? [converted] : []
  }

  private shaped(
    node: XmlElementLike,
    tag: HtmlTag,
    children: PageNode[],
    extra: [string, string][] = [],
  ): PageElement {
    const values = this.cascaded.get(node) ?? new Map<string, string>()
    const features = featuresOf(values)
    const inline = cssOf(
      declarationsOf(node.getAttribute('style') ?? ''),
      this.palette,
    )

    inline.warnings.forEach((w) => this.warnings.add(w))

    return {
      kind: 'element',
      tag,
      bmlTag: nameOf(node),
      attributes: [...this.attributesOf(node, tag), ...extra],
      style: inline.css,
      nav: {
        index: features.navIndex,
        up: features.navUp,
        down: features.navDown,
        left: features.navLeft,
        right: features.navRight,
      },
      children,
    }
  }

  private attributesOf(node: XmlElementLike, tag: HtmlTag): [string, string][] {
    return Array.from(node.attributes).flatMap(({ name, value }) => {
      const lowered = name.toLowerCase()

      if (
        KEPT_ATTRIBUTES.has(lowered) ||
        (tag === 'input' && INPUT_ATTRIBUTES.has(lowered))
      ) {
        return [[lowered, value]]
      }

      if (
        lowered === 'style' ||
        lowered === 'src' ||
        lowered === 'data' ||
        !/^[a-z][a-z0-9_-]*$/.test(lowered)
      ) {
        return []
      }

      if (lowered === 'href') {
        const address = resolveReference(value, this.context.address)

        return address ? [['data-bml-href', pathOf(address)]] : []
      }

      return [[`data-bml-${lowered}`, value]]
    })
  }

  private object(
    node: XmlElementLike,
    offset: { left: number; top: number },
  ): PageNode | null {
    const type = (node.getAttribute('type') ?? '').toLowerCase()

    if (type.startsWith('audio/')) {
      return null
    }

    if (IMAGE_TYPES.has(type)) {
      return this.image(node, node.getAttribute('data'))
    }

    if (!type.startsWith('video/')) {
      this.warnings.add(`unsupported object: ${type || 'no type'}`)

      return this.shaped(node, 'div', [])
    }

    this.videoRect = this.videoRect ?? this.rectOf(node, offset)

    return this.shaped(node, 'div', [], [['data-bml-video', '']])
  }

  private rectOf(
    node: XmlElementLike,
    offset: { left: number; top: number },
  ): Rect | null {
    const values = this.cascaded.get(node) ?? new Map<string, string>()
    const width = pixelsOf(values.get('width'))
    const height = pixelsOf(values.get('height'))

    if (width === null || height === null || width <= 0 || height <= 0) {
      this.warnings.add('video object without a size')

      return null
    }

    const left = Math.max(0, offset.left + (pixelsOf(values.get('left')) ?? 0))
    const top = Math.max(0, offset.top + (pixelsOf(values.get('top')) ?? 0))
    const right = Math.min(this.resolution.width, left + width)
    const bottom = Math.min(this.resolution.height, top + height)

    return right > left && bottom > top
      ? { left, top, width: right - left, height: bottom - top }
      : null
  }

  private image(node: XmlElementLike, reference: string | null): PageElement {
    const resource = reference ? this.resource(reference) : undefined
    const drawable = resource?.kind === 'jpeg' || resource?.kind === 'png'
    const url =
      drawable && resource ? this.context.image(resource, this.palette) : null

    if (!url) {
      this.warnings.add(resource ? 'unsupported image' : 'missing image')
    }

    return this.shaped(node, url ? 'img' : 'div', [], url ? [['src', url]] : [])
  }
}

function compareSpecificity(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

/** Converts a BML document into the page the runtime draws: its elements as HTML elements, its style as CSS, and what the runtime needs to know of it. */
export function convertBml(
  root: XmlElementLike,
  context: DocumentContext,
): BmlReading {
  const head = elementsIn(root).find((node) => nameOf(node) === 'head')
  const body = elementsIn(root).find((node) => nameOf(node) === 'body')

  if (!body) {
    return { read: 'malformed', why: 'no body' }
  }

  const conversion = new Conversion(context)

  if (head) {
    conversion.gather(head, true)
  }

  conversion.gather(body, false)

  const features = conversion.cascade(body)
  const styleSheet = conversion.styleSheet()
  const converted = conversion.convert(body, { left: 0, top: 0 }) as PageElement
  const resolution = features.resolution ?? RESOLUTIONS['960x540']

  return {
    read: 'page',
    page: {
      address: context.address,
      body: converted,
      styleSheet,
      scripts: conversion.scripts,
      events: conversion.events,
      resolution,
      aspect: features.aspect ?? '16v9',
      palette: conversion.paletteInUse,
      videoRect: conversion.videoRect,
      usedKeys: features.usedKeys ?? DEFAULT_USED_KEYS,
      warnings: [...conversion.warnings],
    },
  }
}
