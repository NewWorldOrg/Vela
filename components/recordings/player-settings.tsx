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

/** Why the profile cannot be chosen while the file is handed over as it is. */
const ONLY_ON_THE_FLY = 'オンザフライ再生のときだけ選べます'

/** Why neither track can be chosen: the API takes no argument for either. */
const NOT_WIRED = '字幕と音声の選択はこれから実装されます'

/**
 * One setting: what it is called, what it is set with, and — where it cannot
 * be set at all — the one line that says why.
 *
 * The reason is written beside the control it belongs to rather than under
 * the player, because it answers a question that is only asked here. What the
 * player is doing, and what a recording costs to move around in, are read
 * below the picture instead: neither is a setting, and neither should be laid
 * over the picture to be read.
 */
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

/**
 * The settings, behind the gear.
 *
 * Everything that changes how the picture is decoded rather than where it is
 * lives here: the profile, the rate, and the two tracks nothing behind them
 * would answer yet. On the bar they were seven controls wide and pushed the
 * playhead and the time — the two things a player is pressed for — into the
 * middle of a row that wrapped onto three lines at any ordinary width.
 *
 * A switch nothing would answer is drawn switched off and kept, rather than
 * taken away: taken away it would be missed, and left pressable it would move
 * its own pill over a picture that never changed.
 */
export function PlayerSettings({
  container,
  profile,
  onChooseProfile,
  onTheFly,
  speed,
  onChooseSpeed,
  onOpenChange,
}: {
  /** The element the picture is drawn in, which is what goes fullscreen. */
  container: HTMLElement | null
  profile: PlaybackProfile
  onChooseProfile: (next: string) => void
  /** Whether the picture is made as it plays, which is when a profile bites. */
  onTheFly: boolean
  speed: string
  onChooseSpeed: (next: string) => void
  /**
   * That the surface is open, told to the player.
   *
   * The surface is drawn into the element the picture is in — it has to be, or
   * it would not be visible in full screen — and so it is not inside the bar
   * and does not go down with it. The player holds the bar up while this is
   * open, which is what YouTube does: its settings menu and its control bar
   * come and go together, and a menu left standing over a picture whose
   * controls have gone is the one piece of chrome with nothing behind it.
   */
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
        {/*
          Nothing is drawn where the control would be. There is no track to
          choose between, so a switch here would be a switch with one side —
          and a word invented to fill it would be a word the design system
          never wrote. The line below says why the row is empty.
        */}
        <Setting label="字幕" reason={NOT_WIRED} />
      </PopoverContent>
    </Popover>
  )
}
