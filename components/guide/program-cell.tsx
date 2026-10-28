'use client'

import { memo } from 'react'

import type { BookingMark } from '@/lib/guide'
import { bookingMarkOf } from '@/lib/guide'
import { genreWordOf, halfWidthOf } from '@/lib/guide-cell'
import {
  RECORDING_IN_PROGRESS_TERM,
  RESERVATION_STANDING_TERMS,
} from '@/lib/state-terms'
import { cn } from '@/lib/utils'
import type { Program } from '@/repository/programs'
import {
  GENRE_CLASS,
  GENRE_CLASS_PAST,
  HOUR_PX,
} from '@/components/guide/guide-metrics'
import { RecordIcon } from '@/components/vela/icons'

const MARK_SAYS: Record<BookingMark, string> = {
  booked: RESERVATION_STANDING_TERMS.scheduled.label,
  recording: RECORDING_IN_PROGRESS_TERM.label,
}

export const ProgramCell = memo(function ProgramCell({
  program: p,
  past,
  selected,
  onSelect,
}: {
  program: Program
  past: boolean
  selected: boolean
  onSelect: (program: Program) => void
}) {
  const height = (p.durationMin / 60) * HOUR_PX
  const mark = bookingMarkOf(p.booking)

  return (
    <button
      type="button"
      data-opens="program-panel"
      data-tap-exempt="a cell is as tall as the programme is long"
      aria-pressed={selected}
      onClick={() => onSelect(p)}
      style={{
        top: `${(p.startMin / 60) * HOUR_PX}px`,
        height: `${height}px`,
      }}
      className={cn(
        'guide-cell',
        past ? GENRE_CLASS_PAST[p.genre] : GENRE_CLASS[p.genre],
        mark === 'booked' && 'outline-2 -outline-offset-2 outline-mint',
        mark === 'recording' && 'outline-2 -outline-offset-2 outline-coral',
        selected && 'z-[3] border-brand shadow-pop',
      )}
    >
      <span className="guide-cell-body">
        <span className="guide-cell-text">
          <span className={cn('guide-cell-title', past && 'text-ink-2')}>
            {mark && <BookingGlyph mark={mark} />}
            <span className="guide-cell-start">{p.startLabel.slice(3)}</span>
            {halfWidthOf(p.title)}
          </span>
          <span className="guide-cell-desc">
            <span className="guide-cell-genre">
              {genreWordOf(p.genreLabel)}
            </span>
            {p.endUndecided && '終了未定 '}
            {p.description && halfWidthOf(p.description)}
          </span>
        </span>
      </span>
    </button>
  )
})

function BookingGlyph({ mark }: { mark: BookingMark }) {
  return (
    <span
      data-booking-mark={mark}
      className={cn(
        'guide-cell-mark mr-[calc(5rem/16)] inline-flex items-center justify-center align-[-2px]',
        mark === 'recording' ? 'text-coral' : 'text-mint',
      )}
    >
      {mark === 'recording' ? (
        <span
          aria-hidden="true"
          className="guide-cell-dot rounded-full bg-current"
        />
      ) : (
        <RecordIcon className="guide-cell-mark" />
      )}
      <span className="sr-only">{MARK_SAYS[mark]}</span>
    </span>
  )
}
