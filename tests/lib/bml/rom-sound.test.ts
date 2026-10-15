import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ROM_SOUND_COUNT, isRomSound, romSoundOf } from '@/lib/bml/rom-sound'

test('a receiver holds sixteen built-in sounds, numbered from 0', () => {
  assert.equal(ROM_SOUND_COUNT, 16)
  assert.equal(isRomSound(0), true)
  assert.equal(isRomSound(15), true)
  assert.equal(isRomSound(16), false)
  assert.equal(isRomSound(-1), false)
  assert.equal(isRomSound(2.5), false)
  assert.equal(isRomSound('3'), false)
  assert.equal(isRomSound(Number.NaN), false)
})

test('a built-in sound is named by romsound:// and its number', () => {
  assert.equal(romSoundOf('romsound://0'), 0)
  assert.equal(romSoundOf('romsound://7'), 7)
  assert.equal(romSoundOf('romsound://15'), 15)
  assert.equal(romSoundOf('romsound://03'), 3)
  assert.equal(romSoundOf('ROMSOUND://9'), 9)
  assert.equal(romSoundOf(' romsound://4 '), 4)
})

test('anything else names no built-in sound', () => {
  assert.equal(romSoundOf('romsound://16'), null)
  assert.equal(romSoundOf('romsound://-1'), null)
  assert.equal(romSoundOf('romsound://'), null)
  assert.equal(romSoundOf('romsound://1.5'), null)
  assert.equal(romSoundOf('romsound://100'), null)
  assert.equal(romSoundOf('romsound:/3'), null)
  assert.equal(romSoundOf('chime.aac'), null)
  assert.equal(romSoundOf(3), null)
  assert.equal(romSoundOf(null), null)
  assert.equal(romSoundOf(undefined), null)
})
