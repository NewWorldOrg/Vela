'use client'

import { memo, useCallback, useMemo, useRef } from 'react'

import {
  GUIDE_HOLD_MS,
  columnDelayMs,
  delayOf,
  groupDelayOf,
  glyphsOf,
  nowLineDelayMs,
  risesIn,
} from '@/lib/arrival'
import {
  GUTTER_PX,
  gridMinWidthOf,
  fallsWithin,
  isDrawn,
  type MinuteRange,
  openingScrollTopOf,
  unscheduledSpansOf,
} from '@/lib/guide'
import { cn } from '@/lib/utils'
import type { Channel } from '@/repository/channels'
import type { Program } from '@/repository/programs'
import { HOUR_PX } from '@/components/guide/guide-metrics'
import { ChannelMark } from '@/components/vela/channel-mark'
import { InFull } from '@/components/vela/in-full'
import { ProgramCell } from '@/components/guide/program-cell'
import { useArrived } from '@/hooks/useArrived'
import { useDrawnRange } from '@/hooks/useDrawnRange'
import { useGlyphsAhead } from '@/hooks/useGlyphsAhead'
import { useNewcomers } from '@/hooks/useNewcomers'

const GUTTER_FLEX = `0 0 ${GUTTER_PX}px`

const COLUMN_FLEX = '1 1 0'

const UNSCHEDULED_LABEL_PX = 52

const NOTHING_CARRIED: Program[] = []

const GuideHeading = memo(function GuideHeading({
  channel: c,
  drawn,
  joined,
}: {
  channel: Channel
  drawn: boolean
  joined: boolean
}) {
  return (
    <div
      data-guide-heading
      style={{ flex: COLUMN_FLEX }}
      className={cn(
        joined && 'joins',
        'flex min-w-0 items-center justify-center gap-1.5 overflow-hidden border-l border-line px-1.5 py-2 text-sub font-bold first-of-type:border-l-0',
      )}
    >
      {drawn && (
        <>
          <ChannelMark logo={c.logo} no={c.no} />
          <InFull says={c.name}>
            <span className="min-w-0 truncate">{c.name}</span>
          </InFull>
        </>
      )}
    </div>
  )
})

const GuideColumn = memo(function GuideColumn({
  channel: c,
  nth,
  joined,
  carried,
  from,
  to,
  windowHours,
  nowMin,
  selectedId,
  onSelect,
}: {
  channel: Channel
  nth: number
  joined: boolean
  carried?: Program[]
  from: number
  to: number
  windowHours: number
  nowMin?: number
  selectedId?: string
  onSelect: (program: Program) => void
}) {
  const minutes: MinuteRange = { from, to }

  return (
    <div
      data-guide-column
      data-guide-sub={c.sub ? '' : undefined}
      style={{ flex: COLUMN_FLEX, ...delayOf(columnDelayMs(nth)) }}
      className={cn(
        joined ? 'joins' : risesIn(nth),
        'relative min-w-0 border-l border-dashed border-line [contain:size_layout_style] first-of-type:border-l-0',
        c.sub && 'bg-surface-2',
      )}
    >
      {c.sub &&
        carried &&
        unscheduledSpansOf(carried, windowHours * 60).map((span) => {
          const height = (span.durationMin / 60) * HOUR_PX

          return (
            <div
              key={span.startMin}
              data-guide-unscheduled
              style={{
                top: `${(span.startMin / 60) * HOUR_PX}px`,
                height: `${height}px`,
              }}
              className="absolute right-0 left-0 flex items-center justify-center overflow-hidden border-y border-dashed border-line"
            >
              {height >= UNSCHEDULED_LABEL_PX && (
                <span className="text-micro tracking-[0.2em] text-ink-3 [writing-mode:vertical-rl]">
                  編成なし
                </span>
              )}
            </div>
          )
        })}

      {carried
        ?.filter((p) => fallsWithin(minutes, p))
        .map((p) => (
          <ProgramCell
            key={p.id}
            program={p}
            past={
              nowMin !== undefined &&
              !p.endUndecided &&
              p.startMin + p.durationMin <= nowMin
            }
            selected={p.id === selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  )
})

export function GuideGrid({
  channels,
  programs,
  dayKey,
  windowStartHour,
  windowHours,
  nowMin,
  nowLabel,
  selectedId,
  onSelect,
}: {
  channels: Channel[]
  programs: Program[]
  dayKey: string
  windowStartHour: number
  windowHours: number
  nowMin?: number
  nowLabel?: string
  selectedId?: string
  onSelect: (program: Program) => void
}) {
  const hours = Array.from(
    { length: windowHours },
    (_, i) => windowStartHour + i,
  )
  const arrived = useArrived()
  const newcomers = useNewcomers(channels.map((c) => c.id))
  const glyphs = useMemo(
    () =>
      glyphsOf([
        ...channels.map((c) => c.name),
        ...programs.flatMap((p) => [
          p.title,
          p.genreLabel,
          p.description ?? '',
        ]),
      ]),
    [channels, programs],
  )

  useGlyphsAhead(glyphs)
  const openingTop = useRef(openingScrollTopOf(nowMin, HOUR_PX))
  const opened = useRef(false)
  const scroller = useRef<HTMLDivElement | null>(null)
  const drawn = useDrawnRange(scroller, {
    columns: channels.length,
    windowMin: windowHours * 60,
    hourPx: HOUR_PX,
  })

  const carriedBy = useMemo(() => {
    const by = new Map<string, Program[]>()

    for (const p of programs) {
      const held = by.get(p.channelId)

      if (held) {
        held.push(p)
      } else {
        by.set(p.channelId, [p])
      }
    }

    return by
  }, [programs])

  const openAtNow = useCallback((node: HTMLDivElement | null) => {
    scroller.current = node

    if (!node || opened.current) {
      return
    }

    opened.current = true
    node.scrollTop = openingTop.current
  }, [])

  return (
    <div
      ref={openAtNow}
      data-guide-scroll
      className="min-h-0 flex-1 overflow-auto rounded-lg"
    >
      <div
        key={dayKey}
        className="rounded-lg bg-surface"
        style={{ minWidth: `${gridMinWidthOf(channels.length)}px` }}
      >
        <div className="sticky top-0 z-10 flex rounded-t-lg border-b border-line bg-surface">
          <div
            data-guide-gutter
            style={{ flex: GUTTER_FLEX }}
            className="sticky left-0 z-[1] rounded-tl-lg border-r border-dashed border-line bg-surface"
          />
          {channels.map((c, nth) => (
            <GuideHeading
              key={c.id}
              channel={c}
              drawn={isDrawn(drawn.columns, nth)}
              joined={newcomers.has(c.id)}
            />
          ))}
        </div>

        <div
          {...arrived}
          className="relative flex rounded-b-lg"
          style={{
            height: `${windowHours * HOUR_PX}px`,
            ...groupDelayOf(GUIDE_HOLD_MS),
          }}
        >
          <div
            data-guide-gutter
            style={{ flex: GUTTER_FLEX }}
            className="sticky left-0 z-[4] rounded-bl-lg border-r border-dashed border-line bg-surface"
          >
            {hours.map((h) => (
              <div
                key={h}
                className="flex items-start justify-center pt-1.5 font-code text-cap text-ink-3 first:border-t-0 [&+&]:border-t [&+&]:border-dashed [&+&]:border-line"
                style={{ height: `${HOUR_PX}px` }}
              >
                {h % 24}時
              </div>
            ))}
          </div>

          <div
            className="pointer-events-none absolute top-0 right-0 bottom-0 z-0"
            style={{ left: `${GUTTER_PX}px` }}
            aria-hidden="true"
          >
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute right-0 left-0 h-0 border-t border-line"
                style={{ top: `${i * HOUR_PX}px` }}
              />
            ))}
          </div>

          {channels.map((c, nth) => {
            const carried = isDrawn(drawn.columns, nth)
              ? (carriedBy.get(c.id) ?? NOTHING_CARRIED)
              : undefined

            return (
              <GuideColumn
                key={c.id}
                channel={c}
                nth={nth}
                joined={newcomers.has(c.id)}
                carried={carried}
                from={drawn.minutes.from}
                to={drawn.minutes.to}
                windowHours={windowHours}
                nowMin={nowMin}
                selectedId={
                  carried?.some((p) => p.id === selectedId)
                    ? selectedId
                    : undefined
                }
                onSelect={onSelect}
              />
            )
          })}

          {nowMin !== undefined && (
            <div
              data-now-line
              className="pointer-events-none absolute right-0 left-0 z-[5] h-0.5 text-brand"
              style={{
                ...delayOf(nowLineDelayMs()),
                top: `${(nowMin / 60) * HOUR_PX}px`,
              }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 100 2"
                preserveAspectRatio="none"
                className="drawn block h-0.5 w-full [--stroke-length:100]"
              >
                <line
                  x1="0"
                  y1="1"
                  x2="100"
                  y2="1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <span className="arrives absolute -top-2.5 left-1.5 rounded-full bg-brand px-2 py-px font-code text-micro font-medium text-on-brand">
                {nowLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
