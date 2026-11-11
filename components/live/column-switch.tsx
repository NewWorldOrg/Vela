'use client'

import { foldBand, type FoldMotion } from '@/lib/live-fold'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { ColumnHead } from '@/components/live/column-head'
import { stepOf } from '@/components/live/remote-column-palette'

/** What the column shows while the data broadcast is open: its remote, or the channels. */
export type ColumnShows = 'remote' | 'channels'

const SHOWS = [
  { value: 'remote', label: 'リモコン' },
  { value: 'channels', label: 'チャンネル' },
]

/** The live column's head: `リモコン` and `チャンネル` to switch between, and the fold. The switch slides in from the right when it first stands, and out with the fold. */
export function ColumnSwitch({
  shows,
  onShows,
  folded,
  onFold,
  motion,
  controls,
}: {
  shows: ColumnShows
  onShows: (shows: ColumnShows) => void
  folded: boolean
  onFold: (folded: boolean) => void
  motion: FoldMotion
  controls?: string
}) {
  return (
    <ColumnHead folded={folded} onFold={onFold} controls={controls}>
      <div className="min-w-0 flex-1 overflow-clip [overflow-clip-margin:6px]">
        <div
          style={{ transitionDelay: stepOf(0, motion) }}
          className={foldBand(motion)}
        >
          <SegmentedControl
            aria-label="リモコンとチャンネル"
            options={SHOWS}
            value={shows}
            onValueChange={(next) =>
              onShows(next === 'channels' ? 'channels' : 'remote')
            }
          />
        </div>
      </div>
    </ColumnHead>
  )
}
