import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { NOT_YET_IN_THIS_BUILD } from '@/lib/not-yet-in-this-build'
import {
  audioSaying,
  secondSoundSaying,
  videoSaying,
  type AudioMode,
  type VideoMode,
} from '@/repository/announced'

const vocabulary = (schema: string): string[] => {
  const document: unknown = JSON.parse(
    readFileSync(
      new URL('../../repository/client/carina.json', import.meta.url),
      'utf8',
    ),
  )
  const named = (
    document as { components: { schemas: Record<string, { enum?: string[] }> } }
  ).components.schemas[schema]?.enum

  assert.ok(named, `${schema} is not an enum the generated client carries`)

  return named
}

test('every picture the broadcast can announce is said in Japanese or said as nothing', () => {
  for (const value of vocabulary('VideoMode')) {
    const said = videoSaying(value as VideoMode)

    assert.notEqual(said, NOT_YET_IN_THIS_BUILD, `${value} has no saying`)
  }
})

test('every sound the broadcast can announce is said in Japanese or said as nothing', () => {
  for (const value of vocabulary('AudioMode')) {
    const said = audioSaying(value as AudioMode)

    assert.notEqual(said, NOT_YET_IN_THIS_BUILD, `${value} has no saying`)
  }
})

test('what the broadcast did not announce is shown as nothing rather than as a word', () => {
  assert.equal(videoSaying('undetermined'), undefined)
  assert.equal(audioSaying('undetermined'), undefined)
  assert.equal(videoSaying(undefined), undefined)
  assert.equal(audioSaying(undefined), undefined)
})

test('the picture and the sound are said the way a viewer reads them', () => {
  assert.equal(videoSaying('interlaced1080'), '1080i')
  assert.equal(videoSaying('progressive720'), '720p')
  assert.equal(audioSaying('dualMono'), '二か国語')
  assert.equal(audioSaying('surround'), '5.1ch')
})

test('a value this bundle has never heard of does not fall through as nothing', () => {
  assert.equal(
    videoSaying('progressive8640' as VideoMode),
    NOT_YET_IN_THIS_BUILD,
  )
  assert.equal(audioSaying('quadraphonic' as AudioMode), NOT_YET_IN_THIS_BUILD)
})

test('a second sound is only said when the broadcast announced more than one', () => {
  assert.equal(secondSoundSaying(2), '副音声あり')
  assert.equal(secondSoundSaying(3), '副音声あり')
  assert.equal(secondSoundSaying(1), undefined)
  assert.equal(secondSoundSaying(0), undefined)
  assert.equal(secondSoundSaying(undefined), undefined)
})
