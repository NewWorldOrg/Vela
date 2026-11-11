'use client'

import { Fragment, memo } from 'react'

import { fallsWithin, type MinuteRange, unscheduledSpansOf } from '@/lib/guide'
import { cn } from '@/lib/utils'
import type { Channel } from '@/repository/channels'
import type { Program } from '@/repository/programs'
import {
  HOUR_REM,
  cellTimeOf,
  remOfMinutes,
} from '@/components/guide/guide-metrics'
import { ProgramCell } from '@/components/guide/program-cell'
import { ReservePlus } from '@/components/guide/reserve-plus'
import type { GridReserving } from '@/components/guide/guide-grid'

export const COLUMN_FLEX = '1 1 0'

const UNSCHEDULED_LABEL_REM = 3.25

/** The shortest programme that keeps a `+` clear of its foot. */
const PLUS_MIN_DURATION = 15

export const GuideColumn = memo(function GuideColumn({
  channel: c,
  joined,
  filled,
  carried,
  from,
  to,
  windowHours,
  nowMin,
  selectedId,
  onSelect,
  reserving,
}: {
  channel: Channel
  joined: boolean
  filled: boolean
  carried?: Program[]
  from: number
  to: number
  windowHours: number
  nowMin?: number
  selectedId?: string
  onSelect: (program: Program) => void
  reserving?: GridReserving
}) {
  const minutes: MinuteRange = { from, to }

  return (
    <div
      data-guide-column
      data-guide-sub={c.sub ? '' : undefined}
      style={{ flex: COLUMN_FLEX }}
      className={cn(
        !filled ? 'invisible' : joined && 'joins',
        'relative min-w-0 [contain:size_layout_style]',
      )}
    >
      {c.sub &&
        carried &&
        unscheduledSpansOf(carried, windowHours * 60).map((span) => {
          return (
            <div
              key={span.startMin}
              data-guide-unscheduled
              style={{
                top: remOfMinutes(span.startMin),
                height: remOfMinutes(span.durationMin),
              }}
              className="absolute right-0.5 left-0.5 flex items-center justify-center overflow-hidden rounded-sm"
            >
              {(span.durationMin / 60) * HOUR_REM >= UNSCHEDULED_LABEL_REM && (
                <span className="text-micro tracking-[0.2em] text-ink-2 [writing-mode:vertical-rl]">
                  編成なし
                </span>
              )}
            </div>
          )
        })}

      {carried
        ?.filter((p) => fallsWithin(minutes, p))
        .map((p) => {
          const time = cellTimeOf(p, nowMin)

          return (
            <Fragment key={p.id}>
              <ProgramCell
                program={p}
                time={time}
                splitAt={
                  nowMin !== undefined && time === 'onAir'
                    ? remOfMinutes(nowMin - p.startMin)
                    : undefined
                }
                selected={p.id === selectedId}
                onSelect={onSelect}
              />
              {reserving &&
                time === 'ahead' &&
                !p.booking &&
                !p.watch &&
                p.durationMin >= PLUS_MIN_DURATION && (
                  <ReservePlus
                    programmeId={p.id}
                    title={p.title}
                    {...reserving}
                    style={{ top: `calc(${remOfMinutes(p.startMin)} + 8px)` }}
                  />
                )}
            </Fragment>
          )
        })}
    </div>
  )
})
