import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  soundToAsk,
  theLandingIsStillAhead,
  whatIsStillSaid,
  whatTheSoundBecomes,
  whereItStarts,
  type PlayerSaying,
} from '@/lib/playback-sound'
import { THE_SOUNDS_COULD_NOT_BE_READ } from '@/repository/video-paths'
import type { PlaybackPlan, PlaybackRead } from '@/repository/videos'

const TRANSCODED: PlaybackPlan = {
  standing: 'whole',
  route: 'onTheFly',
  seeking: 'byStartingAgain',
  canSeek: false,
  transcodes: true,
  showsAsAWholeRecording: true,
  mediaType: 'video/mp4',
  sounds: ['main', 'secondary'],
  chapters: [],
}

const HANDED_OVER: PlaybackPlan = {
  ...TRANSCODED,
  route: 'direct',
  seeking: 'byRange',
  canSeek: true,
  transcodes: false,
  bytes: 3_490_550_128,
}

const planned = (plan: PlaybackPlan): PlaybackRead => ({
  state: 'planned',
  plan,
})

test('a recording that offers two sounds names the one being heard', () => {
  assert.equal(soundToAsk(['main', 'secondary'], 'main'), 'main')
  assert.equal(soundToAsk(['main', 'secondary'], 'secondary'), 'secondary')
})

test('a recording with one sound to offer names none, so the URL stays as it was', () => {
  assert.equal(soundToAsk(['main'], 'main'), undefined)
  assert.equal(soundToAsk([], 'main'), undefined)
})

test('the sound is named on the route that hands the artefact over, not only on the one that transcodes', () => {
  assert.equal(soundToAsk(HANDED_OVER.sounds, 'main'), 'main')
})

test('a plan that still offers the sound asked for is the one played under', () => {
  const became = whatTheSoundBecomes(
    HANDED_OVER,
    'secondary',
    planned(TRANSCODED),
  )

  assert.deepEqual(became, { plan: TRANSCODED, sound: 'secondary' })
})

test('seeking follows the plan that came back, not the one the page opened with', () => {
  assert.equal(
    whatTheSoundBecomes(HANDED_OVER, 'secondary', planned(TRANSCODED)).plan
      .seeking,
    'byStartingAgain',
  )
  assert.equal(
    whatTheSoundBecomes(TRANSCODED, 'main', planned(HANDED_OVER)).plan.canSeek,
    true,
  )
})

test('a plan narrowed to the main sound falls back to it, and says so in Japanese', () => {
  const narrowed: PlaybackPlan = { ...HANDED_OVER, sounds: ['main'] }
  const became = whatTheSoundBecomes(
    HANDED_OVER,
    'secondary',
    planned(narrowed),
  )

  assert.deepEqual(became, {
    plan: narrowed,
    sound: 'main',
    said: THE_SOUNDS_COULD_NOT_BE_READ,
  })
  assert.doesNotMatch(became.said ?? '', /[A-Za-z]/)
})

test('a refused ask leaves the recording playing under the plan it had', () => {
  const became = whatTheSoundBecomes(HANDED_OVER, 'secondary', {
    state: 'refused',
    refusal: 'outOfReach',
  })

  assert.deepEqual(became, {
    plan: HANDED_OVER,
    sound: 'main',
    said: THE_SOUNDS_COULD_NOT_BE_READ,
  })
})

test('a plan that names no sound at all still plays its main sound', () => {
  const quiet: PlaybackPlan = { ...HANDED_OVER, sounds: [] }

  assert.deepEqual(whatTheSoundBecomes(TRANSCODED, 'main', planned(quiet)), {
    plan: quiet,
    sound: 'main',
  })
})

test('a picture that is transcoded starts where it is asked to', () => {
  assert.deepEqual(whereItStarts(TRANSCODED, 1200), { from: 1200, land: null })
})

test('an artefact handed over is opened whole and moved to the second by range', () => {
  assert.deepEqual(whereItStarts(HANDED_OVER, 1200), { from: 0, land: 1200 })
})

test('nothing is landed on when the recording opens at its beginning', () => {
  assert.deepEqual(whereItStarts(HANDED_OVER, 0), { from: 0, land: null })
})

test('the clock waits while the picture is still at the head of the artefact', () => {
  assert.equal(theLandingIsStillAhead(600, 0), true)
  assert.equal(theLandingIsStillAhead(600, 0.9), true)
})

test('the clock follows again once the picture has moved off the head', () => {
  assert.equal(theLandingIsStillAhead(600, 600), false)
  assert.equal(theLandingIsStillAhead(600, 1), false)
  assert.equal(theLandingIsStillAhead(600, 9.9), false)
})

test('a landing close to the head is waited for no longer than itself', () => {
  assert.equal(theLandingIsStillAhead(0.4, 0.3), true)
  assert.equal(theLandingIsStillAhead(0.4, 0.4), false)
})

test('nothing is waited for when the recording opens where it lies', () => {
  assert.equal(theLandingIsStillAhead(null, 0), false)
})

const CAPTURED: PlayerSaying = { text: '画面を保存しました', tone: 'ok' }

test('the message this feature put up is taken down once the sound settles', () => {
  assert.equal(
    whatIsStillSaid(
      { text: THE_SOUNDS_COULD_NOT_BE_READ, tone: 'err' },
      undefined,
    ),
    null,
  )
})

test('a message the rest of the player put up outlives a sound that settles', () => {
  assert.equal(whatIsStillSaid(CAPTURED, undefined), CAPTURED)
})

test('a sound that settles with nothing standing leaves nothing standing', () => {
  assert.equal(whatIsStillSaid(null, undefined), null)
})

test('a refusal takes the place of whatever was standing', () => {
  assert.deepEqual(whatIsStillSaid(CAPTURED, THE_SOUNDS_COULD_NOT_BE_READ), {
    text: THE_SOUNDS_COULD_NOT_BE_READ,
    tone: 'err',
  })
})
