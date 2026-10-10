import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inflateSync, deflateSync, crc32 } from 'node:zlib'

import { colourOf, paletteOf, readClut, withPalette } from '@/lib/bml/palette'

test('the common fixed colours run black, the primaries, white, then clear', () => {
  const fixed = paletteOf(null)

  assert.equal(colourOf(fixed, 0), 'rgb(0 0 0)')
  assert.equal(colourOf(fixed, 1), 'rgb(255 0 0)')
  assert.equal(colourOf(fixed, 4), 'rgb(0 0 255)')
  assert.equal(colourOf(fixed, 7), 'rgb(255 255 255)')
  assert.equal(colourOf(fixed, 8), 'rgb(0 0 0 / 0)')
  assert.equal(colourOf(fixed, 9), 'rgb(170 0 0)')
  assert.equal(colourOf(fixed, 65), 'rgb(0 0 0 / 0.502)')
})

test('an index outside the palette is no colour', () => {
  const fixed = paletteOf(null)

  assert.equal(colourOf(fixed, -1), null)
  assert.equal(colourOf(fixed, 256), null)
  assert.equal(colourOf(fixed, 1.5), null)
})

test('assumed layout: one byte of flags (type, depth, region, range), the 8-bit range as two bytes, then R G B alpha for each entry when the type bit is set', () => {
  const clut = readClut(
    Uint8Array.from([0xc8, 128, 129, 10, 20, 30, 255, 40, 50, 60, 128]),
  )
  const palette = paletteOf(clut)

  assert.deepEqual(clut?.from, 128)
  assert.equal(colourOf(palette, 128), 'rgb(10 20 30)')
  assert.equal(colourOf(palette, 129), 'rgb(40 50 60 / 0.502)')
  assert.equal(colourOf(palette, 7), 'rgb(255 255 255)')
})

test('assumed layout: with the type bit clear an entry is Y Cb Cr alpha, read as BT.709 in the video range', () => {
  const clut = readClut(
    Uint8Array.from([
      0x48, 140, 142, 235, 128, 128, 255, 16, 128, 128, 255, 126, 128, 128, 255,
    ]),
  )
  const palette = paletteOf(clut)

  assert.equal(colourOf(palette, 140), 'rgb(255 255 255)')
  assert.equal(colourOf(palette, 141), 'rgb(0 0 0)')
  assert.equal(colourOf(palette, 142), 'rgb(128 128 128)')
})

test('a document’s table defines 128 and above only: the common fixed colours below are not its to change', () => {
  const entries = Array.from({ length: 4 }, (_, index) => [
    index,
    index,
    index,
    255,
  ])
  const palette = paletteOf(
    readClut(Uint8Array.from([0xc8, 126, 129, ...entries.flat()])),
  )

  assert.equal(colourOf(palette, 126), 'rgb(255 170 255 / 0.502)')
  assert.equal(colourOf(palette, 127), 'rgb(255 255 85 / 0.502)')
  assert.equal(colourOf(palette, 128), 'rgb(2 2 2)')
  assert.equal(colourOf(palette, 129), 'rgb(3 3 3)')
  assert.equal(
    colourOf(
      paletteOf(readClut(Uint8Array.from([0xc8, 1, 1, 9, 9, 9, 255]))),
      1,
    ),
    'rgb(255 0 0)',
  )
})

test('assumed layout: a table that states no range covers its whole depth, and a stated region is four 16-bit corners stepped over', () => {
  const sixteen = Array.from({ length: 16 }, (_, index) => [index, 0, 0, 255])
  const whole = readClut(Uint8Array.from([0xa0, ...sixteen.flat()]))
  const regioned = readClut(
    Uint8Array.from([
      0xd8, 0, 0, 0, 0, 3, 0xc0, 2, 0x1c, 200, 200, 1, 2, 3, 255,
    ]),
  )

  assert.equal(whole?.from, 0)
  assert.equal(whole?.colours.length, 64)
  assert.equal(regioned?.from, 200)
  assert.equal(colourOf(paletteOf(regioned), 200), 'rgb(1 2 3)')
})

test('assumed layout: a 4-bit table states its range as two nibbles, a 2-bit table as the top two pairs of bits', () => {
  const four = readClut(
    Uint8Array.from([0xa8, 0x23, 1, 1, 1, 255, 2, 2, 2, 255]),
  )
  const two = readClut(
    Uint8Array.from([0x88, 0x60, 1, 1, 1, 255, 2, 2, 2, 255]),
  )

  assert.equal(four?.from, 2)
  assert.equal(four?.colours.length, 8)
  assert.equal(two?.from, 1)
  assert.equal(two?.colours.length, 8)
})

test('a table cut short, with its range backwards or of a depth that does not exist, is not read', () => {
  assert.equal(readClut(new Uint8Array()), null)
  assert.equal(readClut(Uint8Array.from([0xc8, 128, 130, 1, 2, 3, 255])), null)
  assert.equal(readClut(Uint8Array.from([0xc8, 130, 128])), null)
  assert.equal(readClut(Uint8Array.from([0xe8, 0, 0, 1, 2, 3, 255])), null)
})

function chunk(type: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8)

  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'latin1')

  const tail = Buffer.alloc(4)

  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0)

  return Buffer.concat([head, data, tail])
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function png(colourType: number, extra: Buffer[] = []): Uint8Array {
  const header = Buffer.from([0, 0, 0, 2, 0, 0, 0, 1, 8, colourType, 0, 0, 0])
  const data = deflateSync(Buffer.from([0, 7, 8]))

  return new Uint8Array(
    Buffer.concat([
      SIGNATURE,
      chunk('IHDR', header),
      ...extra,
      chunk('IDAT', data),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

function chunksIn(
  bytes: Uint8Array,
): { type: string; data: Buffer; sound: boolean }[] {
  const buffer = Buffer.from(bytes)
  const chunks = []
  let at = 8

  while (at < buffer.length) {
    const length = buffer.readUInt32BE(at)
    const type = buffer.toString('latin1', at + 4, at + 8)
    const data = buffer.subarray(at + 8, at + 8 + length)
    const crc = buffer.readUInt32BE(at + 8 + length)

    chunks.push({
      type,
      data,
      sound: crc32(buffer.subarray(at + 4, at + 8 + length)) >>> 0 === crc,
    })
    at += 12 + length
  }

  return chunks
}

test('an indexed PNG that leaves its palette to the document is given it, before its data, with sound checksums', () => {
  const palette = paletteOf(
    readClut(Uint8Array.from([0xc8, 128, 128, 10, 20, 30, 200])),
  )
  const drawn = withPalette(png(3), palette)
  const chunks = chunksIn(drawn)

  assert.deepEqual(
    chunks.map((each) => each.type),
    ['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'],
  )
  assert.ok(chunks.every((each) => each.sound))
  assert.equal(chunks[1].data.length, 256 * 3)
  assert.deepEqual(
    [...chunks[1].data.subarray(7 * 3, 7 * 3 + 3)],
    [255, 255, 255],
  )
  assert.deepEqual(
    [...chunks[1].data.subarray(128 * 3, 128 * 3 + 3)],
    [10, 20, 30],
  )
  assert.equal(chunks[2].data[8], 0)
  assert.equal(chunks[2].data[128], 200)
  assert.deepEqual([...inflateSync(chunks[3].data)], [0, 7, 8])
})

test('a PNG with its own palette, or not indexed, or not a PNG, is left as it is', () => {
  const palette = paletteOf(null)
  const own = png(3, [chunk('PLTE', new Uint8Array(3))])
  const truecolour = png(2)
  const junk = new Uint8Array([1, 2, 3])

  assert.equal(withPalette(own, palette), own)
  assert.equal(withPalette(truecolour, palette), truecolour)
  assert.equal(withPalette(junk, palette), junk)
})

test('an indexed PNG that carries its own transparency is given the colours only, ahead of it', () => {
  const drawn = withPalette(
    png(3, [chunk('tRNS', new Uint8Array([0, 255]))]),
    paletteOf(null),
  )
  const chunks = chunksIn(drawn)

  assert.deepEqual(
    chunks.map((each) => each.type),
    ['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'],
  )
  assert.deepEqual([...chunks[2].data], [0, 255])
  assert.ok(chunks.every((each) => each.sound))
})

test('an indexed PNG of a bit depth an indexed PNG cannot have is left as it is', () => {
  const odd = png(3)

  odd[8 + 8 + 8] = 31

  assert.equal(withPalette(odd, paletteOf(null)), odd)
})
