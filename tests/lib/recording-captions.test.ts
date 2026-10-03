import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  captionAt,
  extended,
  READS_AHEAD_WITHIN_SEC,
  standingAt,
  timelineOf,
  whatTheCaptionsNeed,
  type CaptionWindow,
  type TimedCaption,
} from '@/lib/recording-captions'

const CANVAS = { width: 1440, height: 1080 }

function said(atSec: number, tag: number): TimedCaption {
  return {
    atSec,
    picture: {
      left: 0,
      top: 0,
      width: 10,
      height: 10,
      png: new Uint8Array([tag]),
    },
  }
}

function cleared(atSec: number): TimedCaption {
  return { atSec, picture: null }
}

function windowOf(untilSec: number, cues: TimedCaption[]): CaptionWindow {
  return { canvas: CANVAS, untilSec, cues }
}

function tagOf(cue: TimedCaption | null): number | null {
  return cue?.picture ? cue.picture.png[0] : null
}

const TEN_MINUTES = windowOf(700, [
  said(95, 1),
  cleared(104),
  said(110, 2),
  said(130.5, 3),
  cleared(140),
])

test('the caption on screen is the last to have started at or before the second', () => {
  const timeline = timelineOf(TEN_MINUTES, 100)

  assert.equal(tagOf(captionAt(timeline, 100)), 1)
  assert.equal(tagOf(captionAt(timeline, 103.99)), 1)
  assert.equal(tagOf(captionAt(timeline, 125)), 2)
})

test('a caption comes up on its own second, not a moment after', () => {
  const timeline = timelineOf(TEN_MINUTES, 100)

  assert.equal(tagOf(captionAt(timeline, 130.49)), 2)
  assert.equal(tagOf(captionAt(timeline, 130.5)), 3)
})

test('where the caption was taken off there is nothing to draw', () => {
  const timeline = timelineOf(TEN_MINUTES, 100)

  assert.equal(captionAt(timeline, 104)?.picture, null)
  assert.equal(captionAt(timeline, 600)?.picture, null)
})

test('before the first caption there is nothing to draw', () => {
  const timeline = timelineOf(windowOf(600, [said(12, 1)]), 0)

  assert.equal(captionAt(timeline, 11.9), null)
  assert.equal(standingAt(timeline, 11.9), -1)
})

test('the cues are put in the order of their seconds, whatever order they came in', () => {
  const timeline = timelineOf(windowOf(600, [said(30, 2), said(10, 1)]), 0)

  assert.equal(tagOf(captionAt(timeline, 20)), 1)
  assert.equal(tagOf(captionAt(timeline, 31)), 2)
})

test('a second the captions held cover needs nothing read', () => {
  const timeline = timelineOf(TEN_MINUTES, 100)

  assert.deepEqual(whatTheCaptionsNeed(timeline, 300), { need: 'nothing' })
})

test('two minutes from the end of what is held, the next ten minutes are read', () => {
  const timeline = timelineOf(TEN_MINUTES, 100)

  assert.deepEqual(
    whatTheCaptionsNeed(timeline, 700 - READS_AHEAD_WITHIN_SEC - 0.1),
    { need: 'nothing' },
  )
  assert.deepEqual(
    whatTheCaptionsNeed(timeline, 700 - READS_AHEAD_WITHIN_SEC + 0.1),
    { need: 'ahead', fromSec: 700 },
  )
})

test('the next ten minutes are not asked for twice while they are on their way', () => {
  const timeline = timelineOf(TEN_MINUTES, 100)

  assert.deepEqual(whatTheCaptionsNeed(timeline, 650, 700), {
    need: 'nothing',
  })
})

test('a second outside what is held is read anew from that second', () => {
  const timeline = timelineOf(TEN_MINUTES, 100)

  assert.deepEqual(whatTheCaptionsNeed(timeline, 2400), {
    need: 'anew',
    fromSec: 2400,
  })
  assert.deepEqual(whatTheCaptionsNeed(timeline, 99), {
    need: 'anew',
    fromSec: 99,
  })
  assert.deepEqual(whatTheCaptionsNeed(timeline, 700), {
    need: 'anew',
    fromSec: 700,
  })
  assert.deepEqual(whatTheCaptionsNeed(null, 0), { need: 'anew', fromSec: 0 })
})

test('while a read is on its way, the seconds it will cover wait for it', () => {
  assert.deepEqual(whatTheCaptionsNeed(null, 2400.4, 2400), { need: 'wait' })
  assert.deepEqual(whatTheCaptionsNeed(null, 3000, 2400), {
    need: 'anew',
    fromSec: 3000,
  })
})

test('the next ten minutes join on where the last left off', () => {
  const timeline = extended(
    timelineOf(TEN_MINUTES, 100),
    windowOf(1300, [said(130.5, 3), cleared(140), said(705, 4), cleared(712)]),
    700,
  )

  assert.equal(timeline.untilSec, 1300)
  assert.equal(captionAt(timeline, 699)?.picture, null)
  assert.equal(tagOf(captionAt(timeline, 706)), 4)
  assert.equal(captionAt(timeline, 800)?.picture, null)
  assert.deepEqual(whatTheCaptionsNeed(timeline, 300), { need: 'nothing' })
})

test('the captions do not pile up: only the last two stretches are kept', () => {
  const twice = extended(
    timelineOf(TEN_MINUTES, 100),
    windowOf(1300, [cleared(140), said(705, 4)]),
    700,
  )
  const thrice = extended(
    twice,
    windowOf(1900, [said(705, 4), said(1350, 5)]),
    1300,
  )

  assert.equal(thrice.fromSec, 700)
  assert.equal(tagOf(captionAt(thrice, 700)), null)
  assert.equal(tagOf(captionAt(thrice, 706)), 4)
  assert.equal(tagOf(captionAt(thrice, 1351)), 5)
  assert.deepEqual(whatTheCaptionsNeed(thrice, 300), {
    need: 'anew',
    fromSec: 300,
  })
})

test('ten minutes that do not join on where the last left off are not joined', () => {
  const timeline = timelineOf(TEN_MINUTES, 100)

  assert.equal(extended(timeline, windowOf(2000, []), 1400), timeline)
})

test('an answer that covers nothing past where it was asked from leaves nothing more to read', () => {
  const timeline = timelineOf(windowOf(3600, []), 3600)

  assert.deepEqual(whatTheCaptionsNeed(timeline, 3700), { need: 'nothing' })
})
