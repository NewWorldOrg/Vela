import { isRomSound } from '@/lib/bml/rom-sound'
import { ROM_SOUNDS, type Tone } from '@/lib/data-broadcast-sound'

/** What of the browser's audio context the built-in sounds are played through. */
export type SoundContext = Pick<
  AudioContext,
  | 'state'
  | 'currentTime'
  | 'destination'
  | 'createGain'
  | 'createOscillator'
  | 'resume'
  | 'close'
>

/** How far ahead of the context's clock a sound is laid, so its first tone is not cut. */
const LEAD_S = 0.01

/** How long a tone takes to swell to its loudness, short enough not to click. */
const ATTACK_S = 0.005

/** Where a tone fades to by its end: silence as far as the ear goes, as an exponential fade cannot reach 0. */
const FADED = 0.0001

/** How long after its fade a tone is stopped. */
const TAIL_S = 0.02

function played(
  context: SoundContext,
  tones: readonly Tone[],
  gain: number,
): void {
  const begins = context.currentTime + LEAD_S
  const whole = context.createGain()

  whole.gain.value = gain
  whole.connect(context.destination)

  tones.forEach((tone) => {
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    const starts = begins + tone.at
    const ends = starts + tone.lasts

    oscillator.type = tone.wave
    oscillator.frequency.setValueAtTime(tone.hz, starts)

    if (tone.to !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(tone.to, ends)
    }

    envelope.gain.setValueAtTime(0, starts)
    envelope.gain.linearRampToValueAtTime(tone.loud, starts + ATTACK_S)
    envelope.gain.exponentialRampToValueAtTime(FADED * tone.loud, ends)
    oscillator.connect(envelope).connect(whole)
    oscillator.start(starts)
    oscillator.stop(ends + TAIL_S)
  })
}

/** Plays the receiver's built-in sounds for one player, in an audio context of its own made at the first sound and kept until the player goes. A context the browser holds suspended, as it does until the viewer has used the page, is asked to resume. */
export class RomSounder {
  private context: SoundContext | null = null

  private readonly make: () => SoundContext | null

  constructor(make: () => SoundContext | null) {
    this.make = make
  }

  /** Plays a built-in sound at a gain; at no gain, or for a number that names no built-in sound, nothing is played. */
  play(sound: number, gain: number): void {
    if (!(gain > 0) || !isRomSound(sound)) {
      return
    }

    this.context ??= this.make()

    const context = this.context

    if (!context) {
      return
    }

    if (context.state === 'suspended') {
      context.resume().catch(() => {
        console.warn('data broadcast: the browser kept the sound from playing')
      })
    }

    played(context, ROM_SOUNDS[sound], gain)
  }

  close(): void {
    const context = this.context

    this.context = null
    context?.close().catch(() => {})
  }
}

/** The browser's own audio context, where it has one. */
export function audioContextOf(): SoundContext | null {
  return typeof AudioContext === 'function' ? new AudioContext() : null
}
