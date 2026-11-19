import { ROM_SOUNDS } from '@/lib/data-broadcast-sound'

export interface HeardSound {
  sound: number | null
  gain: number
}

interface Wired {
  to: Wired | null
  gain?: { value: number }
  hz?: number
}

function wired(more: Partial<Wired> = {}): Wired & {
  connect(target: Wired): Wired
  disconnect(): void
} {
  const made = {
    to: null as Wired | null,
    ...more,
    connect(target: Wired) {
      made.to = target

      return target
    },
    disconnect() {
      made.to = null
    },
  }

  return made
}

const NO_PARAM = {
  setValueAtTime: () => {},
  linearRampToValueAtTime: () => {},
  exponentialRampToValueAtTime: () => {},
}

const PRESSES = new Set([
  'click',
  'keydown',
  'keyup',
  'mousedown',
  'mouseup',
  'pointerup',
  'touchend',
  'input',
  'change',
])

function inAPress(): boolean {
  const event = (window as { event?: Event }).event

  return event !== undefined && PRESSES.has(event.type)
}

function soundOf(tones: number[]): number | null {
  const found = ROM_SOUNDS.findIndex(
    (sound) =>
      sound.length === tones.length &&
      sound.every((tone, at) => tone.hz === tones[at]),
  )

  return found === -1 ? null : found
}

export function hearingTheSounds({ asWebKit = false } = {}): {
  heard: () => HeardSound[]
  made: () => number
  stop: () => void
} {
  const oscillators: Wired[] = []
  let contexts = 0
  const speakers = wired()

  class StandIn {
    state = asWebKit && !inAPress() ? 'suspended' : 'running'
    currentTime = 0

    constructor() {
      contexts += 1
    }
    destination = speakers

    createGain() {
      return wired({ gain: { value: 1, ...NO_PARAM } })
    }

    createOscillator() {
      const made = wired({ hz: 0 })
      const oscillator = Object.assign(made, {
        type: 'sine',
        frequency: {
          ...NO_PARAM,
          setValueAtTime: (hz: number) => {
            made.hz = hz
          },
        },
        start: () => {},
        stop: () => {},
        onended: null,
      })

      oscillators.push(oscillator)

      return oscillator
    }

    resume() {
      const allowed = !asWebKit || inAPress()

      return Promise.resolve().then(() => {
        if (allowed) {
          this.state = 'running'
        }
      })
    }

    close() {
      this.state = 'closed'

      return Promise.resolve()
    }
  }

  const own = window.AudioContext

  window.AudioContext = StandIn as unknown as typeof AudioContext

  const heard = () => {
    const sounds = new Map<Wired, number[]>()

    oscillators.forEach((oscillator) => {
      let at = oscillator

      while (at.to && at.to !== speakers) {
        at = at.to
      }

      if (at.to === speakers) {
        sounds.set(at, [...(sounds.get(at) ?? []), oscillator.hz ?? 0])
      }
    })

    return [...sounds].map(([whole, tones]) => ({
      sound: soundOf(tones),
      gain: whole.gain?.value ?? 0,
    }))
  }

  return {
    heard,
    made: () => contexts,
    stop: () => {
      window.AudioContext = own
    },
  }
}
