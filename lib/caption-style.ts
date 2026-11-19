export type CaptionBackground = 'broadcast' | 'none' | 'half' | 'solid'

export type CaptionColour = 'broadcast' | 'white' | 'yellow' | 'cyan' | 'green'

export type CaptionEdge = 'broadcast' | 'added'

export const CAPTION_SCALES = ['75', '100', '125', '150'] as const

export type CaptionScale = (typeof CAPTION_SCALES)[number]

export interface CaptionShift {
  x: number
  y: number
}

export interface CaptionStyle {
  background: CaptionBackground
  scale: CaptionScale
  colour: CaptionColour
  allOneColour: boolean
  edge: CaptionEdge
  shift: CaptionShift
}

export const PLAIN_CAPTION_STYLE: CaptionStyle = {
  background: 'broadcast',
  scale: '100',
  colour: 'broadcast',
  allOneColour: false,
  edge: 'broadcast',
  shift: { x: 0, y: 0 },
}

export const CAPTION_STYLE_COOKIE = 'vela-caption-style'

export const CAPTION_BACKGROUNDS: readonly CaptionBackground[] = [
  'broadcast',
  'none',
  'half',
  'solid',
]

export const CAPTION_COLOURS: readonly CaptionColour[] = [
  'broadcast',
  'white',
  'yellow',
  'cyan',
  'green',
]

export const CAPTION_EDGES: readonly CaptionEdge[] = ['broadcast', 'added']

export const AS_BROADCAST = '放送のまま'

export const CAPTION_BACKGROUND_LABEL: Record<CaptionBackground, string> = {
  broadcast: AS_BROADCAST,
  none: 'なし',
  half: '半透明',
  solid: '不透明',
}

export const CAPTION_COLOUR_LABEL: Record<CaptionColour, string> = {
  broadcast: AS_BROADCAST,
  white: '白',
  yellow: '黄',
  cyan: '水色',
  green: '緑',
}

export const CAPTION_EDGE_LABEL: Record<CaptionEdge, string> = {
  broadcast: AS_BROADCAST,
  added: '足す',
}

export const CAPTION_RGB: Record<
  Exclude<CaptionColour, 'broadcast'>,
  number[]
> = {
  white: [255, 255, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  green: [0, 255, 0],
}

export const VEIL_OF: Record<CaptionBackground, number | null> = {
  broadcast: null,
  none: 0,
  half: 128,
  solid: 255,
}

export const FURTHEST_SHIFT = 1

const PER = 1000

const BACKGROUND_SPELLING: Record<string, CaptionBackground> = {
  n: 'none',
  h: 'half',
  s: 'solid',
}

const COLOUR_SPELLING: Record<string, CaptionColour> = {
  w: 'white',
  y: 'yellow',
  c: 'cyan',
  g: 'green',
}

function spelledIn<T extends string>(
  table: Record<string, T>,
  value: string,
): T | undefined {
  return Object.hasOwn(table, value) ? table[value] : undefined
}

function spellingOf<T extends string>(
  table: Record<string, T>,
  value: T,
): string | undefined {
  return Object.keys(table).find((key) => table[key] === value)
}

function shiftOf(value: string): number | undefined {
  if (!/^-?\d{1,4}$/.test(value)) {
    return undefined
  }

  const read = Number(value) / PER

  return Math.abs(read) <= FURTHEST_SHIFT ? read : undefined
}

function scaleOf(value: string): CaptionScale | undefined {
  return CAPTION_SCALES.find((one) => one === value)
}

type Reading = (style: CaptionStyle, value: string) => CaptionStyle

const READINGS: Record<string, Reading> = {
  b: (style, value) => ({
    ...style,
    background: spelledIn(BACKGROUND_SPELLING, value) ?? style.background,
  }),
  s: (style, value) => ({ ...style, scale: scaleOf(value) ?? style.scale }),
  c: (style, value) => ({
    ...style,
    colour: spelledIn(COLOUR_SPELLING, value) ?? style.colour,
  }),
  a: (style, value) => ({ ...style, allOneColour: value === '1' }),
  e: (style, value) => ({
    ...style,
    edge: value === 'a' ? 'added' : style.edge,
  }),
  x: (style, value) => ({
    ...style,
    shift: { ...style.shift, x: shiftOf(value) ?? style.shift.x },
  }),
  y: (style, value) => ({
    ...style,
    shift: { ...style.shift, y: shiftOf(value) ?? style.shift.y },
  }),
}

export function captionStyleOf(said: string | undefined): CaptionStyle {
  if (!said) {
    return PLAIN_CAPTION_STYLE
  }

  return said
    .split('.')
    .reduce<CaptionStyle>(
      (style, item) =>
        Object.hasOwn(READINGS, item.charAt(0))
          ? READINGS[item.charAt(0)](style, item.slice(1))
          : style,
      PLAIN_CAPTION_STYLE,
    )
}

function perMille(fraction: number): number {
  return Math.round(
    Math.max(-FURTHEST_SHIFT, Math.min(FURTHEST_SHIFT, fraction)) * PER,
  )
}

export function captionStyleSpelling(style: CaptionStyle): string | undefined {
  const items = [
    style.background !== 'broadcast' &&
      `b${spellingOf(BACKGROUND_SPELLING, style.background)}`,
    style.scale !== '100' && `s${style.scale}`,
    style.colour !== 'broadcast' &&
      `c${spellingOf(COLOUR_SPELLING, style.colour)}`,
    style.allOneColour && 'a1',
    style.edge === 'added' && 'ea',
    perMille(style.shift.x) !== 0 && `x${perMille(style.shift.x)}`,
    perMille(style.shift.y) !== 0 && `y${perMille(style.shift.y)}`,
  ].filter((item): item is string => typeof item === 'string')

  return items.length > 0 ? items.join('.') : undefined
}

export function isShifted(style: CaptionStyle): boolean {
  return perMille(style.shift.x) !== 0 || perMille(style.shift.y) !== 0
}

export function isPlain(style: CaptionStyle): boolean {
  return captionStyleSpelling(style) === undefined
}

export interface CaptionLook {
  background: CaptionBackground
  colour: CaptionColour
  allOneColour: boolean
  edge: CaptionEdge
}

export function lookOf(style: CaptionStyle): CaptionLook {
  return {
    background: style.background,
    colour: style.colour,
    allOneColour: style.allOneColour && style.colour !== 'broadcast',
    edge: style.edge,
  }
}

export function looksAsBroadcast(look: CaptionLook): boolean {
  return (
    look.background === 'broadcast' &&
    look.colour === 'broadcast' &&
    look.edge === 'broadcast'
  )
}

export function lookKey(look: CaptionLook): string {
  return [look.background, look.colour, look.allOneColour, look.edge].join('/')
}
