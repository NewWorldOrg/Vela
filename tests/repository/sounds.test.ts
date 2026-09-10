import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { NOT_YET_IN_THIS_BUILD } from '@/lib/not-yet-in-this-build'
import { liveWireHref } from '@/repository/live-paths'
import {
  BOTH_SOUNDS,
  MAIN_SOUND,
  soundLabel,
  type SoundTrack,
} from '@/repository/sounds'
import { videoPictureHref } from '@/repository/video-paths'

const soundParameter = (() => {
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
              schema: { enum?: string[]; default?: string }
            }[]
          }
        }
      >
    }
  ).paths['/api/videos/{id}/play'].get.parameters.find(
    (one) => one.name === 'sound',
  )

  assert.ok(found, 'the endpoint that plays a recording takes a sound')

  return found
})()

test('the sounds offered are the ones the endpoint accepts', () => {
  assert.deepEqual([...BOTH_SOUNDS], soundParameter.schema.enum)
})

test('the sound a request that names none carries is the one held as the main', () => {
  assert.equal(soundParameter.schema.default, MAIN_SOUND)
})

test('each sound is named in Japanese', () => {
  assert.equal(soundLabel('main'), '主音声')
  assert.equal(soundLabel('secondary'), '副音声')
})

test('a sound this build has no name for is not shown as it arrived', () => {
  const said = soundLabel('surround' as SoundTrack)

  assert.equal(said, NOT_YET_IN_THIS_BUILD)
  assert.doesNotMatch(said, /surround/)
})

test('a recording is asked for with the sound it is to carry', () => {
  assert.equal(
    videoPictureHref('1266', 12, '1080p60', 'secondary'),
    '/api/videos/1266/play?from=12&profile=1080p60&sound=secondary',
  )
})

test('a recording asked for without a sound names none, and so carries the main one', () => {
  assert.equal(
    videoPictureHref('1266', 12, '1080p60'),
    '/api/videos/1266/play?from=12&profile=1080p60',
  )
})

test('a wire is asked for with the sound it is to carry', () => {
  assert.equal(
    liveWireHref(32736, 1024, '1080p60', 'secondary'),
    '/api/live/ws?network=32736&service=1024&profile=1080p60&sound=secondary',
  )
  assert.equal(
    liveWireHref(32736, 1024, '1080p60', 'main'),
    '/api/live/ws?network=32736&service=1024&profile=1080p60&sound=main',
  )
})
