'use client'

import { formatLabel, type FormatChoice } from '@/lib/playback-format'
import { PlayerSegmentedControl } from '@/components/recordings/player-segmented-control'
import { Setting } from '@/components/recordings/setting'

export interface FormatSettingProps {
  choices: readonly FormatChoice[]
  chosen?: FormatChoice
  onChoose: (next: FormatChoice) => void
}

export function FormatSetting({
  choices,
  chosen,
  onChoose,
  off = false,
  note,
}: FormatSettingProps & { off?: boolean; note?: string }) {
  if (choices.length === 0) {
    return null
  }

  return (
    <Setting label="形式" note={note}>
      <PlayerSegmentedControl
        label="形式"
        options={choices}
        value={off ? undefined : chosen}
        onChange={onChoose}
        nameOf={formatLabel}
        off={off}
      />
    </Setting>
  )
}
