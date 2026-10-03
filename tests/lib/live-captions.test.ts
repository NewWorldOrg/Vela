import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PTS_HERTZ } from '@/lib/live-wire'
import { CaptionQueue } from '@/lib/live-captions'

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
