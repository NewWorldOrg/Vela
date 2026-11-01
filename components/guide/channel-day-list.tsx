'use client'

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

import { MOVED_BY_HAND } from '@/lib/arrival'

import { bookingMarkOf, isOnAir } from '@/lib/guide'
import { genreWordOf, halfWidthOf } from '@/lib/guide-cell'
import {
  RECORDING_IN_PROGRESS_TERM,
  RESERVATION_STANDING_TERMS,
} from '@/lib/state-terms'
import { cn } from '@/lib/utils'
import type { Program } from '@/repository/programs'
import { GENRE_MARK_CLASS } from '@/components/guide/guide-metrics'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  RecordIcon,
} from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'

const ROOM_ABOVE_NOW_PX = 48

/** Scrolls the list to the programme on the air with the end of the one before it showing, or to the top of a day with nothing on the air. */
function alignToNow(node: HTMLElement): void {
  const onAir = node.querySelector<HTMLElement>('[data-on-air]')

  node.scrollTop = onAir ? Math.max(0, onAir.offsetTop - ROOM_ABOVE_NOW_PX) : 0
}

/** The row at the top of the list and how far into it the list is scrolled, so the row can be kept in place when rows come in above it. */
function anchorOf(node: HTMLElement): { id: string; delta: number } | null {
  for (const row of node.querySelectorAll<HTMLElement>('[data-programme]')) {
    if (row.offsetTop + row.offsetHeight > node.scrollTop) {
      return {
        id: row.dataset.programme!,
        delta: node.scrollTop - row.offsetTop,
      }
    }
  }

  return null
}

/** One channel's day as rows from the top of the day, opened at the programme on the air; a row opens its detail under itself. */
export function ChannelDayList({
  channelId,
  dayKey,
  programs,
  nowMin,
  nowLabel,
  openId,
  chosenId,
  onToggle,
  detailOf,
  circleOf,
  className,
}: {
  /** The row whose detail stands beside the list, on a phone held on its side: ringed, and opened nowhere. */
  chosenId?: string
  className?: string
  /** What stands at the right end of a row that has not ended: the circle that reserves it in one press. */
  circleOf?: (program: Program) => ReactNode
  channelId: string
  dayKey: string
  programs: Program[]
  nowMin?: number
  nowLabel?: string
  openId?: string
  onToggle: (program: Program) => void
  detailOf: (program: Program) => ReactNode
}) {
  const list = useRef<HTMLDivElement | null>(null)
  const moved = useRef(false)
  const anchor = useRef<{ id: string; delta: number } | null>(null)
  const firstId = programs[0]?.id

  useLayoutEffect(() => {
    const node = list.current

    moved.current = false

    if (node) {
      alignToNow(node)
    }
  }, [channelId, dayKey])

  useLayoutEffect(() => {
    const node = list.current

    if (!node) {
      return
    }

    if (!moved.current) {
      alignToNow(node)

      return
    }

    const kept = anchor.current
    const row = kept
      ? node.querySelector<HTMLElement>(
          `[data-programme="${CSS.escape(kept.id)}"]`,
        )
      : null

    if (kept && row) {
      node.scrollTop = row.offsetTop + kept.delta
    }
  }, [programs.length, firstId])

  useEffect(() => {
    const node = list.current

    if (!node) {
      return
    }

    const byHand = (): void => {
      moved.current = true
      anchor.current = anchorOf(node)
    }
    const keep = (): void => {
      anchor.current = anchorOf(node)
    }
    let shown = node.clientHeight > 0
    const watch = new ResizeObserver(() => {
      const showing = node.clientHeight > 0

      if (showing && !shown) {
        moved.current = false
        alignToNow(node)
      }

      shown = showing
    })

    for (const input of MOVED_BY_HAND) {
      node.addEventListener(input, byHand, { passive: true })
    }

    node.addEventListener('scroll', keep, { passive: true })
    watch.observe(node)

    return () => {
      for (const input of MOVED_BY_HAND) {
        node.removeEventListener(input, byHand)
      }

      node.removeEventListener('scroll', keep)
      watch.disconnect()
    }
  }, [])

  useLayoutEffect(() => {
    const node = list.current
    const opened = node?.querySelector<HTMLElement>(
      '[aria-expanded="true"]',
    )?.parentElement

    if (node && opened) {
      node.scrollTo({ top: opened.offsetTop, behavior: 'smooth' })
    }
  }, [openId])

  return (
    <div
      ref={list}
      data-guide-list
      className={cn(
        'relative -mx-3.5 min-h-0 flex-1 overflow-y-auto border-t border-line bg-surface',
        className,
      )}
    >
      <ol>
        {programs.map((p) => {
          const onAir = isOnAir(p, nowMin)
          const past =
            nowMin !== undefined &&
            !p.endUndecided &&
            p.startMin + p.durationMin <= nowMin
          const open = p.id === openId
          const mark = bookingMarkOf(p.booking)
          const elapsed =
            onAir && nowMin !== undefined
              ? Math.min(1, (nowMin - p.startMin) / p.durationMin)
              : 0

          return (
            <li
              key={p.id}
              data-programme={p.id}
              data-keep={p.id}
              data-chosen={p.id === chosenId ? '' : undefined}
              data-on-air={onAir ? '' : undefined}
              data-past={past ? '' : undefined}
              className={cn(
                'border-b border-dashed border-line last:border-b-0',
                past && 'bg-surface-2',
                onAir && 'bg-brand-soft/45',
                p.id === chosenId &&
                  'relative z-[1] outline-2 -outline-offset-2 outline-brand-line',
              )}
            >
              <div
                className={cn(
                  'flex items-stretch pr-1',
                  onAir && 'shadow-[inset_3px_0_0_var(--color-brand)]',
                )}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onToggle(p)}
                  className={cn(
                    pressable,
                    'flex min-h-14 min-w-0 flex-1 items-start gap-3 py-3 pr-1.5 pl-3.5 text-left',
                  )}
                >
                  <span className="flex w-[calc(46rem/16)] shrink-0 flex-col font-code tabular-nums">
                    <span
                      className={cn(
                        'text-ui font-medium',
                        past ? 'text-ink-2' : 'text-ink',
                      )}
                    >
                      {p.startLabel}
                    </span>
                    <span className="text-cap text-ink-2">
                      {p.endUndecided ? '未定' : p.endLabel}
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-body leading-snug',
                        past ? 'text-ink-2' : 'text-ink',
                        onAir && 'font-bold',
                      )}
                    >
                      {mark && <BookingGlyph mark={mark} />}
                      {halfWidthOf(p.title)}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 line-clamp-2 text-sub',
                        past ? 'text-ink-2' : 'text-ink-2',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'guide-cell-genre-dot mr-1.5',
                          GENRE_MARK_CLASS[p.genre],
                        )}
                      />
                      <span className="mr-1.5 text-ink-2">
                        {genreWordOf(p.genreLabel)}
                      </span>
                      {p.description && halfWidthOf(p.description)}
                    </span>
                    {onAir && (
                      <span className="mt-2 flex items-center gap-2">
                        <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
                          <span
                            className="block h-full rounded-full bg-brand"
                            style={{ width: `${elapsed * 100}%` }}
                          />
                        </span>
                        {nowLabel && (
                          <span className="rounded-full bg-brand px-2 py-px font-code text-micro font-medium text-on-brand">
                            {nowLabel}
                          </span>
                        )}
                      </span>
                    )}
                  </span>

                  {!circleOf && (
                    <span className="flex size-11 shrink-0 items-center justify-center self-center text-ink-2">
                      <ChevronDownIcon
                        className={cn(
                          'size-[calc(15rem/16)] transition-transform',
                          open && 'rotate-180',
                        )}
                      />
                    </span>
                  )}
                </button>
                {circleOf && rightEndOf(p, open, past, circleOf, onToggle)}
              </div>

              {open && (
                <div className="border-t border-dashed border-line px-3.5 pt-3.5 pb-4">
                  {detailOf(p)}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** The right end of a row: the open row's close, nothing on a programme that has ended, the circle on the rest. */
function rightEndOf(
  program: Program,
  open: boolean,
  past: boolean,
  circleOf: (program: Program) => ReactNode,
  onToggle: (program: Program) => void,
): ReactNode {
  if (open) {
    return (
      <button
        type="button"
        aria-label="閉じる"
        onClick={() => onToggle(program)}
        className={cn(
          'flex size-11 shrink-0 items-center justify-center self-center rounded-full outline-none focus-visible:shadow-ring',
          pressable,
        )}
      >
        <span className="flex size-8 items-center justify-center rounded-full border-[1.5px] border-brand-line bg-brand-soft text-brand [&_svg]:size-4">
          <ChevronUpIcon />
        </span>
      </button>
    )
  }

  if (past) {
    return <span aria-hidden="true" className="w-11 shrink-0" />
  }

  return circleOf(program)
}

function BookingGlyph({ mark }: { mark: 'booked' | 'recording' }) {
  return (
    <span
      data-booking-mark={mark}
      className={cn(
        'mr-1.5 inline-flex items-center align-[-1px]',
        mark === 'recording' ? 'text-coral' : 'text-mint',
      )}
    >
      {mark === 'recording' ? (
        <span
          aria-hidden="true"
          className="size-[calc(9rem/16)] rounded-full bg-current"
        />
      ) : (
        <RecordIcon className="size-[calc(13rem/16)]" />
      )}
      <span className="sr-only">
        {mark === 'recording'
          ? RECORDING_IN_PROGRESS_TERM.label
          : RESERVATION_STANDING_TERMS.scheduled.label}
      </span>
    </span>
  )
}
