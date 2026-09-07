'use client'

import { useState, type ReactNode } from 'react'

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

const ONLY_ON_THE_FLY = 'オンザフライ再生のときだけ選べます'

const NOT_WIRED = '字幕と音声の選択はこれから実装されます'

export function Setting({
  label,
  reason,
  children,
}: {
  label: string
  reason?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-dashed border-white/12 py-2.5 last:border-b-0">
      <span className="w-11 shrink-0 text-[11px] text-(--pl-ink-3)">
        {label}
      </span>
      {children}
      {reason && (
        <p className="w-full text-[11px] leading-relaxed text-(--pl-ink-3)">
          {reason}
        </p>
      )}
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
  onOpenChange,
}: {
  container: HTMLElement | null
  profile?: PlaybackProfile
  onChooseProfile: (next: string) => void
  onTheFly: boolean
  speed: string
  onChooseSpeed: (next: string) => void
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
        <Setting label="画質" reason={ONLY_ON_THE_FLY}>
          <PlayerSegmentedControl
            label="画質"
            options={PLAYBACK_PROFILES}
            value={onTheFly ? profile : undefined}
            onChange={onChooseProfile}
            numeric
            off={!onTheFly}
            title={onTheFly ? undefined : ONLY_ON_THE_FLY}
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
        <Setting label="音声">
          <PlayerSegmentedControl
            label="音声"
            options={['主音声', '副音声']}
            onChange={() => {}}
            off
            title={NOT_WIRED}
          />
        </Setting>
        <Setting label="字幕" reason={NOT_WIRED} />
      </PopoverContent>
    </Popover>
  )
}
