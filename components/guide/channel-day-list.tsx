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
import { ChevronDownIcon, RecordIcon } from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'

const ROOM_ABOVE_NOW_PX = 48

/** Scrolls the list to the programme on the air with the end of the one before it showing, or to the top of a day with nothing on the air. */
function alignToNow(node: HTMLElement): void {
  const onAir = node.querySelector<HTMLElement>('[data-on-air]')

  node.scrollTop = onAir ? Math.max(0, onAir.offsetTop - ROOM_ABOVE_NOW_PX) : 0
}

type RowSpan = { id: string; top: number; bottom: number }

/** Where each row lies in the list, read after every change so the row at the top can still be found once rows come in above it. */
function spansOf(node: HTMLElement): RowSpan[] {
  return Array.from(
    node.querySelectorAll<HTMLElement>('[data-programme]'),
    (row) => ({
      id: row.dataset.programme!,
      top: row.offsetTop,
      bottom: row.offsetTop + row.offsetHeight,
    }),
  )
}

/** One channel's day as rows from the top of the day, opened at the programme on the air; a row opens its detail under itself. */
export function ChannelDayList({
  channelId,
  dayKey,
  programs,
  nowMin,
  nowLabel,
  openId,
  onToggle,
  detailOf,
}: {
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
  const spans = useRef<RowSpan[]>([])
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

    const scrolled = node.scrollTop
    const kept = spans.current.find((span) => span.bottom > scrolled)
    const row = kept
      ? node.querySelector<HTMLElement>(
          `[data-programme="${CSS.escape(kept.id)}"]`,
        )
      : null

    if (kept && row) {
      node.scrollTop = row.offsetTop + scrolled - kept.top
    }
  }, [programs.length, firstId])

  useLayoutEffect(() => {
    if (list.current) {
      spans.current = spansOf(list.current)
    }
  })

  useEffect(() => {
    const node = list.current

    if (!node) {
      return
    }

    const byHand = (): void => {
      moved.current = true
    }
    let shown = node.clientHeight > 0
    const watch = new ResizeObserver(() => {
      const showing = node.clientHeight > 0

      spans.current = spansOf(node)

      if (showing && !shown) {
        moved.current = false
        alignToNow(node)
      }

      shown = showing
    })

    for (const input of MOVED_BY_HAND) {
      node.addEventListener(input, byHand, { passive: true })
    }

    watch.observe(node)

    return () => {
      for (const input of MOVED_BY_HAND) {
        node.removeEventListener(input, byHand)
      }

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
      className="relative min-h-0 flex-1 overflow-y-auto rounded-lg bg-surface [overflow-anchor:none]"
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
              data-on-air={onAir ? '' : undefined}
              data-past={past ? '' : undefined}
              className={cn(
                'border-b border-dashed border-line last:border-b-0',
                past && 'bg-surface-2',
                onAir && 'bg-brand-soft/45',
              )}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => onToggle(p)}
                className={cn(
                  pressable,
                  'flex min-h-14 w-full items-start gap-3 py-3 pr-1.5 pl-3.5 text-left',
                  onAir && 'shadow-[inset_3px_0_0_var(--color-brand)]',
                )}
              >
                <span className="flex w-[calc(46rem/16)] shrink-0 flex-col font-code tabular-nums">
                  <span
                    className={cn(
                      'text-ui font-medium',
                      past ? 'text-ink-3' : 'text-ink',
                    )}
                  >
                    {p.startLabel}
                  </span>
                  <span className="text-cap text-ink-3">
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
                      past ? 'text-ink-3' : 'text-ink-2',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'guide-cell-genre-dot mr-1.5',
                        GENRE_MARK_CLASS[p.genre],
                      )}
                    />
                    <span className="mr-1.5 text-ink-3">
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

                <span className="flex size-11 shrink-0 items-center justify-center self-center text-ink-3">
                  <ChevronDownIcon
                    className={cn(
                      'size-[calc(15rem/16)] transition-transform',
                      open && 'rotate-180',
                    )}
                  />
                </span>
              </button>

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
