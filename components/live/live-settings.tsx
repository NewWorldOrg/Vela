'use client'

import type { ReactNode } from 'react'

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
import { Setting } from '@/components/recordings/player-setting'
import {
  CaptionStyleEntry,
  CaptionStylePanel,
  gearWidth,
  useGearPanel,
} from '@/components/recordings/caption-style-controls'
import type { CaptionStyle } from '@/lib/caption-style'
import { cn } from '@/lib/utils'

function Figure({ children }: { children: ReactNode }) {
  return (
    <span className="font-code text-[calc(15rem/16)] font-medium text-(--pl-ink)">
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
  captionStyle,
  onCaptionStyle,
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
  captionStyle?: CaptionStyle
  onCaptionStyle?: (next: CaptionStyle) => void
  onOpenChange?: (open: boolean) => void
}) {
  const gear = useGearPanel(onOpenChange)
  const captions = captionStyle && onCaptionStyle

  return (
    <Popover open={gear.open} onOpenChange={gear.change}>
      <PopoverTrigger aria-label="設定" className={PLAYER_GLYPH_BUTTON}>
        <SettingsIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        container={container}
        aria-label="設定"
        side="top"
        align="end"
        sideOffset={10}
        updatePositionStrategy="always"
        className={cn(
          'w-auto min-w-[17rem] rounded-lg border-white/20 bg-(--pl-bg) p-4 text-(--pl-ink) shadow-pop-xl',
          gearWidth(gear.panel),
        )}
      >
        {captions && gear.panel === 'captions' ? (
          <CaptionStylePanel
            style={captionStyle}
            onChange={onCaptionStyle}
            onBack={gear.back}
          />
        ) : (
          <>
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
                  className="text-sub text-(--pl-ink-2)"
                >
                  <Figure>{dropped}</Figure> 件
                </span>
                {droppedByThoseStillWatching !== undefined &&
                  droppedByThoseStillWatching !== dropped && (
                    <span
                      data-slot="live-dropped-still-watching"
                      className="text-sub text-(--pl-ink-3)"
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
                  className="text-sub text-(--pl-ink-2)"
                >
                  取りこぼし <Figure>{lostOnTheWayIn}</Figure> 件
                </span>
              </Setting>
            )}
            {captions && (
              <CaptionStyleEntry
                onOpen={gear.toCaptions}
                returning={gear.returning}
              />
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
