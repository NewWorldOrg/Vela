import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PTS_HERTZ } from './live-wire.ts'
import { CaptionQueue, containedIn, placedOn } from './live-captions.ts'

const at = (seconds: number) => seconds * PTS_HERTZ

test('a caption is not shown until the playhead reaches its stamp', () => {
  const queue = new CaptionQueue<string>()

  queue.offer({ pts: at(100), picture: 'a' })

  assert.equal(queue.take(99.9), undefined)
  assert.deepEqual(queue.take(100), { pts: at(100), picture: 'a' })
  assert.equal(queue.take(100.5), undefined)
})

test('captions come out in the order of the clock, whatever order they arrived in', () => {
  const queue = new CaptionQueue<string>()

  queue.offer({ pts: at(102), picture: 'later' })
  queue.offer({ pts: at(101), picture: 'earlier' })

  assert.deepEqual(queue.take(101), { pts: at(101), picture: 'earlier' })
  assert.deepEqual(queue.take(102), { pts: at(102), picture: 'later' })
})

test('when several are due at once, the last is what the screen shows', () => {
  const queue = new CaptionQueue<string>()

  queue.offer({ pts: at(10), picture: 'first' })
  queue.offer({ pts: at(11), picture: 'second' })
  queue.offer({ pts: at(12), picture: 'third' })
  queue.offer({ pts: at(20), picture: 'far off' })

  assert.deepEqual(queue.take(12), { pts: at(12), picture: 'third' })
  assert.equal(queue.length, 1)
})

test('a caption taken off is a cue with nothing to show', () => {
  const queue = new CaptionQueue<string>()

  queue.offer({ pts: at(5), picture: 'shown' })
  queue.offer({ pts: at(7), picture: null })

  assert.deepEqual(queue.take(5), { pts: at(5), picture: 'shown' })
  assert.deepEqual(queue.take(7), { pts: at(7), picture: null })
})

test('a stamp already behind the playhead is due the moment it arrives', () => {
  const queue = new CaptionQueue<string>()

  queue.offer({ pts: at(13_990), picture: 'what is showing now' })

  assert.deepEqual(queue.take(13_991.9), {
    pts: at(13_990),
    picture: 'what is showing now',
  })
})

test('two stamps alike keep the order they arrived in', () => {
  const queue = new CaptionQueue<string>()

  queue.offer({ pts: at(1), picture: 'first' })
  queue.offer({ pts: at(1), picture: 'second' })

  assert.deepEqual(queue.take(1), { pts: at(1), picture: 'second' })
})

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
