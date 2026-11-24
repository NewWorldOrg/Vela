'use client'

import { useEffect, useState } from 'react'

import { romSoundGain } from '@/lib/data-broadcast-sound'
import { DATA_BROADCAST_SOUNDS, SOUNDS_SPELLING } from '@/lib/stored-flag'
import { RomSounder, audioContextOf, type RomSounds } from '@/lib/rom-sounder'
import { useStoredFlag } from '@/hooks/useStoredFlag'

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
