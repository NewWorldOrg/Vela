import assert from 'node:assert/strict'
import { test } from 'node:test'
import { crc32 } from 'node:zlib'

import {
  letterShapeEntries,
  maskEntries,
  readCaptionPng,
  readPalette,
  restyledEntries,
  withEntries,
  type CaptionPalette,
  type EntryRole,
} from '@/lib/caption-palette'
import { chunksOf, dataOf } from '@/lib/png-chunks'
import {
  PLAIN_CAPTION_STYLE,
  lookOf,
  type CaptionStyle,
} from '@/lib/caption-style'
import {
  HALF_BLACK,
  YELLOW,
  edgedWithNoBand,
  greyOnAHalfBand,
  indicesOf,
  packedInto256,
  pngOf,
  speakersOnAHalfBand,
  whiteOnASolidBand,
  whiteWithNoBand,
  yellowOnAHalfBand,
  type Drawn,
  type Rgba,
} from '@/tests/lib/caption-pictures'

function read(drawn: Drawn) {
  const found = readCaptionPng(pngOf(drawn), drawn)

  assert.ok(found, 'the drawn caption was not read')

  return found
}

function roleOf(drawn: Drawn, palette: CaptionPalette, rgba: Rgba): EntryRole {
  const index = drawn.entries.findIndex((one) =>
    one.every((v, i) => v === rgba[i]),
  )

  assert.notEqual(index, -1, `no entry ${rgba.join(',')}`)

  return palette.roles[index]
}

function entryAfter(drawn: Drawn, out: Uint8Array, rgba: Rgba): number[] {
  const index = drawn.entries.findIndex((one) =>
    one.every((v, i) => v === rgba[i]),
  )

  return Array.from(out.subarray(index * 4, index * 4 + 4))
}

function restyled(drawn: Drawn, style: Partial<CaptionStyle>) {
  const found = read(drawn)

  return restyledEntries(
    found.entries,
    readPalette(found.entries),
    lookOf({ ...PLAIN_CAPTION_STYLE, ...style }),
  )
}

test('a caption’s PNG is read when it is 8-bit indexed at the size its placement gives', () => {
  const drawn = yellowOnAHalfBand()
  const found = read(drawn)

  assert.equal(found.entries.length, drawn.entries.length * 4)
  assert.deepEqual(Array.from(found.entries.subarray(4, 8)), HALF_BLACK)
})

test('a PNG of another size, depth or shape is not rewritten', () => {
  const drawn = yellowOnAHalfBand()
  const png = pngOf(drawn)

  assert.equal(readCaptionPng(png, { width: 121, height: 30 }), null)
  assert.equal(readCaptionPng(pngOf(drawn, { depth: 4 }), drawn), null)
  assert.equal(readCaptionPng(png.subarray(0, png.length - 3), drawn), null)
  assert.equal(readCaptionPng(new Uint8Array([137, 80, 78, 71]), drawn), null)

  const truecolour = png.slice()

  truecolour[8 + 8 + 9] = 6

  assert.equal(readCaptionPng(truecolour, drawn), null)
})

test('a palette with no transparency is read as opaque, and one longer than 256 is refused', () => {
  const drawn = whiteWithNoBand()
  const found = readCaptionPng(pngOf(drawn, { withTransparency: false }), drawn)

  assert.ok(found)
  assert.equal(found.entries[3], 255)

  const crowded: Drawn = {
    ...drawn,
    entries: Array.from({ length: 257 }, (_, i): Rgba => [i & 255, 0, 0, 255]),
  }

  assert.equal(readCaptionPng(pngOf(crowded), crowded), null)
})

test('on a half band, the band is the veil and the yellow and its soft edge are one colour of letters', () => {
  const drawn = yellowOnAHalfBand()
  const palette = readPalette(read(drawn).entries)

  assert.equal(palette.veil, 128)
  assert.equal(palette.dark, false)
  assert.deepEqual(roleOf(drawn, palette, HALF_BLACK), { kind: 'veil' })
  assert.deepEqual(roleOf(drawn, palette, [27, 27, 0, 128]), { kind: 'veil' })
  assert.deepEqual(roleOf(drawn, palette, YELLOW), {
    kind: 'letter',
    colour: 0,
    cover: 1,
  })

  const soft = roleOf(drawn, palette, [157, 157, 0, 255])

  assert.equal(soft.kind, 'letter')
  assert.ok(soft.kind === 'letter' && Math.abs(soft.cover - 157 / 250) < 1e-9)
  assert.equal(palette.colours.length, 1)
  assert.equal(palette.colours[0].white, false)
})

test('with no band, white letters’ half see-through edge is half their cover', () => {
  const drawn = whiteWithNoBand()
  const palette = readPalette(read(drawn).entries)
  const soft = roleOf(drawn, palette, [255, 255, 255, 128])

  assert.equal(palette.veil, null)
  assert.equal(palette.dark, false)
  assert.ok(soft.kind === 'letter' && Math.abs(soft.cover - 128 / 255) < 1e-9)
  assert.equal(palette.colours[0].white, true)
})

test('opaque black is told apart from letters, and a solid band’s grey edge is a share of white', () => {
  const drawn = whiteOnASolidBand()
  const palette = readPalette(read(drawn).entries)
  const grey = roleOf(drawn, palette, [110, 110, 110, 255])

  assert.equal(palette.dark, true)
  assert.equal(palette.veil, 128)
  assert.deepEqual(roleOf(drawn, palette, [0, 0, 0, 255]), { kind: 'dark' })
  assert.ok(grey.kind === 'letter' && grey.colour === 0)
  assert.equal(palette.colours[0].white, true)
})

test('each speaker’s colour is its own, and only white is white', () => {
  const drawn = speakersOnAHalfBand()
  const palette = readPalette(read(drawn).entries)

  assert.deepEqual(
    palette.colours.map((one) => [one.rgb.join(','), one.white]),
    [
      ['255,255,255', true],
      ['255,255,0', false],
      ['0,255,255', false],
      ['0,255,0', false],
    ],
  )
})

test('grey letters with no white are not white, and keep their colour', () => {
  const drawn = greyOnAHalfBand()
  const palette = readPalette(read(drawn).entries)
  const out = restyled(drawn, { colour: 'yellow' })

  assert.deepEqual(
    palette.colours.map((one) => one.white),
    [false],
  )
  assert.deepEqual(
    entryAfter(drawn, out, [150, 150, 150, 255]),
    [150, 150, 150, 255],
  )
})

test('a picture packed into 256 colours still has white letters at 0xF0', () => {
  const drawn = packedInto256()
  const palette = readPalette(read(drawn).entries)
  const letter = roleOf(drawn, palette, [240, 240, 240, 255])

  assert.ok(drawn.entries.length > 100 && drawn.entries.length <= 256)
  assert.ok(letter.kind === 'letter')
  assert.equal(
    letter.kind === 'letter' && palette.colours[letter.colour].white,
    true,
  )
})

test('as broadcast, nothing in the palette changes', () => {
  const drawn = speakersOnAHalfBand()

  assert.deepEqual(restyled(drawn, {}), read(drawn).entries)
})

test('no band takes the veil away and leaves each letter as opaque as its cover, in its own colour, so no dark ring is left', () => {
  const drawn = yellowOnAHalfBand()
  const out = restyled(drawn, { background: 'none' })

  assert.deepEqual(entryAfter(drawn, out, HALF_BLACK), [0, 0, 0, 0])
  assert.deepEqual(entryAfter(drawn, out, [27, 27, 0, 128]), [0, 0, 0, 0])
  assert.deepEqual(entryAfter(drawn, out, YELLOW), [250, 250, 0, 255])
  assert.deepEqual(
    entryAfter(drawn, out, [157, 157, 0, 255]),
    [250, 250, 0, 160],
  )
})

test('a half and a solid band lay each letter again over that band', () => {
  const drawn = yellowOnAHalfBand()
  const half = restyled(drawn, { background: 'half' })
  const solid = restyled(drawn, { background: 'solid' })
  const cover = 157 / 250
  const alpha = cover + (1 - cover) * (128 / 255)

  assert.deepEqual(entryAfter(drawn, half, HALF_BLACK), [0, 0, 0, 128])
  assert.deepEqual(entryAfter(drawn, half, [157, 157, 0, 255]), [
    Math.round((cover * 250) / alpha),
    Math.round((cover * 250) / alpha),
    0,
    Math.round(alpha * 255),
  ])
  assert.deepEqual(entryAfter(drawn, solid, HALF_BLACK), [0, 0, 0, 255])
  assert.deepEqual(
    entryAfter(drawn, solid, [157, 157, 0, 255]),
    [157, 157, 0, 255],
  )
})

test('a colour changes only the white letters and their soft edge, so no white is left around them', () => {
  const drawn = speakersOnAHalfBand()
  const out = restyled(drawn, { colour: 'yellow' })

  assert.deepEqual(
    entryAfter(drawn, out, [255, 255, 255, 255]),
    [255, 255, 0, 255],
  )
  assert.deepEqual(
    entryAfter(drawn, out, [128, 128, 128, 255]),
    [128, 128, 0, 255],
  )
  assert.deepEqual(
    entryAfter(drawn, out, [0, 255, 255, 255]),
    [0, 255, 255, 255],
  )
  assert.deepEqual(entryAfter(drawn, out, [0, 128, 0, 255]), [0, 128, 0, 255])
  assert.deepEqual(entryAfter(drawn, out, HALF_BLACK), HALF_BLACK)
})

test('one colour for all changes every colour of letters', () => {
  const drawn = speakersOnAHalfBand()
  const out = restyled(drawn, { colour: 'cyan', allOneColour: true })

  assert.deepEqual(
    entryAfter(drawn, out, [255, 255, 0, 255]),
    [0, 255, 255, 255],
  )
  assert.deepEqual(entryAfter(drawn, out, [0, 128, 0, 255]), [0, 128, 128, 255])
  assert.deepEqual(
    entryAfter(drawn, out, [255, 255, 255, 255]),
    [0, 255, 255, 255],
  )
})

test('with no band, a new colour keeps each letter’s opacity', () => {
  const drawn = whiteWithNoBand()
  const out = restyled(drawn, { colour: 'green' })

  assert.deepEqual(
    entryAfter(drawn, out, [255, 255, 255, 128]),
    [0, 255, 0, 128],
  )
})

test('a rewritten PNG keeps its pictures’ data and carries good CRCs', () => {
  const drawn = speakersOnAHalfBand()
  const found = read(drawn)
  const out = restyled(drawn, { background: 'none', colour: 'green' })
  const png = withEntries(found, out)
  const again = readCaptionPng(png, drawn)
  const chunks = chunksOf(png)!

  assert.ok(again)
  assert.deepEqual(again.entries, out)
  assert.deepEqual(indicesOf(png, drawn.width), drawn.pixels)

  for (const each of chunks) {
    const stored = new DataView(png.buffer, png.byteOffset).getUint32(
      each.at + 8 + each.length,
    )
    const over = png.subarray(each.at + 4, each.at + 8 + each.length)

    assert.equal(stored, crc32(over) >>> 0, `${each.type} has a bad CRC`)
  }

  assert.deepEqual(
    Buffer.from(
      dataOf(
        png,
        chunks.find((one) => one.type === 'IDAT')!,
      ),
    ),
    Buffer.from(
      dataOf(
        found.png,
        found.chunks.find((one) => one.type === 'IDAT')!,
      ),
    ),
  )
})

test('a PNG with no transparency is given one with the new opacities', () => {
  const drawn = whiteWithNoBand()
  const found = readCaptionPng(
    pngOf(drawn, { withTransparency: false }),
    drawn,
  )!
  const out = found.entries.slice()

  out[3] = 0

  const again = readCaptionPng(withEntries(found, out), drawn)

  assert.ok(again)
  assert.equal(again.transparency?.length, drawn.entries.length)
  assert.equal(again.entries[3], 0)
})

test('the letters’ shape is black, as opaque as each letter’s cover, and nothing else', () => {
  const drawn = whiteOnASolidBand()
  const found = read(drawn)
  const palette = readPalette(found.entries)
  const shape = letterShapeEntries(palette)

  assert.deepEqual(entryAfter(drawn, shape, [0, 0, 0, 255]), [0, 0, 0, 0])
  assert.deepEqual(
    entryAfter(drawn, shape, [255, 255, 255, 255]),
    [0, 0, 0, 255],
  )
  assert.deepEqual(
    entryAfter(drawn, shape, [110, 110, 110, 255]),
    [0, 0, 0, 110],
  )
})

test('a mask keeps only the entries it is asked for, as opaque white', () => {
  const drawn = edgedWithNoBand()
  const found = read(drawn)
  const palette = readPalette(found.entries)
  const dark = maskEntries(
    found.entries,
    palette,
    (role) => role.kind === 'dark',
  )

  assert.deepEqual(
    entryAfter(drawn, dark, [0, 0, 0, 255]),
    [255, 255, 255, 255],
  )
  assert.deepEqual(entryAfter(drawn, dark, [255, 255, 255, 255]), [0, 0, 0, 0])
})
