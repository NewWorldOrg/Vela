import type { Rect, Size } from '@/lib/caption-placement'
import { colourOf, type Palette } from '@/lib/bml/palette'

export interface Declaration {
  property: string
  value: string
}

export interface SimpleSelector {
  type: string | null
  id: string | null
  classes: string[]
  state: 'focus' | 'active' | null
}

export type Selector = SimpleSelector[]

export interface StyleRule {
  selectors: Selector[]
  declarations: Declaration[]
}

export interface StyleSheet {
  rules: StyleRule[]
  warnings: string[]
}

export type Aspect = '16v9' | '4v3'

export type UsedKeyGroup = 'basic' | 'data-button' | 'numeric-tuning'

export const GRID: Size = { width: 960, height: 540 }

export const RESOLUTIONS = new Map<string, Size>([
  ['960x540', { width: 960, height: 540 }],
  ['720x480', { width: 720, height: 480 }],
])

/** The longest value of one declaration the converter reads; a longer one is ignored. */
export const MOST_VALUE_LENGTH = 256

export const DEFAULT_USED_KEYS: UsedKeyGroup[] = ['basic', 'data-button']

export const FONT_FAMILIES = ['Data Broadcast', 'Broadcast Marks'] as const

const FONT_STACK = `${FONT_FAMILIES.map((family) => `"${family}"`).join(', ')}, sans-serif`

export const BML_PROPERTIES = new Set([
  'nav-index',
  'nav-up',
  'nav-down',
  'nav-left',
  'nav-right',
  'used-key-list',
  'resolution',
  'display-aspect-ratio',
  'grayscale-color-index',
  'clut',
])

function topLevelParts(text: string, separator: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0

  for (let at = 0; at < text.length; at += 1) {
    const letter = text[at]

    if (quote) {
      quote = letter === quote ? null : quote
    } else if (letter === '"' || letter === "'") {
      quote = letter
    } else if (letter === '(') {
      depth += 1
    } else if (letter === ')') {
      depth = Math.max(0, depth - 1)
    } else if (letter === separator && depth === 0) {
      parts.push(text.slice(start, at))
      start = at + 1
    }
  }

  parts.push(text.slice(start))

  return parts
}

/** The declarations of a style attribute or a rule's block, lower-cased by name, with `!important` dropped. */
export function declarationsOf(text: string): Declaration[] {
  return topLevelParts(text, ';').flatMap((part) => {
    const colon = part.indexOf(':')

    if (colon < 0) {
      return []
    }

    const property = part.slice(0, colon).trim().toLowerCase()
    const raw = part.slice(colon + 1)

    if (raw.length > MOST_VALUE_LENGTH) {
      return []
    }

    const value = raw.replace(/!\s*important\s*$/i, '').trim()

    return /^-?[a-z][a-z0-9-]*$/.test(property) && value.length > 0
      ? [{ property, value }]
      : []
  })
}

const COMPOUND =
  /^(\*|[a-z][a-z0-9_-]*)?((?:#[a-z0-9_-]+|\.[a-z0-9_-]+|:[a-z-]+)*)$/i

const PART = /([#.:])([a-z0-9_-]+)/gi

function compoundOf(text: string): SimpleSelector | null {
  const parsed = COMPOUND.exec(text)

  if (!parsed || text.length === 0) {
    return null
  }

  const compound: SimpleSelector = {
    type: parsed[1] && parsed[1] !== '*' ? parsed[1].toLowerCase() : null,
    id: null,
    classes: [],
    state: null,
  }

  for (const [, mark, name] of parsed[2].matchAll(PART)) {
    if (mark === '#') {
      compound.id = name
    } else if (mark === '.') {
      compound.classes.push(name)
    } else if (name === 'focus' || name === 'active') {
      compound.state = name
    } else {
      return null
    }
  }

  return compound
}

/** A selector of compound simple selectors joined by descendant combinators, or null for anything else. */
export function selectorOf(text: string): Selector | null {
  const compounds = text.trim().split(/\s+/).map(compoundOf)

  return compounds.length > 0 && compounds.every((each) => each !== null)
    ? (compounds as Selector)
    : null
}

function stripComments(text: string): string {
  const kept: string[] = []
  let at = 0

  while (at < text.length) {
    const open = text.indexOf('/*', at)

    if (open < 0) {
      kept.push(text.slice(at))
      break
    }

    const close = text.indexOf('*/', open + 2)

    kept.push(text.slice(at, open), ' ')
    at = close < 0 ? text.length : close + 2
  }

  return kept.join('').replace(/\x3C!--|--\x3E/g, ' ')
}

function blockEnd(text: string, open: number): number {
  let depth = 0

  for (let at = open; at < text.length; at += 1) {
    if (text[at] === '{') {
      depth += 1
    } else if (text[at] === '}') {
      depth -= 1

      if (depth === 0) {
        return at
      }
    }
  }

  return text.length
}

/** The rules of a style sheet. A rule, selector or at-rule it does not take is left out with a warning. */
export function styleSheetOf(source: string): StyleSheet {
  const text = stripComments(source)
  const rules: StyleRule[] = []
  const warnings: string[] = []
  let at = 0

  while (at < text.length) {
    const open = text.indexOf('{', at)

    if (open < 0) {
      break
    }

    const head = text.slice(at, open).trim()
    const statement = head.indexOf(';')

    if (head.startsWith('@') && statement >= 0) {
      warnings.push(`unsupported at-rule: ${head.split(/\s/)[0]}`)
      at += text.slice(at, open).indexOf(';') + 1
      continue
    }

    const close = blockEnd(text, open)

    if (head.startsWith('@')) {
      warnings.push(`unsupported at-rule: ${head.split(/\s/)[0]}`)
    } else {
      rules.push(...ruleOf(head, text.slice(open + 1, close), warnings))
    }

    at = close + 1
  }

  return { rules, warnings }
}

function ruleOf(head: string, block: string, warnings: string[]): StyleRule[] {
  const selectors = head.split(',').flatMap((text) => {
    const selector = selectorOf(text)

    if (!selector) {
      warnings.push('unsupported selector')
    }

    return selector ? [selector] : []
  })

  return selectors.length > 0
    ? [{ selectors, declarations: declarationsOf(block) }]
    : []
}

/** How specific a selector is, compared position by position. */
export function specificityOf(selector: Selector): [number, number, number] {
  return selector.reduce<[number, number, number]>(
    ([ids, classes, types], compound) => [
      ids + (compound.id ? 1 : 0),
      classes + compound.classes.length + (compound.state ? 1 : 0),
      types + (compound.type ? 1 : 0),
    ],
    [0, 0, 0],
  )
}

export interface StyledElement {
  tag: string
  id: string | null
  classes: string[]
  parent: StyledElement | null
}

function matchesCompound(
  compound: SimpleSelector,
  element: StyledElement,
): boolean {
  return (
    compound.state === null &&
    (compound.type === null || compound.type === element.tag) &&
    (compound.id === null || compound.id === element.id) &&
    compound.classes.every((name) => element.classes.includes(name))
  )
}

/** Whether a selector picks an element in its plain state (a `:focus` or `:active` selector never does). */
export function matches(selector: Selector, element: StyledElement): boolean {
  const subject = selector[selector.length - 1]

  if (!matchesCompound(subject, element)) {
    return false
  }

  let ancestor = element.parent

  for (let at = selector.length - 2; at >= 0; at -= 1) {
    while (ancestor && !matchesCompound(selector[at], ancestor)) {
      ancestor = ancestor.parent
    }

    if (!ancestor) {
      return false
    }

    ancestor = ancestor.parent
  }

  return true
}

function cssIdent(name: string): string {
  return Array.from(name, (letter, at) => {
    const plain =
      /[a-z_\u0080-\uffff-]/i.test(letter) || (at > 0 && /\d/.test(letter))

    return plain ? letter : `\\${letter.codePointAt(0)?.toString(16)} `
  }).join('')
}

/** The selector in the converted page: a BML element is named by its `data-bml-tag`, and the focus and active states by the attributes the runtime sets. */
export function cssSelectorOf(selector: Selector): string {
  return selector
    .map((compound) => {
      const parts = [
        compound.type ? `[data-bml-tag="${compound.type}"]` : '',
        compound.id ? `#${cssIdent(compound.id)}` : '',
        ...compound.classes.map((name) => `.${cssIdent(name)}`),
        compound.state ? `[data-bml-${compound.state}]` : '',
      ].join('')

      return parts.length > 0 ? parts : '[data-bml-tag]'
    })
    .join(' ')
}

const LENGTH = /^(-?\d+(?:\.\d+)?)(px)?$/i

function length(value: string, keywords: string[] = []): string | null {
  const lowered = value.toLowerCase()

  if (keywords.includes(lowered) || lowered === 'inherit') {
    return lowered
  }

  const parsed = LENGTH.exec(value)

  return parsed ? `${Number(parsed[1])}px` : null
}

function lengths(value: string): string | null {
  const parts = value
    .trim()
    .split(/\s+/)
    .map((part) => length(part))

  return parts.length <= 4 && parts.every((part) => part !== null)
    ? parts.join(' ')
    : null
}

function keyword(value: string, allowed: string[]): string | null {
  const lowered = value.toLowerCase()

  return allowed.includes(lowered) || lowered === 'inherit' ? lowered : null
}

type Mapper = (value: string, palette: Palette) => string[] | null

function as(property: string, read: (value: string) => string | null): Mapper {
  return (value) => {
    const css = read(value)

    return css === null ? null : [`${property}: ${css}`]
  }
}

function colour(...properties: string[]): Mapper {
  return (value, palette) => {
    const index = Number(value)
    const css = /^\d+$/.test(value.trim()) ? colourOf(palette, index) : null

    return css === null
      ? null
      : properties.map((property) => `${property}: ${css}`)
  }
}

const BORDER_STYLES = [
  'none',
  'hidden',
  'solid',
  'dotted',
  'dashed',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
]

function insideOf(value: string, opening: string): string | null {
  const lowered = value.trim().toLowerCase()

  return lowered.startsWith(opening) && lowered.endsWith(')')
    ? value.trim().slice(opening.length, -1)
    : null
}

function clipOf(value: string): string | null {
  const lowered = value.trim().toLowerCase()

  if (lowered === 'auto' || lowered === 'inherit') {
    return lowered
  }

  const inside = insideOf(value, 'rect(')
  const edges = inside
    ?.split(',')
    .flatMap((part) => part.trim().split(/\s+/))
    .filter((part) => part.length > 0)
    .map((part) => length(part, ['auto']))

  return edges && edges.length === 4 && edges.every((edge) => edge !== null)
    ? `rect(${edges.join(', ')})`
    : null
}

const SIDES = ['top', 'right', 'bottom', 'left'] as const

function eachSide(
  shape: (side: (typeof SIDES)[number]) => [string, Mapper],
): [string, Mapper][] {
  return SIDES.map(shape)
}

const MAPPER_LIST: [string, Mapper][] = [
  ['left', as('left', (value) => length(value, ['auto']))],
  ['top', as('top', (value) => length(value, ['auto']))],
  ['width', as('width', (value) => length(value, ['auto']))],
  ['height', as('height', (value) => length(value, ['auto']))],
  [
    'position',
    as('position', (value) => keyword(value, ['absolute', 'static'])),
  ],
  [
    'visibility',
    as('visibility', (value) => keyword(value, ['visible', 'hidden'])),
  ],
  [
    'display',
    as('display', (value) => keyword(value, ['none', 'block', 'inline'])),
  ],
  [
    'overflow',
    as('overflow', (value) => keyword(value, ['hidden', 'visible'])),
  ],
  ['clip', as('clip', clipOf)],
  ['padding', as('padding', lengths)],
  ['margin', as('margin', lengths)],
  ['border-width', as('border-width', lengths)],
  [
    'border-style',
    as('border-style', (value) => keyword(value, BORDER_STYLES)),
  ],
  ...eachSide((side): [string, Mapper] => [
    `padding-${side}`,
    as(`padding-${side}`, (value) => length(value)),
  ]),
  ...eachSide((side): [string, Mapper] => [
    `margin-${side}`,
    as(`margin-${side}`, (value) => length(value, ['auto'])),
  ]),
  ...eachSide((side): [string, Mapper] => [
    `border-${side}-width`,
    as(`border-${side}-width`, (value) => length(value)),
  ]),
  ...eachSide((side): [string, Mapper] => [
    `border-${side}-style`,
    as(`border-${side}-style`, (value) => keyword(value, BORDER_STYLES)),
  ]),
  ...eachSide((side): [string, Mapper] => [
    `border-${side}-color-index`,
    colour(`border-${side}-color`),
  ]),
  ['border-color-index', colour('border-color')],
  ['color-index', colour('color')],
  ['background-color-index', colour('background-color', '--bml-background')],
  ['font-family', () => [`font-family: ${FONT_STACK}`]],
  ['font-size', as('font-size', (value) => length(value))],
  [
    'font-weight',
    as('font-weight', (value) => keyword(value, ['normal', 'bold'])),
  ],
  ['font-style', as('font-style', (value) => keyword(value, ['normal']))],
  ['line-height', as('line-height', (value) => length(value, ['normal']))],
  [
    'letter-spacing',
    as('letter-spacing', (value) => length(value, ['normal'])),
  ],
  [
    'text-align',
    as('text-align', (value) =>
      keyword(value, ['left', 'right', 'center', 'justify']),
    ),
  ],
  [
    'white-space',
    as('white-space', (value) => keyword(value, ['normal', 'pre', 'nowrap'])),
  ],
]

const MAPPERS = new Map<string, Mapper>(MAPPER_LIST)

export interface ConvertedStyle {
  css: string
  warnings: string[]
}

/** The CSS of a block of BML declarations. BML's own properties are left for the runtime; a property or value it does not take is dropped with a warning. */
export function cssOf(
  declarations: Declaration[],
  palette: Palette,
): ConvertedStyle {
  const css: string[] = []
  const warnings: string[] = []

  for (const { property, value } of declarations) {
    if (BML_PROPERTIES.has(property)) {
      continue
    }

    const mapper = MAPPERS.get(property)
    const mapped = mapper ? mapper(value, palette) : null

    if (!mapper) {
      warnings.push(`unsupported property: ${property}`)
    } else if (!mapped) {
      warnings.push(`unsupported value of ${property}`)
    }

    css.push(...(mapped ?? []))
  }

  return { css: css.join('; '), warnings }
}

/** The converted style sheet: each rule's selectors in the converted page, and its declarations as CSS. */
export function cssSheetOf(
  sheet: StyleSheet,
  palette: Palette,
): ConvertedStyle {
  const warnings: string[] = []
  const css = sheet.rules.flatMap((rule) => {
    const converted = cssOf(rule.declarations, palette)

    warnings.push(...converted.warnings)

    return converted.css.length > 0
      ? [`${rule.selectors.map(cssSelectorOf).join(', ')} { ${converted.css} }`]
      : []
  })

  return { css: css.join('\n'), warnings }
}

export interface BmlFeatures {
  navIndex?: number
  navUp?: number
  navDown?: number
  navLeft?: number
  navRight?: number
  usedKeys?: UsedKeyGroup[]
  resolution?: Size
  aspect?: Aspect
  clut?: string
}

const NAV_FEATURE = new Map<
  string,
  'navIndex' | 'navUp' | 'navDown' | 'navLeft' | 'navRight'
>([
  ['nav-index', 'navIndex'],
  ['nav-up', 'navUp'],
  ['nav-down', 'navDown'],
  ['nav-left', 'navLeft'],
  ['nav-right', 'navRight'],
])

const USED_KEY_GROUPS: string[] = ['basic', 'data-button', 'numeric-tuning']

function usedKeysOf(value: string): UsedKeyGroup[] | undefined {
  const words = value.toLowerCase().trim().split(/\s+/)

  if (words.length === 1 && words[0] === 'none') {
    return []
  }

  return words.every((word) => USED_KEY_GROUPS.includes(word))
    ? (words as UsedKeyGroup[])
    : undefined
}

function urlOf(value: string): string | undefined {
  const inside = insideOf(value, 'url(')?.trim()
  const quote = inside?.[0]
  const quoted =
    inside !== undefined &&
    inside.length >= 2 &&
    (quote === '"' || quote === "'") &&
    inside.endsWith(quote)
  const url = quoted ? inside.slice(1, -1) : inside

  return url && url.length > 0 ? url : undefined
}

/** BML's own properties among the declarations an element ends with, each read into the value the runtime uses. One that cannot be read is left out. */
export function featuresOf(values: Map<string, string>): BmlFeatures {
  const features: BmlFeatures = {}

  values.forEach((value, property) => {
    const nav = NAV_FEATURE.get(property)

    if (nav && /^\d+$/.test(value.trim())) {
      features[nav] = Number(value)
    }
  })

  const used = values.get('used-key-list')
  const resolution = RESOLUTIONS.get(
    values.get('resolution')?.trim().toLowerCase() ?? '',
  )
  const aspect = values.get('display-aspect-ratio')?.trim().toLowerCase()
  const clut = values.get('clut')

  features.usedKeys = used === undefined ? undefined : usedKeysOf(used)
  features.resolution = resolution
  features.aspect = aspect === '16v9' || aspect === '4v3' ? aspect : undefined
  features.clut = clut === undefined ? undefined : urlOf(clut)

  return Object.fromEntries(
    Object.entries(features).filter(([, value]) => value !== undefined),
  ) as BmlFeatures
}

/** A plain length in pixels, or null when the value is not one. */
export function pixelsOf(value: string | undefined): number | null {
  const parsed = value === undefined ? null : LENGTH.exec(value.trim())

  return parsed ? Number(parsed[1]) : null
}

export interface Plane {
  left: number
  top: number
  scaleX: number
  scaleY: number
}

/** Where a document's fixed layout stands in a box: its display shape contained in the middle, each axis scaled to fill that shape. */
export function planeIn(box: Size, resolution: Size, aspect: Aspect): Plane {
  const shape = aspect === '4v3' ? 4 / 3 : 16 / 9

  if (box.width <= 0 || box.height <= 0) {
    return { left: 0, top: 0, scaleX: 0, scaleY: 0 }
  }

  const width = Math.min(box.width, box.height * shape)
  const height = width / shape

  return {
    left: (box.width - width) / 2,
    top: (box.height - height) / 2,
    scaleX: width / resolution.width,
    scaleY: height / resolution.height,
  }
}

/** A rectangle of a document, given on the 960x540 grid of the 16:9 box the document is laid over. */
export function onGrid(rect: Rect, resolution: Size, aspect: Aspect): Rect {
  const plane = planeIn(GRID, resolution, aspect)

  return {
    left: plane.left + rect.left * plane.scaleX,
    top: plane.top + rect.top * plane.scaleY,
    width: rect.width * plane.scaleX,
    height: rect.height * plane.scaleY,
  }
}

/** The page's own rules, laid under every converted document. */
export const BASE_STYLE = [
  'html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }',
  '#bml-plane { position: absolute; left: 0; top: 0; overflow: hidden; transform-origin: 0 0; }',
  '[data-bml-tag] { margin: 0; padding: 0; border: 0 solid; }',
  `[data-bml-tag="body"] { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: hidden; font-family: ${FONT_STACK}; font-size: 24px; line-height: 1.5; color: rgb(255 255 255); background-color: transparent !important; }`,
  '[data-bml-tag="body"]::before { content: ""; position: absolute; left: 0; top: 0; width: 100%; height: 100%; box-sizing: border-box; background-color: var(--bml-background, transparent); border: 0 solid var(--bml-background, transparent); }',
  '[data-bml-tag="body"][data-bml-hole]::before { background-color: transparent; border-width: var(--bml-hole-top) var(--bml-hole-right) var(--bml-hole-bottom) var(--bml-hole-left); }',
  '[data-bml-tag="div"], [data-bml-tag="p"], [data-bml-tag="object"], [data-bml-tag="img"], [data-bml-tag="input"] { position: absolute; overflow: hidden; }',
  '[data-bml-video] { background: transparent !important; }',
  'img[data-bml-tag] { display: block; }',
  'input[data-bml-tag] { background: transparent; color: inherit; font: inherit; outline: none; }',
].join('\n')

/** The widths of the page's own ground around the video's rectangle, which is left clear. */
export function videoHole(
  rect: Rect,
  resolution: Size,
): Record<string, string> {
  return {
    '--bml-hole-top': `${rect.top}px`,
    '--bml-hole-right': `${resolution.width - rect.left - rect.width}px`,
    '--bml-hole-bottom': `${resolution.height - rect.top - rect.height}px`,
    '--bml-hole-left': `${rect.left}px`,
  }
}
