import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  liveSeat,
  soundBeingHeard,
  soundChoiceStillStands,
  wireKey,
  type SoundChoice,
} from '@/lib/live-seat'
import {
  MAIN_SOUND,
  soundsAnnounced,
  soundsOnAir,
  splitsDualMono,
} from '@/repository/sounds'
import type { AudioMode } from '@/repository/announced'

const A_CHANNEL = 'a-channel'

const ANOTHER_CHANNEL = 'another-channel'

const A_PROFILE = 'a-profile'

const ON_THE_SECOND_SOUND: SoundChoice = {
  of: A_CHANNEL,
  track: 'secondary',
}

function playing(
  announces: number,
  chosen: SoundChoice | null,
  audio: AudioMode = 'stereo',
) {
  const announced = soundsOnAir(announces, audio)
  const standing = soundChoiceStillStands(chosen, A_CHANNEL, announced)
  const seat = liveSeat(
    1,
    2,
    A_PROFILE,
    soundBeingHeard(standing),
    splitsDualMono(announces, audio),
  )

  return { standing, seat, key: wireKey(seat, 0) }
}

test('a viewer who has chosen nothing hears the main sound', () => {
  assert.equal(soundBeingHeard(null), MAIN_SOUND)
})

test('a choice the programme still carries goes on standing', () => {
  assert.equal(
    soundChoiceStillStands(ON_THE_SECOND_SOUND, A_CHANNEL, soundsAnnounced(2)),
    ON_THE_SECOND_SOUND,
  )
})

test('a choice made for another channel is not carried over to this one', () => {
  assert.equal(
    soundChoiceStillStands(
      ON_THE_SECOND_SOUND,
      ANOTHER_CHANNEL,
      soundsAnnounced(2),
    ),
    null,
  )
})

test('the seat a viewer holds does not move while the programme goes on carrying the sound they chose', () => {
  const before = playing(2, ON_THE_SECOND_SOUND)
  const afterTheProgrammeChanges = playing(2, ON_THE_SECOND_SOUND)

  assert.equal(before.seat, `1:2:${A_PROFILE}:secondary`)
  assert.equal(afterTheProgrammeChanges.seat, before.seat)
  assert.equal(afterTheProgrammeChanges.key, before.key)
})

test('a programme that stops carrying the second sound spends the choice, and the seat goes back to the main sound', () => {
  const gone = playing(1, ON_THE_SECOND_SOUND)

  assert.equal(gone.standing, null)
  assert.equal(gone.seat, `1:2:${A_PROFILE}:main`)
})

test('a programme carrying no sound at all spends the choice too', () => {
  assert.equal(playing(0, ON_THE_SECOND_SOUND).standing, null)
})

test('a spent choice does not come back when a later programme carries two sounds again', () => {
  const spent = playing(1, ON_THE_SECOND_SOUND).standing
  const twoAgain = playing(2, spent)

  assert.equal(twoAgain.standing, null)
  assert.equal(twoAgain.seat, `1:2:${A_PROFILE}:main`)
})

test('a retry is what moves the key, not the programme', () => {
  const { seat } = playing(2, ON_THE_SECOND_SOUND)

  assert.notEqual(wireKey(seat, 1), wireKey(seat, 0))
})

test('there is no seat before the channel and the quality are known', () => {
  assert.equal(liveSeat(undefined, 2, A_PROFILE, MAIN_SOUND, false), null)
  assert.equal(liveSeat(1, undefined, A_PROFILE, MAIN_SOUND, false), null)
  assert.equal(liveSeat(1, 2, undefined, MAIN_SOUND, false), null)
  assert.equal(wireKey(null, 0), null)
})

test('a bilingual programme on one sound offers the second sound, and the seat says the sound is split', () => {
  const right = playing(1, ON_THE_SECOND_SOUND, 'dualMono')

  assert.equal(right.standing, ON_THE_SECOND_SOUND)
  assert.equal(right.seat, `1:2:${A_PROFILE}:secondary:dualMono`)
})

test('the seat moves once when the next programme stops being bilingual, even on the main sound', () => {
  const bilingual = playing(1, null, 'dualMono')
  const stereo = playing(1, null, 'stereo')

  assert.notEqual(stereo.key, bilingual.key)
  assert.equal(stereo.seat, `1:2:${A_PROFILE}:main`)
})

test('the seat moves once when the next programme becomes bilingual', () => {
  const stereo = playing(1, null, 'stereo')
  const bilingual = playing(1, null, 'dualMono')

  assert.notEqual(bilingual.key, stereo.key)
})

test('leaving a bilingual programme on the second sound moves the seat once, to the main sound', () => {
  const right = playing(1, ON_THE_SECOND_SOUND, 'dualMono')
  const after = playing(1, right.standing, 'stereo')

  assert.equal(after.standing, null)
  assert.equal(after.seat, `1:2:${A_PROFILE}:main`)
})

test('the seat does not move between two programmes carried the same way', () => {
  assert.equal(
    playing(1, null, 'dualMono').key,
    playing(1, null, 'dualMono').key,
  )
  assert.equal(playing(1, null, 'mono').key, playing(1, null, 'stereo').key)
  assert.equal(
    playing(2, ON_THE_SECOND_SOUND, 'dualMono').key,
    playing(2, ON_THE_SECOND_SOUND, 'stereo').key,
  )
})
