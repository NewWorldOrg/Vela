'use client'

import { useState, type ReactNode } from 'react'

import type { LiveProfile } from '@/repository/live'
import { soundLabel, type SoundTrack } from '@/repository/sounds'
import { SettingsIcon } from '@/components/vela/icons'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { PLAYER_GLYPH_BUTTON } from '@/components/recordings/player-palette'
import { PlayerSegmentedControl } from '@/components/recordings/player-segmented-control'
import { Setting } from '@/components/recordings/player-settings'

function Figure({ children }: { children: ReactNode }) {
  return (
    <span className="font-code text-[15px] font-medium text-(--pl-ink)">
      {children}
    </span>
  )
}

export function LiveSettings({
  container,
  profiles,
  profile,
  onChooseProfile,
  sounds,
  sound,
  onChooseSound,
  dropped,
  droppedByThoseStillWatching,
  lostOnTheWayIn,
  onOpenChange,
}: {
  container: HTMLElement | null
  profiles: LiveProfile[]
  profile?: string
  onChooseProfile: (next: string) => void
  sounds: readonly SoundTrack[]
  sound: SoundTrack
  onChooseSound: (next: SoundTrack) => void
  dropped?: number
  droppedByThoseStillWatching?: number
  lostOnTheWayIn?: number
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)

  const change = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
  }

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger aria-label="設定" className={PLAYER_GLYPH_BUTTON}>
        <SettingsIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        container={container}
        aria-label="設定"
        side="top"
        align="end"
        sideOffset={10}
        className="w-auto max-w-[min(20rem,calc(100vw-2rem))] min-w-[17rem] rounded-lg border-white/20 bg-(--pl-bg) p-4 text-(--pl-ink) shadow-pop-xl"
      >
        <Setting label="画質">
          <PlayerSegmentedControl
            label="画質"
            options={profiles.map((one) => one.name)}
            value={profile}
            onChange={onChooseProfile}
            numeric
          />
        </Setting>
        {sounds.length > 1 && (
          <Setting label="音声">
            <PlayerSegmentedControl
              label="音声"
              options={sounds}
              value={sound}
              onChange={onChooseSound}
              nameOf={soundLabel}
            />
          </Setting>
        )}
        {dropped !== undefined && (
          <Setting label="ドロップ">
            <span
              data-slot="live-dropped"
              className="text-[12px] text-(--pl-ink-2)"
            >
              <Figure>{dropped}</Figure> 件
            </span>
            {droppedByThoseStillWatching !== undefined &&
              droppedByThoseStillWatching !== dropped && (
                <span
                  data-slot="live-dropped-still-watching"
                  className="text-[12px] text-(--pl-ink-3)"
                >
                  視聴中 <Figure>{droppedByThoseStillWatching}</Figure> 件
                </span>
              )}
          </Setting>
        )}
        {lostOnTheWayIn !== undefined && (
          <Setting label="受信">
            <span
              data-slot="live-lost-on-the-way-in"
              className="text-[12px] text-(--pl-ink-2)"
            >
              取りこぼし <Figure>{lostOnTheWayIn}</Figure> 件
            </span>
          </Setting>
        )}
      </PopoverContent>
    </Popover>
  )
}
