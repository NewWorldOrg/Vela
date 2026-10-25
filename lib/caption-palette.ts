import {
  INDEXED,
  chunksOf,
  dataOf,
  pngChunk,
  rewritten,
  type PngChunk,
} from '@/lib/png-chunks'
import { CAPTION_RGB, VEIL_OF, type CaptionLook } from '@/lib/caption-style'

const CHANNELS = 4

const MOST_ENTRIES = 256

/** Below this brightness (the largest of red, green and blue) an entry is black: an edge, a band, or the band's blur. */
export const DARK_BELOW = 32

/** How far apart, as a share of their brightest channel, two colours can lie and still be one colour of letters. */
const ONE_HUE_WITHIN = 0.2

/** How bright each channel of the white letters is at least: a picture packed into 256 colours loses its low bits, and its white can come down to 0xF0. */
const WHITE_FROM = 176

/** How far apart the channels of white letters lie at most. */
const WHITE_SPREAD = 48

/** A caption's indexed PNG once it has been checked: its chunks, its size and the colours of its palette, red, green, blue and alpha for each entry. */
export interface CaptionPng {
  png: Uint8Array
  chunks: PngChunk[]
  width: number
  height: number
  entries: Uint8Array
  palette: PngChunk
  transparency: PngChunk | null
}

function only(chunks: PngChunk[], type: string): PngChunk | null | undefined {
  const found = chunks.filter((each) => each.type === type)

  return found.length > 1 ? undefined : (found[0] ?? null)
}

function headerHolds(
  png: Uint8Array,
  header: PngChunk,
  size: { width: number; height: number },
): boolean {
  if (header.type !== 'IHDR' || header.length !== 13) {
    return false
  }

  const data = dataOf(png, header)
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)

  return (
    view.getUint32(0) === size.width &&
    view.getUint32(4) === size.height &&
    data[8] === 8 &&
    data[9] === INDEXED &&
    data[10] === 0 &&
    data[11] === 0 &&
    data[12] <= 1
  )
}

function inOrder(
  chunks: PngChunk[],
  palette: PngChunk,
  transparency: PngChunk | null,
): boolean {
  const firstPicture = chunks.findIndex((each) => each.type === 'IDAT')
  const at = chunks.indexOf(palette)

  return (
    firstPicture > at &&
    (transparency === null ||
      (chunks.indexOf(transparency) > at &&
        chunks.indexOf(transparency) < firstPicture)) &&
    chunks[chunks.length - 1].type === 'IEND'
  )
}

/** A caption's PNG read for its palette, or null when it is not the 8-bit indexed picture of the size its placement gives, with one palette of 256 entries at most and chunks that run to its end. */
export function readCaptionPng(
  png: Uint8Array,
  size: { width: number; height: number },
): CaptionPng | null {
  const chunks = chunksOf(png)

  if (!chunks || chunks.length < 3 || !headerHolds(png, chunks[0], size)) {
    return null
  }

  const palette = only(chunks, 'PLTE')
  const transparency = only(chunks, 'tRNS')

  if (
    !palette ||
    transparency === undefined ||
    palette.length === 0 ||
    palette.length % 3 !== 0 ||
    palette.length / 3 > MOST_ENTRIES ||
    (transparency !== null && transparency.length > palette.length / 3) ||
    !inOrder(chunks, palette, transparency)
  ) {
    return null
  }

  const count = palette.length / 3
  const rgb = dataOf(png, palette)
  const alpha = transparency ? dataOf(png, transparency) : new Uint8Array(0)
  const entries = new Uint8Array(count * CHANNELS)

  for (let index = 0; index < count; index += 1) {
    entries.set(rgb.subarray(index * 3, index * 3 + 3), index * CHANNELS)
    entries[index * CHANNELS + 3] = index < alpha.length ? alpha[index] : 255
  }

  return {
    png,
    chunks,
    width: size.width,
    height: size.height,
    entries,
    palette,
    transparency,
  }
}

/** What an entry of a caption's palette is taken to be. A letter is a share of its colour of letters laid over black. */
export type EntryRole =
  | { kind: 'clear' }
  | { kind: 'veil' }
  | { kind: 'dark' }
  | { kind: 'letter'; colour: number; cover: number }

/** One colour of letters: the brightest entry of those that lie in its direction from black. */
export interface LetterColour {
  rgb: number[]
  white: boolean
}

export interface CaptionPalette {
  roles: EntryRole[]
  colours: LetterColour[]
  /** The band's opacity, the smallest of the half see-through black entries, or null when the palette has none. */
  veil: number | null
  /** Whether any entry is opaque black, which may be an edge or a solid band. */
  dark: boolean
}

function brightness(entries: Uint8Array, index: number): number {
  const at = index * CHANNELS

  return Math.max(entries[at], entries[at + 1], entries[at + 2])
}

function directionOf(rgb: ArrayLike<number>): number[] {
  const top = Math.max(rgb[0], rgb[1], rgb[2])

  return [rgb[0] / top, rgb[1] / top, rgb[2] / top]
}

function sameHue(a: number[], b: number[]): boolean {
  return a.every(
    (value, channel) => Math.abs(value - b[channel]) <= ONE_HUE_WITHIN,
  )
}

function isWhite(rgb: number[]): boolean {
  return (
    Math.min(...rgb) >= WHITE_FROM &&
    Math.max(...rgb) - Math.min(...rgb) <= WHITE_SPREAD
  )
}

function premultiplied(entries: Uint8Array, index: number): number {
  return (brightness(entries, index) * entries[index * CHANNELS + 3]) / 255
}

/** Reads what each entry of a caption's palette is: clear, black (opaque, or half see-through), or a share of one colour of letters. Entries are gathered by their direction from black, brightest first, and each takes as its share its brightness over its colour's, both as laid over black. */
export function readPalette(entries: Uint8Array): CaptionPalette {
  const count = entries.length / CHANNELS
  const roles: EntryRole[] = Array.from({ length: count }, () => ({
    kind: 'clear',
  }))
  const colours: LetterColour[] = []
  const directions: number[][] = []
  const tops: number[] = []
  let veil: number | null = null
  let dark = false

  const byBrightness = Array.from({ length: count }, (_, index) => index).sort(
    (a, b) => premultiplied(entries, b) - premultiplied(entries, a),
  )

  for (const index of byBrightness) {
    const alpha = entries[index * CHANNELS + 3]

    if (alpha === 0) {
      continue
    }

    if (brightness(entries, index) < DARK_BELOW) {
      if (alpha === 255) {
        dark = true
        roles[index] = { kind: 'dark' }
      } else {
        veil = veil === null ? alpha : Math.min(veil, alpha)
        roles[index] = { kind: 'veil' }
      }

      continue
    }

    const rgb = Array.from(
      entries.subarray(index * CHANNELS, index * CHANNELS + 3),
    )
    const direction = directionOf(rgb)
    let colour = directions.findIndex((one) => sameHue(one, direction))

    if (colour === -1) {
      colour = colours.length
      colours.push({ rgb, white: isWhite(rgb) })
      directions.push(direction)
      tops.push(premultiplied(entries, index))
    }

    roles[index] = {
      kind: 'letter',
      colour,
      cover: Math.min(1, premultiplied(entries, index) / tops[colour]),
    }
  }

  return { roles, colours, veil, dark }
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function letterColourFor(
  palette: CaptionPalette,
  colour: number,
  look: CaptionLook,
): number[] | null {
  if (look.colour === 'broadcast') {
    return null
  }

  return look.allOneColour || palette.colours[colour].white
    ? CAPTION_RGB[look.colour]
    : null
}

function letterOver(
  role: { colour: number; cover: number },
  rgb: number[],
  veil: number,
): number[] {
  const alpha = role.cover + (1 - role.cover) * (veil / 255)

  if (alpha <= 0) {
    return [0, 0, 0, 0]
  }

  return [
    ...rgb.map((channel) => clampByte((role.cover * channel) / alpha)),
    clampByte(alpha * 255),
  ]
}

function letterRecoloured(
  entries: Uint8Array,
  index: number,
  rgb: number[],
  top: number,
): number[] {
  const at = index * CHANNELS
  const share = brightness(entries, index) / top

  return [...rgb.map((channel) => clampByte(share * channel)), entries[at + 3]]
}

/** The palette's entries redrawn for a look (BR-CS-002, BR-CS-004): a half see-through black takes the band chosen; a letter is its share of its colour, the chosen one for white letters, laid again over that band; opaque black and clear entries stand. With the broadcast's band, a letter keeps its opacity and only changes colour. */
export function restyledEntries(
  entries: Uint8Array,
  palette: CaptionPalette,
  look: CaptionLook,
): Uint8Array {
  const out = entries.slice()
  const veil = VEIL_OF[look.background]

  palette.roles.forEach((role, index) => {
    const at = index * CHANNELS

    if (role.kind === 'veil' && veil !== null) {
      out.set([0, 0, 0, veil], at)

      return
    }

    if (role.kind !== 'letter') {
      return
    }

    const chosen = letterColourFor(palette, role.colour, look)
    const own = palette.colours[role.colour].rgb

    if (veil !== null) {
      out.set(letterOver(role, chosen ?? own, veil), at)
    } else if (chosen) {
      out.set(letterRecoloured(entries, index, chosen, Math.max(...own)), at)
    }
  })

  return out
}

/** Entries that draw only the letters, as black, each as opaque as its share: the shape an added edge is made from (BR-CS-005). */
export function letterShapeEntries(palette: CaptionPalette): Uint8Array {
  const out = new Uint8Array(palette.roles.length * CHANNELS)

  palette.roles.forEach((role, index) => {
    if (role.kind === 'letter') {
      out[index * CHANNELS + 3] = clampByte(role.cover * 255)
    }
  })

  return out
}

/** Entries that draw, as opaque white, only the entries `keeps` keeps, and leave the rest clear: a mask to read pixels from. */
export function maskEntries(
  entries: Uint8Array,
  palette: CaptionPalette,
  keeps: (role: EntryRole, alpha: number) => boolean,
): Uint8Array {
  const out = new Uint8Array(entries.length)

  palette.roles.forEach((role, index) => {
    if (keeps(role, entries[index * CHANNELS + 3])) {
      out.set([255, 255, 255, 255], index * CHANNELS)
    }
  })

  return out
}

/** The caption's PNG with its palette and transparency replaced by `entries`, its pictures' data untouched and the CRCs written again. */
export function withEntries(read: CaptionPng, entries: Uint8Array): Uint8Array {
  const count = entries.length / CHANNELS
  const rgb = new Uint8Array(count * 3)
  const alpha = new Uint8Array(count)

  for (let index = 0; index < count; index += 1) {
    rgb.set(entries.subarray(index * CHANNELS, index * CHANNELS + 3), index * 3)
    alpha[index] = entries[index * CHANNELS + 3]
  }

  const replaced = new Map<PngChunk, Uint8Array>([
    [read.palette, pngChunk('PLTE', rgb)],
  ])
  const chunks = [...read.chunks]

  if (read.transparency) {
    replaced.set(read.transparency, pngChunk('tRNS', alpha))
  } else {
    const transparency: PngChunk = { type: 'tRNS', at: -1, length: count }

    chunks.splice(chunks.indexOf(read.palette) + 1, 0, transparency)
    replaced.set(transparency, pngChunk('tRNS', alpha))
  }

  return rewritten(read.png, chunks, replaced)
}
