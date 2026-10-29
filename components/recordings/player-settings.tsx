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
import {
  GearActions,
  PlayerGear,
  type GearAction,
} from '@/components/recordings/player-gear'
import { PlayerSegmentedControl } from '@/components/recordings/player-segmented-control'
import { Setting } from '@/components/recordings/player-setting'
import {
  FormatSetting,
  type FormatSettingProps,
} from '@/components/recordings/format-setting'
import {
  CaptionStyleEntry,
  CaptionStylePanel,
  useGearPanel,
} from '@/components/recordings/caption-style-controls'
import type { CaptionStyle } from '@/lib/caption-style'

export const PLAYBACK_SPEEDS = ['0.5', '1.0', '1.25', '1.5', '2.0'] as const

const WHY_NEITHER_IS_CHOSEN =
  'エンコード版を再生中のため、画質と形式は選べません。'

const WHY_NO_QUALITY_IS_CHOSEN =
  'エンコード版を再生中のため、画質は選べません。'

export function PlayerSettings({
  container,
  profile,
  onChooseProfile,
  format,
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
  dock = null,
  open,
  actions = [],
}: {
  container: HTMLElement | null
  profile?: PlaybackProfile
  onChooseProfile: (next: string) => void
  format?: FormatSettingProps
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
  dock?: HTMLElement | null
  open?: boolean
  actions?: readonly GearAction[]
}) {
  const gear = useGearPanel(onOpenChange, open)
  const captions = captionStyle && onCaptionStyle
  const formatShown = format !== undefined && format.choices.length > 0
  const reason = formatShown ? WHY_NEITHER_IS_CHOSEN : WHY_NO_QUALITY_IS_CHOSEN
  const note = onTheFly ? undefined : reason

  return (
    <PlayerGear
      container={container}
      dock={dock}
      open={gear.open}
      onOpenChange={gear.change}
      panel={gear.panel}
      padding="px-4 pt-6 pb-[calc(22rem/16)]"
    >
      {captions && gear.panel === 'captions' ? (
        <CaptionStylePanel
          style={captionStyle}
          onChange={onCaptionStyle}
          onBack={gear.back}
          narrow={dock !== null}
        />
      ) : (
        <>
          <Setting label="画質" note={formatShown ? undefined : note}>
            <PlayerSegmentedControl
              label="画質"
              options={PLAYBACK_PROFILES}
              value={onTheFly ? profile : undefined}
              onChange={onChooseProfile}
              numeric
              off={!onTheFly}
            />
          </Setting>
          {format && <FormatSetting {...format} off={!onTheFly} note={note} />}
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
          <GearActions actions={actions} onDone={() => gear.change(false)} />
        </>
      )}
    </PlayerGear>
  )
}
