'use client'

import { useState } from 'react'

import type { LiveProfile } from '@/repository/live'
import { SettingsIcon } from '@/components/vela/icons'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { PLAYER_GLYPH_BUTTON } from '@/components/recordings/player-palette'
import { PlayerSegmentedControl } from '@/components/recordings/player-segmented-control'
import { Setting } from '@/components/recordings/player-settings'

/** Why the sound track cannot be chosen: the wire takes no argument for it. */
const SOUND_NOT_WIRED = '音声の選択はこれから実装されます'

/**
 * The settings behind the gear, for a live picture: the profile it is encoded
 * in, the sound track nothing behind it answers yet, and the one reading of
 * the session that is not a setting — how many pictures it has thrown away.
 * The captions are not here: there is one track and no choice to make, and
 * whether it is drawn is the switch on the bar.
 *
 * The count is here and not on the bar because that is where the players
 * that count it put it. YouTube's Dropped Frames is in Stats for nerds, a
 * panel off the context menu; Twitch's Skipped Frames is in Video Stats,
 * under Advanced in the gear. Neither puts it beside the play button — the
 * bar is for what is pressed and for the one live reading everyone glances
 * at, the distance from the edge — and a panel off a context menu is a panel
 * a finger cannot open, so the gear it is.
 *
 * A profile is part of the session's key, so choosing one is a new session on
 * the same channel rather than a change to the one running. There is no rate
 * here: a live picture is watched at the speed it is broadcast, and the only
 * time it runs faster is the player's own, catching up to the edge.
 */
export function LiveSettings({
  container,
  profiles,
  profile,
  onChooseProfile,
  dropped,
  onOpenChange,
}: {
  /** The element the picture is drawn in, which is what goes fullscreen. */
  container: HTMLElement | null
  profiles: LiveProfile[]
  /** Unset where the API offered no profile, and so nothing is being watched. */
  profile?: string
  onChooseProfile: (next: string) => void
  /**
   * Pictures the session has thrown away for viewers who fell behind, as the
   * API has counted them so far. Unset until the API has been asked, and
   * then the row is not drawn: a nought the screen has not read is a claim.
   */
  dropped?: number
  /** That the surface is open, told to the player, as on the recording player. */
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
        <Setting label="音声" reason={SOUND_NOT_WIRED}>
          <PlayerSegmentedControl
            label="音声"
            options={['主音声', '副音声']}
            onChange={() => {}}
            off
            title={SOUND_NOT_WIRED}
          />
        </Setting>
        {dropped !== undefined && (
          <Setting label="ドロップ">
            <span
              data-slot="live-dropped"
              className="text-[12px] text-(--pl-ink-2)"
            >
              <span className="font-code text-[15px] font-medium text-(--pl-ink)">
                {dropped}
              </span>{' '}
              件
            </span>
          </Setting>
        )}
      </PopoverContent>
    </Popover>
  )
}
