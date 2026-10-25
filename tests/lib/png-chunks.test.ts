import assert from 'node:assert/strict'
import { test } from 'node:test'
import { crc32, deflateSync } from 'node:zlib'

import { chunksOf, dataOf, pngChunk, rewritten } from '@/lib/png-chunks'

function chunk(type: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8)

  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'latin1')

  const tail = Buffer.alloc(4)

  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0)

  return Buffer.concat([head, data, tail])
}

function onePixel(): Uint8Array {
  const header = Buffer.alloc(13)

  header.writeUInt32BE(1, 0)
  header.writeUInt32BE(1, 4)
  header[8] = 8
  header[9] = 3

  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk('PLTE', Buffer.from([255, 255, 255])),
      chunk('IDAT', deflateSync(Buffer.from([0, 0]))),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

test('the chunks are read in order with their lengths', () => {
  const png = onePixel()
  const chunks = chunksOf(png)

  assert.deepEqual(
    chunks?.map((each) => [each.type, each.length]),
    [
      ['IHDR', 13],
      ['PLTE', 3],
      ['IDAT', chunks?.[2].length],
      ['IEND', 0],
    ],
  )
  assert.deepEqual([...dataOf(png, chunks![1])], [255, 255, 255])
})

test('bytes without the signature, or with a length that runs past the end, are not a PNG', () => {
  const png = onePixel()
  const lying = png.slice()

  lying[8 + 3] = 200

  assert.equal(chunksOf(png.subarray(1)), null)
  assert.equal(chunksOf(lying), null)
  assert.equal(chunksOf(png.subarray(0, png.length - 2)), null)
})

test('a chunk written here carries the CRC zlib computes', () => {
  const written = pngChunk('tRNS', Uint8Array.from([0, 128, 255]))

  assert.deepEqual(
    Buffer.from(written),
    chunk('tRNS', Buffer.from([0, 128, 255])),
  )
})

test('a PNG rewritten with one chunk replaced keeps every other byte', () => {
  const png = onePixel()
  const chunks = chunksOf(png)!
  const replaced = rewritten(
    png,
    chunks,
    new Map([[chunks[1], pngChunk('PLTE', Uint8Array.from([1, 2, 3]))]]),
  )
  const read = chunksOf(replaced)!

  assert.equal(replaced.length, png.length)
  assert.deepEqual([...dataOf(replaced, read[1])], [1, 2, 3])
  assert.deepEqual(
    Buffer.from(dataOf(replaced, read[2])),
    Buffer.from(dataOf(png, chunks[2])),
  )
})
