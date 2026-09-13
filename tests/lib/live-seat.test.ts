import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  liveSeat,
  soundBeingHeard,
  soundsToOffer,
  wireKey,
  type SoundChoice,
} from '@/lib/live-seat'
import { BOTH_SOUNDS, MAIN_SOUND, soundsAnnounced } from '@/repository/sounds'

const A_CHANNEL = 'a-channel'

const ANOTHER_CHANNEL = 'another-channel'

const A_PROFILE = 'a-profile'

const ON_THE_SECOND_SOUND: SoundChoice = {
  of: A_CHANNEL,
  track: 'secondary',
}

function playing(announces: number, chosen: SoundChoice | null) {
  const announced = soundsAnnounced(announces)
  const heard = soundBeingHeard(chosen, A_CHANNEL)
  const seat = liveSeat(1, 2, A_PROFILE, heard)

  return {
    heard,
    seat,
    key: wireKey(seat, 0),
    offered: [...soundsToOffer(announced, heard)],
  }
}

test('a viewer who has chosen nothing hears the main sound', () => {
  assert.equal(soundBeingHeard(null, A_CHANNEL), MAIN_SOUND)
})

test('a choice made for this channel is what is heard', () => {
  assert.equal(soundBeingHeard(ON_THE_SECOND_SOUND, A_CHANNEL), 'secondary')
})

test('a choice made for another channel is not carried over to this one', () => {
  assert.equal(
    soundBeingHeard(ON_THE_SECOND_SOUND, ANOTHER_CHANNEL),
    MAIN_SOUND,
  )
})

test('the seat a viewer holds does not move when the programme that follows announces a different number of tracks', () => {
  const whileTwoAreAnnounced = playing(2, ON_THE_SECOND_SOUND)
  const whileOneIsAnnounced = playing(1, ON_THE_SECOND_SOUND)
  const whileNoneAreAnnounced = playing(0, ON_THE_SECOND_SOUND)

  assert.equal(whileTwoAreAnnounced.seat, `1:2:${A_PROFILE}:secondary`)
  assert.equal(whileOneIsAnnounced.seat, whileTwoAreAnnounced.seat)
  assert.equal(whileNoneAreAnnounced.seat, whileTwoAreAnnounced.seat)
})

test('the key the wire is opened under does not move with the announced count either', () => {
  assert.equal(
    playing(2, ON_THE_SECOND_SOUND).key,
    `1:2:${A_PROFILE}:secondary:0`,
  )
  assert.equal(
    playing(1, ON_THE_SECOND_SOUND).key,
    playing(2, ON_THE_SECOND_SOUND).key,
  )
  assert.equal(
    playing(0, ON_THE_SECOND_SOUND).key,
    playing(2, ON_THE_SECOND_SOUND).key,
  )
})

test('what the programme announces is spent on the buttons, not on the wire', () => {
  assert.deepEqual(playing(2, ON_THE_SECOND_SOUND).offered, [...BOTH_SOUNDS])
  assert.deepEqual(playing(1, null).offered, [MAIN_SOUND])
  assert.deepEqual(playing(0, null).offered, [])
})

test('a viewer already on the second sound is still offered the way back, whatever the programme announces', () => {
  for (const announces of [0, 1, 2]) {
    assert.deepEqual(playing(announces, ON_THE_SECOND_SOUND).offered, [
      ...BOTH_SOUNDS,
    ])
  }
})

test('a retry is what moves the key, not the programme', () => {
  const { seat } = playing(2, ON_THE_SECOND_SOUND)

  assert.notEqual(wireKey(seat, 1), wireKey(seat, 0))
})

test('there is no seat before the channel and the quality are known', () => {
  assert.equal(liveSeat(undefined, 2, A_PROFILE, MAIN_SOUND), null)
  assert.equal(liveSeat(1, undefined, A_PROFILE, MAIN_SOUND), null)
  assert.equal(liveSeat(1, 2, undefined, MAIN_SOUND), null)
  assert.equal(wireKey(null, 0), null)
})
