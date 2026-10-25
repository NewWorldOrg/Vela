import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CAPTION_STYLE_COOKIE,
  PLAIN_CAPTION_STYLE,
  captionStyleOf,
  captionStyleSpelling,
  isPlain,
  isShifted,
  lookKey,
  lookOf,
  looksAsBroadcast,
  type CaptionStyle,
} from '@/lib/caption-style'
import { cookieIn } from '@/lib/stored-flag'

const EVERYTHING_CHANGED: CaptionStyle = {
  background: 'solid',
  scale: '150',
  colour: 'green',
  allOneColour: true,
  edge: 'added',
  shift: { x: -1, y: -1 },
}

test('no cookie is the broadcast’s own caption', () => {
  assert.deepEqual(captionStyleOf(undefined), PLAIN_CAPTION_STYLE)
  assert.deepEqual(captionStyleOf(''), PLAIN_CAPTION_STYLE)
  assert.equal(isPlain(PLAIN_CAPTION_STYLE), true)
})

test('only what differs from the start is written, and nothing at all when nothing does', () => {
  assert.equal(captionStyleSpelling(PLAIN_CAPTION_STYLE), undefined)
  assert.equal(
    captionStyleSpelling({ ...PLAIN_CAPTION_STYLE, background: 'none' }),
    'bn',
  )
  assert.equal(
    captionStyleSpelling({
      ...PLAIN_CAPTION_STYLE,
      scale: '125',
      shift: { x: 0, y: -0.085 },
    }),
    's125.y-85',
  )
})

test('every item read back is the item written', () => {
  const written = captionStyleSpelling(EVERYTHING_CHANGED)

  assert.deepEqual(captionStyleOf(written), EVERYTHING_CHANGED)
})

test('the longest value with its name stays well under 100 bytes', () => {
  const written = captionStyleSpelling(EVERYTHING_CHANGED) ?? ''

  assert.ok(`${CAPTION_STYLE_COOKIE}=${written}`.length < 100)
})

test('an item that cannot be read falls back on its own, and the others stand', () => {
  assert.deepEqual(captionStyleOf('bq.s125.c?.x99999.y-300.zz.a1'), {
    ...PLAIN_CAPTION_STYLE,
    scale: '125',
    allOneColour: true,
    shift: { x: 0, y: -0.3 },
  })
  assert.deepEqual(captionStyleOf('s80.x1,5.e.bx'), PLAIN_CAPTION_STYLE)
  assert.deepEqual(captionStyleOf('toString.__proto__.constructor'), {
    ...PLAIN_CAPTION_STYLE,
  })
})

test('a shift is kept to a thousandth, and one that rounds to nothing is no shift', () => {
  const style = { ...PLAIN_CAPTION_STYLE, shift: { x: 0.0004, y: 0.12345 } }

  assert.equal(captionStyleSpelling(style), 'y123')
  assert.equal(
    isShifted({ ...PLAIN_CAPTION_STYLE, shift: { x: 0.0004, y: 0 } }),
    false,
  )
})

test('the size and the shift do not change the picture, and one colour for all means nothing while the colour is the broadcast’s', () => {
  const placed = {
    ...PLAIN_CAPTION_STYLE,
    scale: '150' as const,
    shift: { x: 0.2, y: 0 },
  }

  assert.equal(looksAsBroadcast(lookOf(placed)), true)
  assert.equal(
    lookKey(lookOf({ ...PLAIN_CAPTION_STYLE, allOneColour: true })),
    lookKey(lookOf(PLAIN_CAPTION_STYLE)),
  )
  assert.notEqual(
    lookKey(
      lookOf({ ...PLAIN_CAPTION_STYLE, colour: 'white', allOneColour: true }),
    ),
    lookKey(lookOf({ ...PLAIN_CAPTION_STYLE, colour: 'white' })),
  )
})

test('names an object inherits are not values, and a broken escape in the cookie leaves the rest standing', () => {
  assert.deepEqual(
    captionStyleOf('bconstructor.c__proto__.ctoString.bhasOwnProperty'),
    PLAIN_CAPTION_STYLE,
  )
  assert.deepEqual(
    captionStyleOf(
      cookieIn('vela-caption-style=s125.%E0%A4%A.bn', CAPTION_STYLE_COOKIE),
    ),
    { ...PLAIN_CAPTION_STYLE, scale: '125', background: 'none' },
  )
})
