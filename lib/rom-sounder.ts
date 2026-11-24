import { isRomSound } from '@/lib/bml/rom-sound'
import { ROM_SOUNDS, type Tone } from '@/lib/data-broadcast-sound'

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

const LEAD_S = 0.01

const ATTACK_S = 0.005

const FADED = 0.0001

const TAIL_S = 0.02

export const MOST_SOUNDS_AT_ONCE = 4

export const SAME_SOUND_GAP_S = 0.06

export interface RomSounds {
  play(sound: number): void
  unlock(): void
}

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

export class RomSounder {
  private context: SoundContext | null = null

  private ringing = 0

  private readonly started = new Map<number, number>()

  private readonly make: () => SoundContext | null

  constructor(make: () => SoundContext | null) {
    this.make = make
  }

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

export function audioContextOf(): SoundContext | null {
  return typeof AudioContext === 'function' ? new AudioContext() : null
}
