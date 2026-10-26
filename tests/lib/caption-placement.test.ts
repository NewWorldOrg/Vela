import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CLEARANCE_MOTION,
  captionPlaced,
  containedIn,
  cubicBezier,
  liftClearOf,
  placedOn,
} from '@/lib/caption-placement'

test('a 16:9 picture in a wider box stands in the middle with black either side', () => {
  assert.deepEqual(
    containedIn({ width: 1363, height: 720 }, { width: 1280, height: 720 }),
    { left: 41.5, top: 0, width: 1280, height: 720 },
  )
})

test('a 16:9 picture in a taller box stands in the middle with black above and below', () => {
  assert.deepEqual(
    containedIn({ width: 1280, height: 800 }, { width: 1280, height: 720 }),
    { left: 0, top: 40, width: 1280, height: 720 },
  )
})

test('a picture the shape of its box fills it', () => {
  assert.deepEqual(
    containedIn({ width: 640, height: 360 }, { width: 1920, height: 1080 }),
    { left: 0, top: 0, width: 640, height: 360 },
  )
})

test('a box or a picture with no size has nowhere to stand', () => {
  assert.deepEqual(
    containedIn({ width: 0, height: 0 }, { width: 1280, height: 720 }),
    { left: 0, top: 0, width: 0, height: 0 },
  )
  assert.deepEqual(
    containedIn({ width: 1280, height: 720 }, { width: 0, height: 0 }),
    { left: 0, top: 0, width: 0, height: 0 },
  )
})

test('a caption drawn on a 1440x1080 canvas takes the stretch of a 1280x720 picture', () => {
  const shown = { left: 0, top: 0, width: 1280, height: 720 }
  const canvas = { width: 1440, height: 1080 }
  const drawn = { left: 240, top: 900, width: 960, height: 120 }
  const placed = placedOn(shown, canvas, drawn)

  assert.ok(Math.abs(placed.left - 213.333) < 0.001)
  assert.equal(placed.top, 600)
  assert.ok(Math.abs(placed.width - 853.333) < 0.001)
  assert.equal(placed.height, 80)
})

test('a caption lands inside the picture, not the box, when the picture has black around it', () => {
  const shown = containedIn(
    { width: 1363, height: 767 },
    { width: 1280, height: 720 },
  )
  const placed = placedOn(
    shown,
    { width: 1920, height: 1080 },
    { left: 0, top: 0, width: 1920, height: 1080 },
  )

  assert.deepEqual(placed, shown)
})

const SHOWN = { left: 0, top: 0, width: 1280, height: 720 }

const CANVAS = { width: 1440, height: 1080 }

const BELOW = { left: 360, top: 900, width: 720, height: 120 }

const ABOVE = { left: 360, top: 60, width: 720, height: 120 }

function near(actual: number, expected: number, what: string) {
  assert.ok(
    Math.abs(actual - expected) < 1e-6,
    `${what}: ${actual} is not ${expected}`,
  )
}

test('with nothing chosen, a caption lands exactly where the broadcast put it', () => {
  const placed = captionPlaced({ shown: SHOWN, canvas: CANVAS, drawn: BELOW })

  assert.deepEqual(placed.image, placedOn(SHOWN, CANVAS, BELOW))
  assert.deepEqual(placed.caption, placedOn(SHOWN, CANVAS, BELOW))
  assert.deepEqual(placed.shift, { x: 0, y: 0 })
})

test('a caption in the lower half grows from the middle of its bottom', () => {
  const plain = placedOn(SHOWN, CANVAS, BELOW)
  const placed = captionPlaced({
    shown: SHOWN,
    canvas: CANVAS,
    drawn: BELOW,
    scale: 1.5,
  }).caption

  near(placed.top + placed.height, plain.top + plain.height, 'bottom')
  near(placed.left + placed.width / 2, plain.left + plain.width / 2, 'middle')
  near(placed.width, plain.width * 1.5, 'width')
})

test('a caption in the upper half grows from the middle of its top', () => {
  const plain = placedOn(SHOWN, CANVAS, ABOVE)
  const placed = captionPlaced({
    shown: SHOWN,
    canvas: CANVAS,
    drawn: ABOVE,
    scale: 1.5,
  }).caption

  near(placed.top, plain.top, 'top')
  near(placed.height, plain.height * 1.5, 'height')
})

test('letters added on the right of a growing caption leave its bottom where it was', () => {
  const short = captionPlaced({
    shown: SHOWN,
    canvas: CANVAS,
    drawn: BELOW,
    scale: 1.25,
  }).caption
  const longer = captionPlaced({
    shown: SHOWN,
    canvas: CANVAS,
    drawn: { ...BELOW, width: BELOW.width + 72 },
    scale: 1.25,
  }).caption

  near(longer.top + longer.height, short.top + short.height, 'bottom')
})

test('at the largest size a caption that would leave the picture stops where it fits', () => {
  const wide = { left: 0, top: 800, width: 1300, height: 200 }
  const placed = captionPlaced({
    shown: SHOWN,
    canvas: CANVAS,
    drawn: wide,
    scale: 1.5,
  }).image

  assert.ok(placed.left >= 0 && placed.left + placed.width <= 1280 + 1e-6)
  assert.ok(placed.top >= 0 && placed.top + placed.height <= 720 + 1e-6)
  near(placed.width, 1280, 'width')
})

test('moved to the edge, a caption stops at the picture’s frame and the move stops with it', () => {
  const placed = captionPlaced({
    shown: SHOWN,
    canvas: CANVAS,
    drawn: BELOW,
    shift: { x: -1, y: 1 },
  })

  near(placed.image.left, 0, 'left')
  near(placed.image.top + placed.image.height, 720, 'bottom')
  near(placed.shift.x, -320 / 1280, 'kept across')
  near(placed.shift.y, (720 - 680) / 720, 'kept down')
})

test('a move is added to where the broadcast put the caption, so one above stays above', () => {
  const placed = captionPlaced({
    shown: SHOWN,
    canvas: CANVAS,
    drawn: ABOVE,
    shift: { x: 0.1, y: 0.05 },
  }).caption

  near(placed.left, 320 + 128, 'left')
  near(placed.top, 40 + 36, 'top')
})

test('a margin the restyled picture adds is drawn around the caption, which stays where it was', () => {
  const placed = captionPlaced({
    shown: SHOWN,
    canvas: CANVAS,
    drawn: ABOVE,
    margin: { left: 9, top: 6, right: 9, bottom: 6 },
  })

  near(placed.caption.left, 320, 'caption left')
  near(placed.image.left, 320 - 8, 'image left')
  near(placed.image.height, 80 + 8, 'image height')
})

test('in a picture with black either side, the frame a caption is kept in is the picture’s', () => {
  const shown = containedIn(
    { width: 1600, height: 720 },
    { width: 1280, height: 720 },
  )
  const placed = captionPlaced({
    shown,
    canvas: CANVAS,
    drawn: BELOW,
    shift: { x: -1, y: 0 },
  }).image

  near(placed.left, shown.left, 'left')
})

test('a caption under the control row is lifted to stand the gap above it', () => {
  const caption = { left: 320, top: 600, width: 640, height: 80 }
  const row = { left: 0, top: 640, width: 1280, height: 80 }

  assert.equal(liftClearOf(caption, SHOWN, [row]), 680 + 6 - 640)
})

test('a caption already clear, or one above what lies over the picture, is not lifted', () => {
  const row = { left: 0, top: 640, width: 1280, height: 80 }

  assert.equal(
    liftClearOf({ left: 320, top: 500, width: 640, height: 80 }, SHOWN, [row]),
    0,
  )
  assert.equal(
    liftClearOf({ left: 320, top: 40, width: 640, height: 80 }, SHOWN, [row]),
    0,
  )
})

test('the skip is cleared only by a caption it overlaps across', () => {
  const row = { left: 0, top: 640, width: 1280, height: 80 }
  const skip = { left: 1100, top: 560, width: 160, height: 36 }

  assert.equal(
    liftClearOf({ left: 320, top: 600, width: 640, height: 80 }, SHOWN, [
      row,
      skip,
    ]),
    46,
  )
  assert.equal(
    liftClearOf({ left: 320, top: 600, width: 860, height: 80 }, SHOWN, [
      row,
      skip,
    ]),
    680 + 6 - 560,
  )
})

test('a caption is never lifted past the picture’s top, so its letters are not cut', () => {
  const tall = { left: 0, top: 20, width: 1280, height: 680 }
  const row = { left: 0, top: 600, width: 1280, height: 120 }

  assert.equal(liftClearOf(tall, SHOWN, [row]), 20)
})

test('the control row’s curves start at nothing, end whole and only rise', () => {
  const { rise, fall } = CLEARANCE_MOTION
  let last = 0

  assert.equal(rise.ease(0), 0)
  assert.equal(rise.ease(1), 1)
  assert.ok(rise.ease(0.2) > 0.2 && fall.ease(0.2) < 0.2)

  for (let time = 0; time <= 1; time += 0.05) {
    assert.ok(rise.ease(time) >= last)
    last = rise.ease(time)
  }

  near(cubicBezier(0.25, 0.25, 0.75, 0.75)(0.4), 0.4, 'a straight curve')
})
