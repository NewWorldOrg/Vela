'use client'

import type { BookingMark } from '@/lib/guide'
import { bookingMarkOf } from '@/lib/guide'
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

type CellSize = 'md' | 's' | 'xs'

const GENRE_LABEL =
  'ml-[calc(5rem/16)] border-l border-dotted border-line-strong pl-[calc(5rem/16)] font-medium text-ink-3'

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

export function ProgramCell({
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
  const size: CellSize = height < 40 ? 'xs' : height < 72 ? 's' : 'md'
  const mark = bookingMarkOf(p.booking)

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
        'absolute right-px left-px z-[1] cursor-pointer overflow-hidden rounded-md border text-left transition-[translate,box-shadow] duration-150 ease-toy hover:z-[2] hover:-translate-x-px hover:-translate-y-px hover:shadow-pop active:translate-x-px active:translate-y-px active:shadow-pop-none',
        past ? GENRE_CLASS_PAST[p.genre] : GENRE_CLASS[p.genre],
        size === 'md' && 'px-[calc(7rem/16)] py-1',
        size === 's' && 'px-[calc(7rem/16)] py-0.5',
        size === 'xs' && 'flex items-center px-1.5 py-0',
        selected && 'z-[3] border-brand shadow-pop',
      )}
    >
      {size === 'xs' ? (
        <span
          className={cn(
            'overflow-hidden text-[calc(10rem/16)] leading-tight font-medium text-ellipsis whitespace-nowrap',
            past && 'text-ink-2',
          )}
        >
          {mark && <BookingGlyph mark={mark} size={size} />}
          {p.title}
          <span className={cn(GENRE_LABEL, 'text-[calc(10rem/16)]')}>
            {p.genreLabel}
          </span>
        </span>
      ) : (
        <>
          <span
            className={cn(
              'block leading-snug font-bold text-ink [font-feature-settings:"palt"]',
              size === 'md' ? 'text-sub' : 'text-cap',
              past && 'text-ink-2',
            )}
          >
            {mark && <BookingGlyph mark={mark} size={size} />}
            <span className="mr-[calc(5rem/16)] font-code text-micro font-medium text-ink-3 tabular-nums">
              {p.startLabel.slice(3)}
            </span>
            {p.title}
            <span className={cn(GENRE_LABEL, 'text-micro')}>
              {p.genreLabel}
            </span>
          </span>
          {p.endUndecided && (
            <span className="mt-px block text-[calc(10.8rem/16)] leading-normal text-ink-2">
              終了未定
            </span>
          )}
          {size === 'md' && p.description && (
            <span className="mt-px block text-[calc(10.8rem/16)] leading-normal text-ink-2">
              {p.description}
            </span>
          )}
        </>
      )}
    </button>
  )
}

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
