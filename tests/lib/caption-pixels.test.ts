import assert from 'node:assert/strict'
import { test } from 'node:test'

import { edgeOffsets, rowBandsOf, solidBandOf } from '@/lib/caption-pixels'
import {
  edgedWithNoBand,
  maskOf,
  whiteOnASolidBand,
  whiteWithNoBand,
  yellowOnAHalfBand,
  type Rgba,
} from '@/tests/lib/caption-pictures'

const opaqueBlack = (entry: Rgba) =>
  entry[3] === 255 && Math.max(entry[0], entry[1], entry[2]) < 32

const shows = (entry: Rgba) => entry[3] > 0

test('a solid band reaching the border is found, and only its black pixels are taken', () => {
  const drawn = whiteOnASolidBand()
  const dark = maskOf(drawn, opaqueBlack)
  const band = solidBandOf(dark, drawn.width, drawn.height)

  assert.ok(band)
  assert.deepEqual(band, dark)
})

test('black edges around letters that touch the border are not a band', () => {
  const drawn = edgedWithNoBand()

  assert.equal(
    solidBandOf(maskOf(drawn, opaqueBlack), drawn.width, drawn.height),
    null,
  )
})

test('a picture with no opaque black has no solid band', () => {
  const drawn = yellowOnAHalfBand()

  assert.equal(
    solidBandOf(maskOf(drawn, opaqueBlack), drawn.width, drawn.height),
    null,
  )
})

test('a mask of the wrong length finds nothing', () => {
  assert.equal(solidBandOf(new Uint8Array(3), 2, 2), null)
  assert.deepEqual(rowBandsOf(new Uint8Array(3), 2, 2, 1), [])
})

test('a band is laid for each line, and two places far apart on one line get one each', () => {
  const drawn = whiteWithNoBand()
  const bands = rowBandsOf(maskOf(drawn, shows), drawn.width, drawn.height, 1)

  assert.deepEqual(bands, [
    { left: -3, top: -3, width: 44, height: 24 },
    { left: -3, top: 18, width: 24, height: 24 },
    { left: 79, top: 18, width: 24, height: 24 },
  ])
})

test('the margins across are narrower where a pixel is drawn wider than it is tall', () => {
  const drawn = whiteWithNoBand()
  const bands = rowBandsOf(
    maskOf(drawn, shows),
    drawn.width,
    drawn.height,
    4 / 3,
  )

  assert.equal(bands[0].left, -2)
  assert.equal(bands[0].top, -3)
})

test('an edge is two rings of sixteen around the letters, wider across where pixels are drawn narrower', () => {
  const offsets = edgeOffsets(2.25, 3)

  assert.equal(offsets.length, 32)
  assert.ok(Math.abs(Math.max(...offsets.map((one) => one.x)) - 2.25) < 1e-9)
  assert.ok(Math.abs(Math.max(...offsets.map((one) => one.y)) - 3) < 1e-9)
  assert.equal(edgeOffsets(1, 1).length, 16)
})
