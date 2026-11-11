'use client'

import { cn } from '@/lib/utils'
import { byDay, dayHeadingOf } from '@/lib/library-days'
import type { Recording } from '@/repository/recordings'
import {
  type Picking,
  type PickStarting,
  clockOf,
} from '@/components/library/library-cards'
import { RecordingTile } from '@/components/library/recording-tile'

const TILE_GRID =
  'grid grid-cols-[repeat(auto-fill,minmax(calc(200rem/16),1fr))] gap-x-4 gap-y-[calc(22rem/16)]'

/** Every recording in one grid, newest first, the day each started on written over the first of that day. */
export function DateGrid({
  recordings,
  now,
  picking,
  onPickStart,
}: {
  recordings: Recording[]
  now: Date
  picking?: Picking
  onPickStart?: PickStarting
}) {
  return (
    <ul data-slot="date-grid" className={TILE_GRID}>
      {byDay(recordings).flatMap(({ day, items }) => {
        const heading = dayHeadingOf(day, now)

        return items.map((recording, nth) => (
          <li
            key={recording.id}
            data-recording={recording.id}
            className="min-w-0"
          >
            <p
              aria-hidden={nth > 0 || undefined}
              className={cn(
                'mb-[calc(9rem/16)] flex h-4 gap-1.5 text-sub leading-4 font-semibold text-ink',
                nth > 0 && 'invisible',
              )}
            >
              {nth === 0 && (
                <>
                  {heading.near}
                  <span
                    className={cn(
                      'font-code',
                      heading.near && 'font-medium text-ink-2',
                    )}
                  >
                    {heading.date}
                  </span>
                </>
              )}
            </p>
            <RecordingTile
              recording={recording}
              meta={`${recording.channel} · ${clockOf(recording)}`}
              picking={picking}
              onPickStart={onPickStart}
            />
          </li>
        ))
      })}
    </ul>
  )
}
