'use client'

import { cn } from '@/lib/utils'
import type { Program } from '@/repository/programs'
import {
  GENRE_CLASS,
  GENRE_CLASS_PAST,
  HOUR_PX,
} from '@/components/guide/guide-metrics'

/**
 * The genre in words, so that the colour of a cell is never the only thing
 * saying what kind of programme it holds.
 *
 * It runs on at the end of the title rather than taking a line or a corner of
 * its own: a cell is as tall as its programme is long, so a line reserved for
 * the genre would be a line taken from the ten-minute cells that have none to
 * give. Running on also settles what happens when the words do not fit — the
 * genre is last, so the genre is what the cell stops drawing, and the name of
 * the programme keeps the room it had.
 *
 * A dotted rule divides it from the title. `--line-strong` is the decorative
 * step, which is what a divider is; the ink step is `--ink-3`, the same one the
 * start time is set in, because the genre is the same kind of aside.
 */
const GENRE_LABEL =
  'ml-[5px] border-l border-dotted border-line-strong pl-[5px] font-medium text-ink-3'

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
  const size = height < 40 ? 'xs' : height < 72 ? 's' : 'md'

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
        'absolute right-px left-px z-[1] overflow-hidden rounded-md border text-left transition-[translate,box-shadow] duration-150 ease-toy hover:z-[2] hover:-translate-x-px hover:-translate-y-px hover:shadow-pop active:translate-x-px active:translate-y-px active:shadow-pop-none',
        past ? GENRE_CLASS_PAST[p.genre] : GENRE_CLASS[p.genre],
        size === 'md' && 'px-[7px] py-1',
        size === 's' && 'px-[7px] py-0.5',
        size === 'xs' && 'flex items-center px-1.5 py-0',
        selected && 'z-[3] border-brand shadow-pop',
      )}
    >
      {size === 'xs' ? (
        <span
          className={cn(
            'overflow-hidden text-[10px] leading-tight font-medium text-ellipsis whitespace-nowrap',
            past && 'text-ink-2',
          )}
        >
          {p.title}
          <span className={cn(GENRE_LABEL, 'text-[10px]')}>{p.genreLabel}</span>
        </span>
      ) : (
        <>
          <span
            className={cn(
              'block leading-snug font-bold text-ink [font-feature-settings:"palt"]',
              size === 'md' ? 'text-sub' : 'text-[11px]',
              past && 'text-ink-2',
            )}
          >
            <span className="mr-[5px] font-code text-[10.5px] font-medium text-ink-3 tabular-nums">
              {p.startLabel.slice(3)}
            </span>
            {p.title}
            <span className={cn(GENRE_LABEL, 'text-micro')}>
              {p.genreLabel}
            </span>
          </span>
          {p.endUndecided && (
            <span className="mt-px block text-[10.8px] leading-normal text-ink-2">
              終了未定
            </span>
          )}
          {size === 'md' && p.description && (
            <span className="mt-px block text-[10.8px] leading-normal text-ink-2">
              {p.description}
            </span>
          )}
        </>
      )}
    </button>
  )
}
