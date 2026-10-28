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
  ONE_LINE_BELOW_PX,
} from '@/components/guide/guide-metrics'
import { RecordIcon } from '@/components/vela/icons'

type CellSize = 'md' | 's' | 'xs'

const MARK_BOX: Record<CellSize, string> = {
  md: 'size-[calc(13rem/16)]',
  s: 'size-3',
  xs: 'size-[calc(11rem/16)]',
}

const RECORDING_DOT: Record<CellSize, string> = {
  md: 'size-[calc(9rem/16)]',
  s: 'size-2',
  xs: 'size-[calc(7rem/16)]',
}

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
  const size: CellSize =
    height < ONE_LINE_BELOW_PX ? 'xs' : height < 72 ? 's' : 'md'
  const mark = bookingMarkOf(p.booking)
  const title = halfWidthOf(p.title)

  return (
    <button
      type="button"
      data-opens="program-panel"
      data-tap-exempt="a cell is as tall as the programme is long"
      data-cell-size={size}
      aria-pressed={selected}
      onClick={() => onSelect(p)}
      style={{
        top: `${(p.startMin / 60) * HOUR_PX}px`,
        height: `${height}px`,
      }}
      className={cn(
        'guide-cell',
        past ? GENRE_CLASS_PAST[p.genre] : GENRE_CLASS[p.genre],
        size === 'md' && 'px-[calc(7rem/16)] py-1',
        size === 's' && 'px-[calc(7rem/16)] py-px',
        size === 'xs' && 'justify-center px-1.5 py-0',
        mark === 'booked' && 'outline-2 -outline-offset-2 outline-mint',
        mark === 'recording' && 'outline-2 -outline-offset-2 outline-coral',
        selected && 'z-[3] border-brand shadow-pop',
      )}
    >
      {size === 'xs' ? (
        <span className={cn('guide-cell-line', past && 'text-ink-2')}>
          {mark && <BookingGlyph mark={mark} size={size} />}
          {title}
        </span>
      ) : (
        <span className="guide-cell-text">
          <span className={cn('guide-cell-title', past && 'text-ink-2')}>
            {mark && <BookingGlyph mark={mark} size={size} />}
            <span className="guide-cell-start">{p.startLabel.slice(3)}</span>
            {title}
          </span>
          <span className="guide-cell-desc">
            <span className="guide-cell-genre">
              {genreWordOf(p.genreLabel)}
            </span>
            {p.endUndecided && '終了未定 '}
            {p.description && halfWidthOf(p.description)}
          </span>
        </span>
      )}
    </button>
  )
})

function BookingGlyph({ mark, size }: { mark: BookingMark; size: CellSize }) {
  return (
    <span
      data-booking-mark={mark}
      className={cn(
        'mr-[calc(5rem/16)] inline-flex items-center justify-center align-[-2px]',
        MARK_BOX[size],
        mark === 'recording' ? 'text-coral' : 'text-mint',
      )}
    >
      {mark === 'recording' ? (
        <span
          aria-hidden="true"
          className={cn('rounded-full bg-current', RECORDING_DOT[size])}
        />
      ) : (
        <RecordIcon className={MARK_BOX[size]} />
      )}
      <span className="sr-only">{MARK_SAYS[mark]}</span>
    </span>
  )
}
