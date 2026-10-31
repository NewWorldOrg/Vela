'use client'

import { memo } from 'react'

import type { BookingMark } from '@/lib/guide'
import { bookingMarkOf } from '@/lib/guide'
import { halfWidthOf } from '@/lib/guide-cell'
import {
  RECORDING_IN_PROGRESS_TERM,
  RESERVATION_STANDING_TERMS,
} from '@/lib/state-terms'
import { cn } from '@/lib/utils'
import type { Program } from '@/repository/programs'
import {
  GENRE_MARK_CLASS,
  groundOf,
  remOfMinutes,
  type CellTime,
} from '@/components/guide/guide-metrics'

const MARK_SAYS: Record<BookingMark, string> = {
  booked: RESERVATION_STANDING_TERMS.scheduled.label,
  recording: RECORDING_IN_PROGRESS_TERM.label,
}

/** The gap between two programmes, laid as half inside each. */
const HALF_GAP = '2px'

export const ProgramCell = memo(function ProgramCell({
  program: p,
  time,
  splitAt,
  selected,
  onSelect,
}: {
  program: Program
  time: CellTime
  /** How far down the cell the now line crosses it, while it is on the air. */
  splitAt?: string
  selected: boolean
  onSelect: (program: Program) => void
}) {
  const mark = bookingMarkOf(p.booking)
  const ended = time === 'ended'

  return (
    <button
      type="button"
      data-opens="program-panel"
      data-tap-exempt="a cell is as tall as the programme is long"
      data-time={time}
      aria-pressed={selected}
      onClick={() => onSelect(p)}
      style={{
        top: `calc(${remOfMinutes(p.startMin)} + ${HALF_GAP})`,
        height: `calc(${remOfMinutes(p.durationMin)} - 2 * ${HALF_GAP})`,
        ['--cell-ground' as string]: groundOf(
          p.genre,
          time,
          splitAt && `calc(${splitAt} - ${HALF_GAP})`,
        ),
      }}
      className={cn(
        'guide-cell',
        selected && 'z-[3] shadow-[inset_0_0_0_2px_var(--ink)]',
      )}
    >
      <span className="guide-cell-body">
        <span className="guide-cell-text">
          <span className={cn('guide-cell-title', ended && 'text-ink-2')}>
            {mark && (
              <span className="guide-cell-inline-mark">
                <BookingMarkOf mark={mark} glyphOnly />
              </span>
            )}
            <span className="guide-cell-start">
              <span
                aria-hidden="true"
                className={cn(
                  'guide-cell-genre-dot',
                  GENRE_MARK_CLASS[p.genre],
                  ended && 'opacity-45',
                )}
              />
              {p.startLabel}
            </span>
            {halfWidthOf(p.title)}
          </span>
          {mark && (
            <span className="guide-cell-marks">
              <BookingMarkOf mark={mark} />
            </span>
          )}
          {(p.endUndecided || p.description) && (
            <span className="guide-cell-desc">
              {p.endUndecided && '終了未定 '}
              {p.description && halfWidthOf(p.description)}
            </span>
          )}
        </span>
      </span>
      {mark && <span className="sr-only">{MARK_SAYS[mark]}</span>}
    </button>
  )
})

/** 予約 is a ring and its word, 録画中 a lit dot and its word, both in the accent. */
export function BookingMarkOf({
  mark,
  glyphOnly = false,
}: {
  mark: BookingMark
  /** A cell too short for a line of its own carries the ring or the dot before its title. */
  glyphOnly?: boolean
}) {
  return (
    <span
      data-booking-mark={mark}
      aria-hidden="true"
      className="inline-flex items-center gap-1.5 text-acc-text"
    >
      {mark === 'recording' ? (
        <span className="size-2 rounded-full bg-accent" />
      ) : (
        <span className="size-2.5 rounded-full border-[1.5px] border-acc-text" />
      )}
      {!glyphOnly && (mark === 'recording' ? MARK_SAYS.recording : '予約')}
    </span>
  )
}
