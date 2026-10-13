import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inflateSync } from 'node:zlib'

import {
  FOREVER,
  MNG_LIMITS,
  isMng,
  paintedWith,
  readMng,
  updatesOf,
  type MngAnimation,
  type MngUpdate,
} from '@/lib/bml/mng'
import { paletteOf } from '@/lib/bml/palette'
import {
  MEND,
  PNG_SIGNATURE,
  chunk,
  defi,
  endl,
  fram,
  indexedPicture,
  loop,
  mhdr,
  mng,
  picture,
  term,
  u32,
} from '@/tests/lib/bml/mng-files'

function animationOf(bytes: Uint8Array): MngAnimation {
  const reading = readMng(bytes)

  assert.equal(
    reading.read,
    'mng',
    reading.read === 'malformed' ? reading.why : '',
  )

  return (reading as { mng: MngAnimation }).mng
}

function malformed(bytes: Uint8Array): string {
  const reading = readMng(bytes)

  assert.equal(reading.read, 'malformed')

  return (reading as { why: string }).why
}

/** The first updates of an animation, written short: which images at which places, whether the frame was cleared first, and for how long it stays. */
function played(animation: MngAnimation, most = 20): string[] {
  const told: string[] = []

  for (const update of updatesOf(animation)) {
    told.push(said(update))

    if (told.length >= most) {
      break
    }
  }

  return told
}

function said(update: MngUpdate): string {
  const draws = update.draws.map(
    (draw) =>
      `${draw.image}@${draw.x},${draw.y}` +
      (draw.clip.left === 0 &&
      draw.clip.top === 0 &&
      draw.clip.right === 40 &&
      draw.clip.bottom === 30
        ? ''
        : `[${draw.clip.left},${draw.clip.top},${draw.clip.right},${draw.clip.bottom}]`),
  )

  return `${update.clear ? 'clear ' : ''}${draws.join('+') || '-'} ${update.delayMs}`
}

test('an MNG is known by its signature, a PNG is not one', () => {
  assert.equal(isMng(mng(mhdr(40, 30), MEND)), true)
  assert.equal(isMng(new Uint8Array(PNG_SIGNATURE)), false)
  assert.equal(isMng(new Uint8Array([0x8a, 0x4d])), false)
})

test('three frames with delays of their own: each embedded PNG becomes a PNG file of its own, and each stays as long as its FRAM says', () => {
  const animation = animationOf(
    mng(
      mhdr(40, 30, 100),
      fram({ mode: 1, delay: 10, lasting: true }),
      picture(40, 30, [255, 0, 0, 255]),
      fram({ delay: 50 }),
      picture(20, 10, [0, 255, 0, 255]),
      fram({ delay: 25 }),
      picture(40, 30, [0, 0, 255, 255]),
      fram(),
      picture(40, 30, [0, 0, 255, 255]),
      MEND,
    ),
  )

  assert.equal(animation.width, 40)
  assert.equal(animation.height, 30)
  assert.equal(animation.images.length, 4)
  assert.deepEqual(
    animation.images.map((image) => [image.width, image.height]),
    [
      [40, 30],
      [20, 10],
      [40, 30],
      [40, 30],
    ],
  )
  assert.equal(animation.pixels, 40 * 30 * 3 + 20 * 10)

  const second = Buffer.from(animation.images[1].png)

  assert.deepEqual(second.subarray(0, 8), PNG_SIGNATURE)
  assert.deepEqual(
    second.subarray(8),
    Buffer.concat(picture(20, 10, [0, 255, 0, 255])),
  )
  assert.equal(
    inflateSync(second.subarray(8 + 25 + 8, second.length - 16)).length,
    10 * 81,
  )

  assert.deepEqual(played(animation), [
    'clear 0@0,0 100',
    '1@0,0 500',
    '2@0,0 250',
    '3@0,0 100',
  ])
})

test('without a FRAM, each image is a frame of one tick, layered over the one before', () => {
  const animation = animationOf(
    mng(mhdr(40, 30, 50), picture(40, 30), picture(10, 10), MEND),
  )

  assert.deepEqual(played(animation), ['clear 0@0,0 20', '1@0,0 20'])
})

test('a TERM that repeats for ever starts each round on a cleared frame, and the last frame of a round stays for the longer of its own delay and the TERM’s', () => {
  const animation = animationOf(
    mng(
      mhdr(40, 30, 100),
      term(3, 0, 20, FOREVER),
      fram({ mode: 1, delay: 10, lasting: true }),
      picture(40, 30),
      picture(40, 30),
      MEND,
    ),
  )

  assert.deepEqual(played(animation, 6), [
    'clear 0@0,0 100',
    '1@0,0 200',
    'clear 0@0,0 100',
    '1@0,0 200',
    'clear 0@0,0 100',
    '1@0,0 200',
  ])

  const shorter = animationOf(
    mng(
      mhdr(40, 30, 100),
      term(3, 0, 5, FOREVER),
      fram({ mode: 1, delay: 10, lasting: true }),
      picture(40, 30),
      MEND,
    ),
  )

  assert.deepEqual(played(shorter, 2), ['clear 0@0,0 100', 'clear 0@0,0 100'])

  const none = animationOf(
    mng(
      mhdr(40, 30, 100),
      term(3, 0, 0, FOREVER),
      fram({ mode: 1, delay: 0, lasting: true }),
      picture(40, 30),
      MEND,
    ),
  )

  assert.deepEqual(played(none, 2), ['clear 0@0,0 10', 'clear 0@0,0 10'])
})

test('a TERM that repeats a number of times then does what it says after the last round', () => {
  const frames = [
    fram({ mode: 1, delay: 10, lasting: true }),
    picture(40, 30),
    picture(40, 30),
    MEND,
  ]

  assert.deepEqual(
    played(animationOf(mng(mhdr(40, 30), term(3, 1, 0, 2), ...frames))),
    [
      'clear 0@0,0 100',
      '1@0,0 100',
      'clear 0@0,0 100',
      '1@0,0 100',
      'clear - 0',
    ],
  )
  assert.deepEqual(
    played(animationOf(mng(mhdr(40, 30), term(3, 2, 0, 2), ...frames))),
    [
      'clear 0@0,0 100',
      '1@0,0 100',
      'clear 0@0,0 100',
      '1@0,0 100',
      'clear 0@0,0 0',
    ],
  )
  assert.deepEqual(played(animationOf(mng(mhdr(40, 30), term(0), ...frames))), [
    'clear 0@0,0 100',
    '1@0,0 100',
  ])
  assert.deepEqual(played(animationOf(mng(mhdr(40, 30), term(1), ...frames))), [
    'clear 0@0,0 100',
    '1@0,0 100',
    'clear - 0',
  ])
})

test('a LOOP repeats what lies before its ENDL, nested loops inside it, and one for ever does not end', () => {
  const nested = animationOf(
    mng(
      mhdr(40, 30, 100),
      fram({ mode: 1, delay: 10, lasting: true }),
      picture(40, 30),
      loop(0, 2),
      picture(40, 30),
      loop(1, 2),
      picture(40, 30),
      endl(1),
      endl(0),
      MEND,
    ),
  )

  assert.deepEqual(
    played(nested).map((line) => line.split(' ').at(-2)),
    ['0@0,0', '1@0,0', '2@0,0', '2@0,0', '1@0,0', '2@0,0', '2@0,0'],
  )

  const endless = animationOf(
    mng(
      mhdr(40, 30),
      loop(0, FOREVER),
      picture(40, 30),
      picture(40, 30),
      endl(0),
      MEND,
    ),
  )

  assert.equal(played(endless, 50).length, 50)
  assert.deepEqual(
    animationOf(mng(mhdr(40, 30), loop(0, 0), picture(40, 30), endl(0), MEND))
      .steps.length,
    3,
  )
  assert.deepEqual(
    played(
      animationOf(
        mng(
          mhdr(40, 30),
          loop(0, 0),
          picture(40, 30),
          endl(0),
          picture(40, 30),
          MEND,
        ),
      ),
    ),
    ['clear 1@0,0 10'],
  )
})

test('a loop for ever that shows nothing ends rather than spinning', () => {
  const animation = animationOf(
    mng(
      mhdr(40, 30),
      loop(0, FOREVER),
      fram({ mode: 1 }),
      endl(0),
      picture(40, 30),
      MEND,
    ),
  )

  assert.deepEqual(played(animation), ['clear 0@0,0 10'])
})

test('a DEFI places the next image, clips it to its boundaries and may hide it; the image after it is back at the origin', () => {
  const animation = animationOf(
    mng(
      mhdr(40, 30, 100),
      defi(5, -3),
      picture(10, 10),
      defi(12, 8, { clip: [14, 30, 0, 12] }),
      picture(10, 10),
      defi(1, 1, { hidden: true }),
      picture(10, 10),
      picture(10, 10),
      MEND,
    ),
  )

  assert.deepEqual(played(animation), [
    'clear 0@5,-3 10',
    '1@12,8[14,0,30,12] 10',
    '3@0,0 10',
  ])
})

test('the framing modes: 2 layers a subframe without clearing, 3 clears before each image, 4 clears once before each subframe and shows an empty one as a cleared frame', () => {
  const images = [picture(40, 30), picture(40, 30)]

  assert.deepEqual(
    played(
      animationOf(
        mng(
          mhdr(40, 30),
          fram({ mode: 2, delay: 5, lasting: true }),
          ...images,
          fram(),
          ...images,
          MEND,
        ),
      ),
    ),
    ['clear 0@0,0+1@0,0 50', '2@0,0+3@0,0 50'],
  )
  assert.deepEqual(
    played(
      animationOf(
        mng(
          mhdr(40, 30),
          fram({ mode: 3, delay: 5, lasting: true }),
          ...images,
          fram(),
          fram(),
          MEND,
        ),
      ),
    ),
    ['clear 0@0,0 50', 'clear 1@0,0 50', 'clear - 50'],
  )
  assert.deepEqual(
    played(
      animationOf(
        mng(
          mhdr(40, 30),
          fram({ mode: 4, delay: 5, lasting: true }),
          ...images,
          fram(),
          fram(),
          ...images,
          fram(),
          MEND,
        ),
      ),
    ),
    ['clear 0@0,0+1@0,0 50', 'clear - 50', 'clear 2@0,0+3@0,0 50'],
  )
})

test('a FRAM clips the layers of its subframe, or of every one after it, and may move the boundaries by a delta', () => {
  const animation = animationOf(
    mng(
      mhdr(40, 30, 100),
      fram({ mode: 1, clip: { left: 0, right: 20, top: 0, bottom: 30 } }),
      picture(40, 30),
      fram({ clip: { left: 5, right: 40, top: 5, bottom: 30, lasting: true } }),
      picture(40, 30),
      fram({ clip: { delta: true, left: 1, right: -1, top: 1, bottom: -1 } }),
      picture(40, 30),
      fram(),
      picture(40, 30),
      MEND,
    ),
  )

  assert.deepEqual(played(animation), [
    'clear 0@0,0[0,0,20,30] 10',
    '1@0,0[5,5,40,30] 10',
    '2@0,0[6,6,39,29] 10',
    '3@0,0[5,5,40,30] 10',
  ])
})

test('no ticks in a second shows the first frame and nothing after it', () => {
  const animation = animationOf(
    mng(mhdr(40, 30, 0), picture(40, 30), picture(40, 30), MEND),
  )

  assert.deepEqual(played(animation), ['clear 0@0,0 0'])
})

test('chunks it does not draw are left out and named once each', () => {
  const reading = readMng(
    mng(
      mhdr(40, 30),
      chunk('tEXt', Buffer.from('a\0b')),
      chunk('BACK', Buffer.alloc(6)),
      chunk('tEXt', Buffer.from('c\0d')),
      picture(40, 30),
      MEND,
    ),
  )

  assert.equal(reading.read, 'mng')
  assert.deepEqual((reading as { ignored: string[] }).ignored, ['tEXt', 'BACK'])
})

test('anything after MEND is not read', () => {
  assert.equal(
    animationOf(
      mng(mhdr(40, 30), picture(40, 30), MEND, Buffer.from([1, 2, 3])),
    ).images.length,
    1,
  )
})

test('a chunk whose CRC does not match makes the whole MNG malformed', () => {
  const bytes = mng(mhdr(40, 30), picture(40, 30), MEND)
  const idat = Buffer.from(bytes).indexOf('IDAT')

  bytes[idat + 6] ^= 0xff

  assert.match(malformed(bytes), /CRC/)
})

test('an MHDR past the largest frame, or of no size, is malformed', () => {
  assert.match(malformed(mng(mhdr(4096, 4096), MEND)), /frame/)
  assert.match(malformed(mng(mhdr(MNG_LIMITS.width + 1, 30), MEND)), /frame/)
  assert.match(malformed(mng(mhdr(0, 30), MEND)), /frame/)
})

test('an image larger than the frame, too many images, or too many pixels in all is malformed', () => {
  assert.match(malformed(mng(mhdr(40, 30), picture(41, 30), MEND)), /larger/)

  const many = Array.from({ length: MNG_LIMITS.images + 1 }, () =>
    picture(1, 1),
  )

  assert.match(malformed(mng(mhdr(40, 30), ...many, MEND)), /images/)

  const side = 1024
  const big = Array.from(
    { length: MNG_LIMITS.pixels / (side * side) + 1 },
    () => [
      chunk(
        'IHDR',
        Buffer.concat([u32(side), u32(side), Buffer.from([8, 6, 0, 0, 0])]),
      ),
      chunk('IDAT', Buffer.from([0])),
      chunk('IEND'),
    ],
  )

  assert.match(malformed(mng(mhdr(1920, 1080), ...big, MEND)), /pixels/)
})

test('more bytes than an MNG may have is malformed before anything is read', () => {
  assert.match(
    malformed(
      mng(mhdr(40, 30), chunk('tEXt', Buffer.alloc(MNG_LIMITS.bytes)), MEND),
    ),
    /large/,
  )
})

test('what does not hold together is malformed: no MHDR first, no MEND, a cut chunk, an image without IEND or IDAT, an ENDL without its LOOP, a LOOP left open, a framing mode past 4', () => {
  assert.match(malformed(new Uint8Array(PNG_SIGNATURE)), /MNG/)
  assert.match(malformed(mng(picture(40, 30), MEND)), /MHDR/)
  assert.match(malformed(mng(mhdr(40, 30), picture(40, 30))), /MEND/)
  assert.match(
    malformed(mng(mhdr(40, 30), MEND).subarray(0, 8 + 20)),
    /past the end/,
  )
  assert.match(
    malformed(mng(mhdr(40, 30), picture(40, 30).slice(0, 2), MEND)),
    /IEND/,
  )
  assert.match(
    malformed(
      mng(
        mhdr(40, 30),
        chunk(
          'IHDR',
          Buffer.concat([u32(1), u32(1), Buffer.from([8, 6, 0, 0, 0])]),
        ),
        chunk('IEND'),
        MEND,
      ),
    ),
    /IDAT/,
  )
  assert.match(malformed(mng(mhdr(40, 30), endl(0), MEND)), /ENDL/)
  assert.match(malformed(mng(mhdr(40, 30), loop(0, 2), MEND)), /LOOP/)
  assert.match(malformed(mng(mhdr(40, 30), loop(0, 2), endl(1), MEND)), /ENDL/)
  assert.match(
    malformed(mng(mhdr(40, 30), fram({ mode: 5 }), MEND)),
    /framing mode/,
  )
  assert.match(
    malformed(mng(mhdr(40, 30), chunk('DEFI', Buffer.alloc(5)), MEND)),
    /DEFI/,
  )
  assert.match(
    malformed(mng(mhdr(40, 30), chunk('TERM', Buffer.from([3])), MEND)),
    /TERM/,
  )
})

test('loops nested deeper than the limit are malformed', () => {
  const depth = MNG_LIMITS.nesting + 1
  const opened = Array.from({ length: depth }, (_, at) => loop(at, 2))
  const closed = Array.from({ length: depth }, (_, at) => endl(depth - 1 - at))

  assert.match(malformed(mng(mhdr(40, 30), ...opened, ...closed, MEND)), /deep/)
})

test('an indexed image that leaves its palette to the document is given the document’s', () => {
  const animation = animationOf(mng(mhdr(40, 30), indexedPicture(), MEND))
  const painted = paintedWith(animation, paletteOf(null))
  const bytes = Buffer.from(painted.images[0].png)

  assert.equal(Buffer.from(animation.images[0].png).indexOf('PLTE'), -1)
  assert.notEqual(bytes.indexOf('PLTE'), -1)
  assert.notEqual(bytes.indexOf('tRNS'), -1)
  assert.equal(painted.steps, animation.steps)
})
