/** One tone of a built-in sound: when it starts after the sound does and how long it rings, in seconds, its wave, its pitch, where the pitch glides to by its end, and its share of the sound's loudness. */
export interface Tone {
  at: number
  lasts: number
  wave: 'sine' | 'triangle'
  hz: number
  to?: number
  loud: number
}

/** The loudest a built-in sound gets, at the player's full volume: soft beside the programme's own sound. */
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

/** Vela's own sounds for the receiver's built-in sounds 0 to 15, each drawn as tones for Web Audio. The standard names the sounds without giving them, so each number has a sound of its own: single blips, steps up and down, chimes and a glide. */
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

/** How long a built-in sound rings, from its first tone to the end of its last, in seconds. */
export function romSoundLasts(sound: number): number {
  return Math.max(...ROM_SOUNDS[sound].map((one) => one.at + one.lasts))
}

/** How loud a built-in sound is played at the player's volume (0 to 1, 0 while muted): in step with it, and not at all while the setting is off or the player is silent. */
export function romSoundGain(on: boolean, level: number): number {
  if (!on || !(level > 0)) {
    return 0
  }

  return Math.min(level, 1) * ROM_SOUND_PEAK
}
