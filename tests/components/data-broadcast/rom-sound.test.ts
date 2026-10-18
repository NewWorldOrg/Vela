import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ROM_SOUNDS, ROM_SOUND_PEAK } from '@/lib/data-broadcast-sound'
import {
  MOST_SOUNDS_AT_ONCE,
  RomSounder,
  SAME_SOUND_GAP_S,
  type SoundContext,
} from '@/components/data-broadcast/rom-sound'

interface Node {
  to: Node | null
  connect(target: Node): Node
  disconnect(): void
}

/** A stand-in for the browser's audio context that notes what was played: for each tone its wave, its pitch and when it starts, and the gain of the node it ends at before the speakers. */
class HeardContext {
  state: AudioContextState

  constructor(state: AudioContextState) {
    this.state = state
  }

  currentTime = 12
  resumed = 0
  closed = 0
  readonly destination = this.node()
  readonly wholes: Node[] = []
  readonly oscillators: (Node & {
    type: string
    hz: number
    to: Node | null
    startsAt: number
    stopsAt: number
    onended: (() => void) | null
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
      onended: null as (() => void) | null,
      frequency: {
        setValueAtTime: (value: number) => {
          made.hz = value
        },
        exponentialRampToValueAtTime: () => {},
      },
      start: (at: number) => {
        made.startsAt = at
        this.wholes.push(this.wholeOf(made))
      },
      stop: (at: number) => {
        made.stopsAt = at
      },
    })

    this.oscillators.push(made)

    return made as unknown as OscillatorNode
  }

  /** Resumes as the browser does, a moment after it was asked. */
  resume() {
    this.resumed += 1

    return Promise.resolve().then(() => {
      this.state = 'running'
    })
  }

  close() {
    this.closed += 1

    return Promise.resolve()
  }

  /** The node each tone reaches the speakers through: the last one before them. */
  wholeOf(oscillator: Node): Node {
    let at: Node = oscillator

    while (at.to && at.to !== this.destination) {
      at = at.to
    }

    assert.equal(at.to, this.destination)

    return at
  }

  /** The gain each tone reaches the speakers through. */
  gains(): number[] {
    return this.oscillators.map(
      (oscillator) =>
        (this.wholeOf(oscillator) as unknown as { gain: { value: number } })
          .gain.value,
    )
  }

  /** How many sounds were laid: the nodes the tones reach the speakers through, counted as each tone is started. */
  sounds(): number {
    return new Set(this.wholes).size
  }

  /** Lets every tone laid so far end, as the browser tells each when it stops. */
  endAll(): void {
    this.oscillators.forEach((oscillator) => oscillator.onended?.())
  }

  private node(): Node {
    const made: Node = {
      to: null,
      connect: (target: Node) => {
        made.to = target

        return target
      },
      disconnect: () => {
        made.to = null
      },
    }

    return made
  }
}

function sounder(state: AudioContextState = 'running') {
  const made: HeardContext[] = []
  const playing = new RomSounder(() => {
    const context = new HeardContext(state)

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

test('nothing is laid while the browser holds the context suspended: it is asked to resume, and the sound is dropped rather than kept for later', async () => {
  const { playing, made } = sounder('suspended')

  playing.play(1, ROM_SOUND_PEAK)

  assert.equal(made.length, 1)
  assert.equal(made[0].resumed, 1)
  assert.equal(made[0].oscillators.length, 0)

  await Promise.resolve()

  assert.equal(made[0].state, 'running')
  assert.equal(made[0].oscillators.length, 0)

  playing.play(2, ROM_SOUND_PEAK)

  assert.deepEqual(
    made[0].oscillators.map((oscillator) => oscillator.hz),
    ROM_SOUNDS[2].map((tone) => tone.hz),
  )
})

test('a closed context lays nothing and is not asked to resume', () => {
  const { playing, made } = sounder('closed')

  playing.play(1, ROM_SOUND_PEAK)

  assert.equal(made[0].resumed, 0)
  assert.equal(made[0].oscillators.length, 0)
})

test('a burst of sounds lays no more than a few at once, however many are asked for', () => {
  const { playing, made } = sounder()

  for (let nth = 0; nth < 100; nth += 1) {
    playing.play(nth % 16, ROM_SOUND_PEAK)
  }

  assert.equal(MOST_SOUNDS_AT_ONCE, 4)
  assert.equal(made[0].sounds(), MOST_SOUNDS_AT_ONCE)
})

test('the same sound is not started again until a short gap after its last start', () => {
  const { playing, made } = sounder()

  playing.play(3, ROM_SOUND_PEAK)
  playing.play(3, ROM_SOUND_PEAK)
  made[0].currentTime += SAME_SOUND_GAP_S / 2
  playing.play(3, ROM_SOUND_PEAK)

  assert.equal(made[0].sounds(), 1)

  made[0].currentTime += SAME_SOUND_GAP_S
  playing.play(3, ROM_SOUND_PEAK)
  playing.play(4, ROM_SOUND_PEAK)

  assert.equal(SAME_SOUND_GAP_S, 0.06)
  assert.equal(made[0].sounds(), 3)
})

test('a sound gives its place to the next once it has ended', () => {
  const { playing, made } = sounder()

  for (let sound = 0; sound < MOST_SOUNDS_AT_ONCE + 1; sound += 1) {
    playing.play(sound, ROM_SOUND_PEAK)
  }

  assert.equal(made[0].sounds(), MOST_SOUNDS_AT_ONCE)

  made[0].endAll()
  playing.play(10, ROM_SOUND_PEAK)
  playing.play(11, ROM_SOUND_PEAK)

  assert.equal(made[0].sounds(), MOST_SOUNDS_AT_ONCE + 2)
})

test('unlocking, as the viewer presses something, makes the context or resumes a suspended one, and plays nothing', async () => {
  const { playing, made } = sounder('suspended')

  playing.unlock()
  await Promise.resolve()

  assert.equal(made.length, 1)
  assert.equal(made[0].resumed, 1)
  assert.equal(made[0].state, 'running')
  assert.equal(made[0].oscillators.length, 0)

  playing.unlock()

  assert.equal(made.length, 1)
  assert.equal(made[0].resumed, 1)
})

test('a sound asked for before the context was unlocked, whose resume the browser refused, is not played once it is', async () => {
  const { playing, made } = sounder('suspended')

  playing.play(7, ROM_SOUND_PEAK)
  await Promise.resolve()
  made[0].state = 'suspended'
  playing.unlock()
  await Promise.resolve()

  assert.equal(made[0].state, 'running')
  assert.equal(made[0].oscillators.length, 0)

  playing.play(8, ROM_SOUND_PEAK)

  assert.deepEqual(
    made[0].oscillators.map((oscillator) => oscillator.hz),
    ROM_SOUNDS[8].map((tone) => tone.hz),
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
