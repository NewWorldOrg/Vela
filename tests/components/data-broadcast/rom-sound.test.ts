import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ROM_SOUNDS, ROM_SOUND_PEAK } from '@/lib/data-broadcast-sound'
import {
  RomSounder,
  type SoundContext,
} from '@/components/data-broadcast/rom-sound'

interface Node {
  to: Node | null
  connect(target: Node): Node
}

/** A stand-in for the browser's audio context that notes what was played: for each tone its wave, its pitch and when it starts, and the gain of the node it ends at before the speakers. */
class HeardContext {
  state: AudioContextState = 'running'
  currentTime = 12
  resumed = 0
  closed = 0
  readonly destination = this.node()
  readonly oscillators: (Node & {
    type: string
    hz: number
    to: Node | null
    startsAt: number
    stopsAt: number
  })[] = []

  createGain() {
    const values: number[] = []

    return Object.assign(this.node(), {
      gain: {
        value: 1,
        setValueAtTime: (value: number) => values.push(value),
        linearRampToValueAtTime: (value: number) => values.push(value),
        exponentialRampToValueAtTime: (value: number) => values.push(value),
        values,
      },
    }) as unknown as GainNode
  }

  createOscillator() {
    const made = Object.assign(this.node(), {
      type: 'sine',
      hz: 0,
      startsAt: -1,
      stopsAt: -1,
      frequency: {
        setValueAtTime: (value: number) => {
          made.hz = value
        },
        exponentialRampToValueAtTime: () => {},
      },
      start: (at: number) => {
        made.startsAt = at
      },
      stop: (at: number) => {
        made.stopsAt = at
      },
    })

    this.oscillators.push(made)

    return made as unknown as OscillatorNode
  }

  resume() {
    this.resumed += 1
    this.state = 'running'

    return Promise.resolve()
  }

  close() {
    this.closed += 1

    return Promise.resolve()
  }

  /** The gain each tone reaches the speakers through: the last node before them. */
  gains(): number[] {
    return this.oscillators.map((oscillator) => {
      let at: Node = oscillator

      while (at.to && at.to !== this.destination) {
        at = at.to
      }

      assert.equal(at.to, this.destination)

      return (at as unknown as { gain: { value: number } }).gain.value
    })
  }

  private node(): Node {
    const made: Node = {
      to: null,
      connect: (target: Node) => {
        made.to = target

        return target
      },
    }

    return made
  }
}

function sounder() {
  const made: HeardContext[] = []
  const playing = new RomSounder(() => {
    const context = new HeardContext()

    made.push(context)

    return context as unknown as SoundContext
  })

  return { playing, made }
}

test('a sound is played as its own tones, at the gain asked for, from now', () => {
  const { playing, made } = sounder()

  playing.play(12, 0.4 * ROM_SOUND_PEAK)

  assert.equal(made.length, 1)

  const [context] = made

  assert.deepEqual(
    context.oscillators.map((oscillator) => [oscillator.type, oscillator.hz]),
    ROM_SOUNDS[12].map((tone) => [tone.wave, tone.hz]),
  )
  assert.deepEqual(
    context.gains(),
    ROM_SOUNDS[12].map(() => 0.4 * ROM_SOUND_PEAK),
  )
  context.oscillators.forEach((oscillator, at) => {
    const tone = ROM_SOUNDS[12][at]

    assert.ok(oscillator.startsAt >= 12 + tone.at)
    assert.ok(oscillator.stopsAt > oscillator.startsAt + tone.lasts - 0.0001)
    assert.ok(oscillator.stopsAt < 12 + 1)
  })
})

test('each number plays its own sound, in one context kept for the player', () => {
  const { playing, made } = sounder()

  playing.play(0, ROM_SOUND_PEAK)
  playing.play(15, ROM_SOUND_PEAK)

  assert.equal(made.length, 1)
  assert.deepEqual(
    made[0].oscillators.map((oscillator) => oscillator.hz),
    [...ROM_SOUNDS[0], ...ROM_SOUNDS[15]].map((tone) => tone.hz),
  )
})

test('nothing is played, and no context made, at no gain: muted, or with the setting off', () => {
  const { playing, made } = sounder()

  playing.play(3, 0)

  assert.equal(made.length, 0)
})

test('a number that is no built-in sound plays nothing', () => {
  const { playing, made } = sounder()

  playing.play(16, ROM_SOUND_PEAK)
  playing.play(-1, ROM_SOUND_PEAK)
  playing.play(2.5, ROM_SOUND_PEAK)

  assert.equal(made.length, 0)
})

test('a context the browser holds suspended is resumed before it plays', () => {
  const { playing, made } = sounder()

  playing.play(1, ROM_SOUND_PEAK)
  made[0].state = 'suspended'
  playing.play(2, ROM_SOUND_PEAK)

  assert.equal(made[0].resumed, 1)
  assert.equal(
    made[0].oscillators.length,
    ROM_SOUNDS[1].length + ROM_SOUNDS[2].length,
  )
})

test('closing lets the context go, and the next sound makes a new one', () => {
  const { playing, made } = sounder()

  playing.close()
  playing.play(4, ROM_SOUND_PEAK)
  playing.close()

  assert.equal(made.length, 1)
  assert.equal(made[0].closed, 1)

  playing.play(5, ROM_SOUND_PEAK)

  assert.equal(made.length, 2)
})

test('where the browser has no audio, nothing is played and nothing fails', () => {
  const playing = new RomSounder(() => null)

  assert.doesNotThrow(() => playing.play(6, ROM_SOUND_PEAK))
})
