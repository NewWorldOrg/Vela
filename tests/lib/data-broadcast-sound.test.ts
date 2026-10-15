import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ROM_SOUND_COUNT } from '@/lib/bml/rom-sound'
import {
  ROM_SOUNDS,
  ROM_SOUND_PEAK,
  romSoundGain,
  romSoundLasts,
} from '@/lib/data-broadcast-sound'

test('every built-in sound has a sound of its own', () => {
  assert.equal(ROM_SOUNDS.length, ROM_SOUND_COUNT)

  const drawn = new Set(ROM_SOUNDS.map((tones) => JSON.stringify(tones)))

  assert.equal(drawn.size, ROM_SOUND_COUNT)
})

test('every sound is short, well under a second', () => {
  ROM_SOUNDS.forEach((tones, sound) => {
    assert.ok(tones.length > 0, `sound ${sound}`)
    assert.ok(romSoundLasts(sound) <= 0.4, `sound ${sound}`)
    assert.ok(romSoundLasts(sound) >= 0.04, `sound ${sound}`)
  })
})

/** Tones that only meet, one starting as the one before ends, do not ring together. */
const TOUCHING = 1e-9

test('every sound is soft: rounded waves in the middle of the range, no louder together than one tone alone', () => {
  ROM_SOUNDS.forEach((tones, sound) => {
    tones.forEach((tone) => {
      assert.ok(['sine', 'triangle'].includes(tone.wave), `sound ${sound}`)
      assert.ok(tone.hz >= 200 && tone.hz <= 2000, `sound ${sound}`)
      assert.ok(
        tone.to === undefined || (tone.to >= 200 && tone.to <= 2000),
        `sound ${sound}`,
      )
      assert.ok(tone.lasts > 0, `sound ${sound}`)
    })

    const together = tones.reduce(
      (most, tone) =>
        Math.max(
          most,
          tones
            .filter(
              (other) =>
                other.at < tone.at + tone.lasts - TOUCHING &&
                tone.at < other.at + other.lasts - TOUCHING,
            )
            .reduce((sum, other) => sum + other.loud, 0),
        ),
      0,
    )

    assert.ok(together <= 1.0001, `sound ${sound}`)
  })
  assert.ok(ROM_SOUND_PEAK > 0 && ROM_SOUND_PEAK <= 0.3)
})

test('the sound follows the player’s volume', () => {
  assert.equal(romSoundGain(true, 1), ROM_SOUND_PEAK)
  assert.equal(romSoundGain(true, 0.4), 0.4 * ROM_SOUND_PEAK)
  assert.equal(romSoundGain(true, 0.05), 0.05 * ROM_SOUND_PEAK)
  assert.equal(romSoundGain(true, 1.5), ROM_SOUND_PEAK)
})

test('a muted player plays no sound', () => {
  assert.equal(romSoundGain(true, 0), 0)
  assert.equal(romSoundGain(true, -0.2), 0)
  assert.equal(romSoundGain(true, Number.NaN), 0)
})

test('with the setting off no sound is played, whatever the volume', () => {
  assert.equal(romSoundGain(false, 1), 0)
  assert.equal(romSoundGain(false, 0.4), 0)
})
