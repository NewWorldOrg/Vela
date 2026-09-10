import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
  PLAYBACK_PROFILES,
  WHEN_CARRYING_A_SOUND,
  whyItRefused,
} from '@/repository/video-paths'

const profileParameter = (() => {
  const document: unknown = JSON.parse(
    readFileSync(
      new URL('../../repository/client/carina.json', import.meta.url),
      'utf8',
    ),
  )
  const found = (
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
  ).paths['/api/videos/{id}/play'].get.parameters.find(
    (one) => one.name === 'profile',
  )

  assert.ok(found, 'the endpoint that plays a recording takes a profile')

  return found
})()

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
    'The broadcast this recording was made from carried one sound, so it has ' +
      'no secondary sound to play.',
  )

  assert.equal(
    said,
    'この録画のもとになった放送は音声を 1 つしか運んでいないため、副音声を再生できません。',
  )
  assert.doesNotMatch(said, /[A-Za-z]/)
})

test('every reason the play endpoint gives for a sound is answered in Japanese', () => {
  const heard = [
    'A recording handed over as it is carries the one sound it was encoded ' +
      'with, so there is no sound to choose. Ask for it without naming a sound.',
    'A recording is played with the main sound the broadcast carried or with ' +
      'its secondary sound, and with no other.',
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

  assert.equal(said, '再生を開始できませんでした(418)。')
  assert.doesNotMatch(said, /teapot/)
})
