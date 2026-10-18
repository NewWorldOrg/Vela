'use client'

import { useEffect, useState } from 'react'

import { romSoundGain } from '@/lib/data-broadcast-sound'
import { DATA_BROADCAST_SOUNDS, SOUNDS_SPELLING } from '@/lib/stored-flag'
import {
  RomSounder,
  audioContextOf,
  type RomSounds,
} from '@/components/data-broadcast/rom-sound'
import { useStoredFlag } from '@/hooks/useStoredFlag'

/** Plays the receiver's built-in sounds the data broadcast asks for, at the player's volume (`level`, 0 while muted) and only while the setting is on, and unlocks the browser's audio for them when the player calls `unlock` from a press. */
export function useRomSound(level: number): RomSounds {
  const [on] = useStoredFlag(DATA_BROADCAST_SOUNDS, SOUNDS_SPELLING, true)
  const [sounder] = useState(() => new RomSounder(audioContextOf))

  useEffect(() => () => sounder.close(), [sounder])

  return {
    play: (sound) => sounder.play(sound, romSoundGain(on, level)),
    unlock: () => {
      if (on) {
        sounder.unlock()
      }
    },
  }
}
