'use client'

import { useState, type ReactNode } from 'react'

import {
  BOTH_SOURCES,
  sourceLabel,
  type PlaybackSource,
} from '@/repository/playback-sources'
import { soundLabel, type SoundTrack } from '@/repository/sounds'
import {
  PLAYBACK_PROFILES,
  type PlaybackProfile,
} from '@/repository/video-paths'
import { SettingsIcon } from '@/components/vela/icons'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { PLAYER_GLYPH_BUTTON } from '@/components/recordings/player-palette'
import { PlayerSegmentedControl } from '@/components/recordings/player-segmented-control'

export const PLAYBACK_SPEEDS = ['0.5', '1.0', '1.25', '1.5', '2.0'] as const

export function Setting({
  label,
  children,
}: {
  label: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-dashed border-white/12 py-2.5 last:border-b-0">
      <span className="w-11 shrink-0 text-[11px] text-(--pl-ink-3)">
        {label}
      </span>
      {children}
    </div>
  )
}

export function PlayerSettings({
  container,
  profile,
  onChooseProfile,
  onTheFly,
  speed,
  onChooseSpeed,
  sounds,
  sound,
  onChooseSound,
  source,
  alternative,
  onChooseSource,
  onOpenChange,
}: {
  container: HTMLElement | null
  profile?: PlaybackProfile
  onChooseProfile: (next: string) => void
  onTheFly: boolean
  speed: string
  onChooseSpeed: (next: string) => void
  sounds: readonly SoundTrack[]
  sound: SoundTrack
  onChooseSound: (next: SoundTrack) => void
  source?: PlaybackSource
  alternative?: PlaybackSource
  onChooseSource: (next: PlaybackSource) => void
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
            options={PLAYBACK_PROFILES}
            value={onTheFly ? profile : undefined}
            onChange={onChooseProfile}
            numeric
            off={!onTheFly}
          />
        </Setting>
        <Setting label="速度">
          <PlayerSegmentedControl
            label="速度"
            options={PLAYBACK_SPEEDS}
            value={speed}
            onChange={onChooseSpeed}
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
        {source !== undefined && alternative !== undefined && (
          <Setting label="ソース">
            <PlayerSegmentedControl
              label="ソース"
              options={BOTH_SOURCES}
              value={source}
              onChange={onChooseSource}
              nameOf={sourceLabel}
            />
          </Setting>
        )}
      </PopoverContent>
    </Popover>
  )
}
