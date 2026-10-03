import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { NOT_YET_IN_THIS_BUILD } from '@/lib/not-yet-in-this-build'
import { liveWireHref } from '@/repository/live-paths'
import {
  EVERY_SOUND,
  MAIN_SOUND,
  soundLabel,
  soundsAnnounced,
  soundsOnAir,
  splitsDualMono,
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
  assert.deepEqual([...EVERY_SOUND], soundParameter.schema.enum)
})

test('the sound a request that names none carries is the one held as the main', () => {
  assert.equal(soundParameter.schema.default, MAIN_SOUND)
})

test('a programme carried on two sounds offers both of them', () => {
  assert.deepEqual([...soundsAnnounced(2)], ['main', 'secondary'])
})

test('a programme carried on one sound offers nothing to choose between', () => {
  assert.deepEqual([...soundsAnnounced(1)], [MAIN_SOUND])
})

test('a programme that announced no sound at all offers none', () => {
  assert.deepEqual([...soundsAnnounced(0)], [])
})

test('a count larger than the sounds this build names offers only the ones it names', () => {
  assert.deepEqual([...soundsAnnounced(5)], ['main', 'secondary'])
})

test('a bilingual programme on one sound offers both sides of it', () => {
  assert.deepEqual([...soundsOnAir(1, 'dualMono')], ['main', 'secondary'])
  assert.equal(splitsDualMono(1, 'dualMono'), true)
})

test('a programme on one sound that is not bilingual offers nothing to choose between', () => {
  for (const audio of ['mono', 'stereo', 'surround', 'undetermined'] as const) {
    assert.deepEqual([...soundsOnAir(1, audio)], [MAIN_SOUND])
    assert.equal(splitsDualMono(1, audio), false)
  }
})

test('a bilingual programme that also carries a second sound offers both sides of the main sound and the second sound', () => {
  assert.deepEqual(
    [...soundsOnAir(2, 'dualMono')],
    ['main', 'secondary', 'third'],
  )
  assert.deepEqual([...soundsOnAir(3, 'dualMono')], [...EVERY_SOUND])
  assert.equal(splitsDualMono(2, 'dualMono'), true)
})

test('two sounds that are not bilingual offer the two of them, carried as they come', () => {
  for (const audio of ['mono', 'stereo', 'surround', 'undetermined'] as const) {
    assert.deepEqual([...soundsOnAir(2, audio)], ['main', 'secondary'])
    assert.equal(splitsDualMono(2, audio), false)
  }
})

test('a bilingual programme that announced no sound offers none', () => {
  assert.deepEqual([...soundsOnAir(0, 'dualMono')], [])
  assert.equal(splitsDualMono(0, 'dualMono'), false)
})

test('each sound is named in Japanese', () => {
  assert.equal(soundLabel('main'), '主音声')
  assert.equal(soundLabel('secondary'), '副音声')
  assert.equal(soundLabel('third'), '第2音声')
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

test('a recording is asked for with the third sound by its name', () => {
  assert.equal(
    videoPictureHref('1266', 12, '1080p60', 'third'),
    '/api/videos/1266/play?from=12&profile=1080p60&sound=third',
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
  assert.equal(
    liveWireHref(32736, 1024, '1080p60', 'third'),
    '/api/live/ws?network=32736&service=1024&profile=1080p60&sound=third',
  )
})
