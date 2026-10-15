'use client'

import { useEffect, useState } from 'react'

import { romSoundGain } from '@/lib/data-broadcast-sound'
import { DATA_BROADCAST_SOUNDS, SOUNDS_SPELLING } from '@/lib/stored-flag'
import {
  RomSounder,
  audioContextOf,
} from '@/components/data-broadcast/rom-sound'
import { useStoredFlag } from '@/hooks/useStoredFlag'

/** Plays the receiver's built-in sounds the data broadcast asks for, at the player's volume (`level`, 0 while muted) and only while the setting is on. */
export function useRomSound(level: number): (sound: number) => void {
  const [on] = useStoredFlag(DATA_BROADCAST_SOUNDS, SOUNDS_SPELLING, true)
  const [sounder] = useState(() => new RomSounder(audioContextOf))

  useEffect(() => () => sounder.close(), [sounder])

  return (sound) => sounder.play(sound, romSoundGain(on, level))
}
