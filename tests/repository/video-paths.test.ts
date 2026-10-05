import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
  PLAYBACK_PROFILES,
  videoPictureHref,
  WHEN_CARRYING_A_SOUND,
  whyItRefused,
} from '@/repository/video-paths'

const playParameters = (() => {
  const document: unknown = JSON.parse(
    readFileSync(
      new URL('../../repository/client/carina.json', import.meta.url),
      'utf8',
    ),
  )

  return (
    document as {
      paths: Record<
        string,
        {
          get: {
            parameters: {
              name: string
              description?: string
              schema: { enum?: string[]; default?: string }
            }[]
          }
        }
      >
    }
  ).paths['/api/videos/{id}/play'].get.parameters
})()

function parameterOfPlay(named: string) {
  const found = playParameters.find((one) => one.name === named)

  assert.ok(found, `the endpoint that plays a recording takes ${named}`)

  return found
}

const profileParameter = parameterOfPlay('profile')

const fromParameter = parameterOfPlay('from')

test('the profiles offered are the ones the endpoint accepts', () => {
  assert.deepEqual([...PLAYBACK_PROFILES], profileParameter.schema.enum)
})

test('the endpoint pins no profile, so the machine is what answers', () => {
  assert.equal(profileParameter.schema.default, undefined)
})

test('the endpoint sends the unasked profile to the live list', () => {
  assert.match(profileParameter.description ?? '', /\/api\/live\/profiles/)
})

test('a sound the recording does not carry is refused in Japanese', () => {
  const said = whyItRefused(
    WHEN_CARRYING_A_SOUND,
    400,
    'The broadcast this recording was made from did not carry the sound ' +
      'asked for, so there is nothing of it to play.',
  )

  assert.equal(
    said,
    'この録画のもとになった放送は選んだ音声を運んでいないため、再生できませんでした。',
  )
  assert.doesNotMatch(said, /[A-Za-z]/)
})

test('every reason the play endpoint gives for a sound is answered in Japanese', () => {
  const heard = [
    'A recording handed over as it is carries the one sound it was encoded ' +
      'with, so there is no sound to choose. Ask for it without naming a sound.',
    'A recording is played with one of the sounds main, secondary, third, ' +
      'or with the main one when none is named, and with no other.',
    'The sounds this recording carries could not be read: ffprobe said nothing.',
  ]

  for (const one of heard) {
    assert.doesNotMatch(
      whyItRefused(WHEN_CARRYING_A_SOUND, 400, one),
      /[A-Za-z]/,
    )
  }
})

test('a reason this build has never heard is still said in Japanese, with the status', () => {
  const said = whyItRefused(WHEN_CARRYING_A_SOUND, 418, 'I am a teapot')

  assert.equal(
    said,
    '再生を開始できませんでした。時間をおいてからもう一度お試しください。',
  )
  assert.doesNotMatch(said, /teapot/)
})

test('a picture transcoded as it plays carries the profile and the sound', () => {
  assert.equal(
    videoPictureHref('1266', 90, '720p60', 'secondary'),
    '/api/videos/1266/play?from=90&profile=720p60&sound=secondary',
  )
})

test('the picture is asked for with what the browser told the plan it decodes', () => {
  assert.equal(
    videoPictureHref('1266', 0, undefined, 'main', 'artefact', ['h265']),
    '/api/videos/1266/play?from=0&sound=main&source=artefact&decodes=h265',
  )
})

test('an artefact handed over as it is carries the sound too, with no profile', () => {
  assert.equal(
    videoPictureHref('1266', 0, undefined, 'main'),
    '/api/videos/1266/play?from=0&sound=main',
  )
})

test('a recording with one sound to play asks for the picture as it always did', () => {
  assert.equal(
    videoPictureHref('1266', 0, '720p60'),
    '/api/videos/1266/play?from=0&profile=720p60',
  )
})

test('naming no second is what the endpoint answers from the position it remembers', () => {
  assert.match(
    fromParameter.description ?? '',
    /Asking for none starts where this reader last left this recording/,
  )
})

test('naming zero is what the endpoint takes as the beginning, whatever it remembers', () => {
  assert.match(
    fromParameter.description ?? '',
    /asking for zero starts at the beginning whatever was left/,
  )
})

test('every picture asked for names the second it starts at, so the remembered position never moves it', () => {
  for (const href of [
    videoPictureHref('1266'),
    videoPictureHref('1266', 0),
    videoPictureHref('1266', 612, '720p60', 'main'),
  ]) {
    assert.match(href, /[?&]from=\d/)
  }
})

test('a picture of the recording itself names that as the source it asks for', () => {
  assert.equal(
    videoPictureHref('1266', 90, '720p60', 'main', 'recording'),
    '/api/videos/1266/play?from=90&profile=720p60&sound=main&source=recording',
  )
})

test('a picture of the artefact names that as the source it asks for', () => {
  assert.equal(
    videoPictureHref('1274', 0, undefined, undefined, 'artefact'),
    '/api/videos/1274/play?from=0&source=artefact',
  )
})

test('a picture asked for without a source is asked for as it always was', () => {
  assert.equal(
    videoPictureHref('1266', 90, '720p60', 'main'),
    '/api/videos/1266/play?from=90&profile=720p60&sound=main',
  )
})
