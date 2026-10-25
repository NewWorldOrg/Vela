'use client'

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
import { cn } from '@/lib/utils'
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

export const PLAYBACK_SPEEDS = ['0.5', '1.0', '1.25', '1.5', '2.0'] as const

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
  captionStyle,
  onCaptionStyle,
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
          'w-auto min-w-[17rem] rounded-lg border-white/20 bg-(--pl-bg) px-4 pt-6 pb-[calc(22rem/16)] text-(--pl-ink) shadow-pop-xl',
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
