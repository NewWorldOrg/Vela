import assert from 'node:assert/strict'
import { test } from 'node:test'

import { whatTheAnswerSays } from '@/lib/playback-fault'
import { PLAYBACK_REFUSAL_TOO_MANY } from '@/repository/video-paths'

test('an answer the server gave in full means the browser would not play it, not that the transcode failed', () => {
  assert.equal(
    whatTheAnswerSays({ status: 200, refusal: null }, true),
    'theBrowserWouldNotPlay',
  )
})

test('an artefact handed over in full that would not play is one the browser cannot decode', () => {
  assert.equal(
    whatTheAnswerSays({ status: 206, refusal: null }, false),
    'undecodable',
  )
  assert.equal(
    whatTheAnswerSays({ status: 200, refusal: null }, false),
    'undecodable',
  )
})

test('a server that failed to answer is the transcode that failed', () => {
  assert.equal(
    whatTheAnswerSays({ status: 500, refusal: null }, true),
    'transcode',
  )
  assert.equal(
    whatTheAnswerSays({ status: 503, refusal: null }, true),
    'transcode',
  )
})

test('the refusals the server names keep their own kinds', () => {
  assert.equal(
    whatTheAnswerSays(
      { status: 503, refusal: PLAYBACK_REFUSAL_TOO_MANY },
      true,
    ),
    'tooManyAtOnce',
  )
  assert.equal(
    whatTheAnswerSays({ status: 400, refusal: null }, true),
    'refused',
  )
  assert.equal(
    whatTheAnswerSays({ status: 404, refusal: null }, true),
    'nothingToPlay',
  )
})
