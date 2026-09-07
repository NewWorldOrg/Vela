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

const SOUND_NOT_WIRED = '音声の選択はこれから実装されます'

export function LiveSettings({
  container,
  profiles,
  profile,
  onChooseProfile,
  dropped,
  onOpenChange,
}: {
  container: HTMLElement | null
  profiles: LiveProfile[]
  profile?: string
  onChooseProfile: (next: string) => void
  dropped?: number
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
