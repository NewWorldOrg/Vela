import assert from 'node:assert/strict'
import { test } from 'node:test'

import { containedIn, placedOn } from '@/lib/caption-placement'

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
