import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { LiveProfile } from '../repository/live.ts'
import { unaskedIn } from './live-profiles.ts'

function profile(name: string, unasked: boolean): LiveProfile {
  const [height, frames] = name.split('p')

  return {
    name,
    width: Number(height) === 1080 ? 1920 : 1280,
    height: Number(height),
    unasked,
  }
}

/** The list as the API sends it on a machine that has a GPU to encode with. */
const WITH_A_GPU: LiveProfile[] = [
  profile('1080p60', true),
  profile('1080p30', false),
  profile('720p60', false),
  profile('720p30', false),
]

/** The same list from a machine that has none. */
const WITHOUT_ONE: LiveProfile[] = [
  profile('1080p60', false),
  profile('1080p30', false),
  profile('720p60', false),
  profile('720p30', true),
]

test('the picture opens in the profile the API marks, wherever it stands in the list', () => {
  assert.equal(unaskedIn(WITH_A_GPU), '1080p60')
  assert.equal(unaskedIn(WITHOUT_ONE), '720p30')
})

test('a list that marks none is taken at its head, which is still the API ordering it', () => {
  assert.equal(
    unaskedIn(WITH_A_GPU.map((one) => ({ ...one, unasked: false }))),
    '1080p60',
  )
})

test('a list with nothing on it names nothing, so nothing is asked for', () => {
  assert.equal(unaskedIn([]), undefined)
})
