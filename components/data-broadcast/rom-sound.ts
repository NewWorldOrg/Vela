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

/** The most built-in sounds that ring at once; one asked for beyond them is dropped, so a document or an application asking in a loop neither clips nor loads the page. */
export const MOST_SOUNDS_AT_ONCE = 4

/** How long after one start the same sound may start again, in seconds. */
export const SAME_SOUND_GAP_S = 0.06

/** What the player's data broadcast does with the built-in sounds: plays one the documents or an application ask for, and unlocks the browser's audio while the viewer presses something, as WebKit lets it start only then. */
export interface RomSounds {
  play(sound: number): void
  unlock(): void
}

/** Lays a sound's tones from now, and calls `ended` once the last of them has stopped. */
function played(
  context: SoundContext,
  tones: readonly Tone[],
  gain: number,
  ended: () => void,
): void {
  const begins = context.currentTime + LEAD_S
  const whole = context.createGain()

  whole.gain.value = gain
  whole.connect(context.destination)

  const last = Math.max(...tones.map((tone) => tone.at + tone.lasts))
  let told = false

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

    if (!told && tone.at + tone.lasts === last) {
      told = true
      oscillator.onended = () => {
        whole.disconnect()
        ended()
      }
    }
  })
}

/** Plays the receiver's built-in sounds for one player, in an audio context of its own kept until the player goes. The context is made, or resumed, by `unlock` while the viewer presses something; failing that, at the first sound, where a browser that has seen the viewer use the page lets it run. Nothing is laid while it is not running: a sound asked for then is dropped, never kept for later. A few sounds ring at once at most, and the same one does not start again within a short gap. */
export class RomSounder {
  private context: SoundContext | null = null

  private ringing = 0

  private readonly started = new Map<number, number>()

  private readonly make: () => SoundContext | null

  constructor(make: () => SoundContext | null) {
    this.make = make
  }

  /** Plays a built-in sound at a gain; at no gain, or for a number that names no built-in sound, nothing is played. */
  play(sound: number, gain: number): void {
    if (!(gain > 0) || !isRomSound(sound)) {
      return
    }

    const context = this.unlocked()

    if (context?.state !== 'running' || this.ringing >= MOST_SOUNDS_AT_ONCE) {
      return
    }

    const now = context.currentTime
    const last = this.started.get(sound)

    if (last !== undefined && now - last < SAME_SOUND_GAP_S) {
      return
    }

    this.started.set(sound, now)
    this.ringing += 1
    played(context, ROM_SOUNDS[sound], gain, () => {
      this.ringing = Math.max(0, this.ringing - 1)
    })
  }

  /** Makes the context, or asks a suspended one to resume; called while the viewer presses something, which is when WebKit lets audio start. */
  unlock(): void {
    this.unlocked()
  }

  close(): void {
    const context = this.context

    this.context = null
    this.ringing = 0
    this.started.clear()
    context?.close().catch(() => {})
  }

  private unlocked(): SoundContext | null {
    this.context ??= this.make()

    const context = this.context

    if (context?.state === 'suspended') {
      context.resume().catch(() => {
        console.warn('data broadcast: the browser kept the sound from playing')
      })
    }

    return context
  }
}

/** The browser's own audio context, where it has one. */
export function audioContextOf(): SoundContext | null {
  return typeof AudioContext === 'function' ? new AudioContext() : null
}
