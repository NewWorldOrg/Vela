export interface Tone {
  at: number
  lasts: number
  wave: 'sine' | 'triangle'
  hz: number
  to?: number
  loud: number
}

export const ROM_SOUND_PEAK = 0.25

const G4 = 392
const A4 = 440
const C5 = 523.25
const D5 = 587.33
const E5 = 659.25
const G5 = 783.99
const A5 = 880
const C6 = 1046.5
const E6 = 1318.51

function tone(
  at: number,
  lasts: number,
  hz: number,
  more: Partial<Pick<Tone, 'wave' | 'to' | 'loud'>> = {},
): Tone {
  return { at, lasts, wave: 'sine', hz, loud: 1, ...more }
}

export const ROM_SOUNDS: readonly (readonly Tone[])[] = [
  [tone(0, 0.05, C6)],
  [tone(0, 0.08, G5)],
  [tone(0, 0.07, E5), tone(0.07, 0.1, A5)],
  [tone(0, 0.07, A5), tone(0.07, 0.1, E5)],
  [tone(0, 0.06, C5), tone(0.06, 0.06, E5), tone(0.12, 0.12, G5)],
  [tone(0, 0.06, G5), tone(0.06, 0.06, E5), tone(0.12, 0.12, C5)],
  [tone(0, 0.06, E5), tone(0.1, 0.06, E5)],
  [
    tone(0, 0.3, C6, { wave: 'triangle', loud: 0.5 }),
    tone(0, 0.3, E6, { wave: 'triangle', loud: 0.5 }),
  ],
  [tone(0, 0.14, A4, { wave: 'triangle' })],
  [tone(0, 0.08, A4), tone(0.08, 0.12, A5)],
  [tone(0, 0.08, A5), tone(0.08, 0.14, A4)],
  [
    tone(0, 0.045, C5),
    tone(0.045, 0.045, D5),
    tone(0.09, 0.045, E5),
    tone(0.135, 0.1, G5),
  ],
  [
    tone(0, 0.35, C5, { wave: 'triangle', loud: 0.34 }),
    tone(0, 0.35, E5, { wave: 'triangle', loud: 0.33 }),
    tone(0, 0.35, G5, { wave: 'triangle', loud: 0.33 }),
  ],
  [
    tone(0, 0.04, E5),
    tone(0.04, 0.04, G5),
    tone(0.08, 0.04, E5),
    tone(0.12, 0.05, G5),
  ],
  [
    tone(0, 0.07, G4, { wave: 'triangle' }),
    tone(0.11, 0.09, G4, { wave: 'triangle' }),
  ],
  [tone(0, 0.14, A4, { to: A5 }), tone(0.14, 0.06, C6)],
]

export function romSoundLasts(sound: number): number {
  return Math.max(...ROM_SOUNDS[sound].map((one) => one.at + one.lasts))
}

export function romSoundGain(on: boolean, level: number): number {
  if (!on || !(level > 0)) {
    return 0
  }

  return Math.min(level, 1) * ROM_SOUND_PEAK
}
