'use client'

import { memo, useCallback, useMemo, useRef } from 'react'

import { halfWidthOf } from '@/lib/guide-cell'
import {
  GUTTER_PX,
  gridMinWidthOf,
  fallsWithin,
  isDrawn,
  type MinuteRange,
  nowLineTopOf,
  openingScrollScriptOf,
  openingScrollTopOf,
  unscheduledSpansOf,
} from '@/lib/guide'
import { cn } from '@/lib/utils'
import type { Channel } from '@/repository/channels'
import type { Program } from '@/repository/programs'
import {
  HOUR_REM,
  cellTimeOf,
  hourPxIn,
  remOfMinutes,
} from '@/components/guide/guide-metrics'
import { ChannelMark } from '@/components/vela/channel-mark'
import { InFull } from '@/components/vela/in-full'
import { ProgramCell } from '@/components/guide/program-cell'
import { useCameWithTheHtml } from '@/hooks/useCameWithTheHtml'
import { useDrawnRange } from '@/hooks/useDrawnRange'
import { useFilledSoon } from '@/hooks/useFilledSoon'
import { useGlyphsAhead } from '@/hooks/useGlyphsAhead'
import { useNewcomers } from '@/hooks/useNewcomers'

const GUTTER_FLEX = `0 0 ${GUTTER_PX}px`

const COLUMN_FLEX = '1 1 0'

const UNSCHEDULED_LABEL_REM = 3.25

const NOTHING_CARRIED: Program[] = []

/** Before this minute the line runs along the top of the day, and its time is written under it, clear of the channels' heads. */
const NOW_LABEL_BELOW_MIN = 6

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
      className={cn(joined && 'joins', 'h-11 min-w-0 px-0.5 pb-1')}
    >
      {drawn && (
        <div className="flex h-10 min-w-0 items-center gap-2 overflow-hidden rounded-md bg-surface pr-3 pl-2 text-ui font-semibold">
          <ChannelMark logo={c.logo} no={c.no} />
          <InFull says={halfWidthOf(c.name)}>
            <span className="min-w-0 flex-1 truncate">
              {halfWidthOf(c.name)}
            </span>
          </InFull>
          <span
            aria-hidden="true"
            data-no={c.no}
            className="ml-auto shrink-0 font-code text-sub font-medium text-ink-2 after:content-[attr(data-no)]"
          />
        </div>
      )}
    </div>
  )
})

const GuideColumn = memo(function GuideColumn({
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
        .map((p) => (
          <ProgramCell
            key={p.id}
            program={p}
            time={cellTimeOf(p, nowMin)}
            splitAt={
              nowMin !== undefined && cellTimeOf(p, nowMin) === 'onAir'
                ? remOfMinutes(nowMin - p.startMin)
                : undefined
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
  glyphLoads,
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
  glyphLoads: ReadonlyArray<readonly [string, string]>
}) {
  const hours = Array.from(
    { length: windowHours },
    (_, i) => windowStartHour + i,
  )
  const cameWithTheHtml = useCameWithTheHtml()
  const filled = useFilledSoon()
  const newcomers = useNewcomers(channels.map((c) => c.id))
  const nowAtOpening = useRef(nowMin)
  const opened = useRef(false)
  const scroller = useRef<HTMLDivElement | null>(null)
  const drawn = useDrawnRange(scroller, {
    columns: channels.length,
    windowMin: windowHours * 60,
    filled,
    settled: true,
    day: dayKey,
    nowMin,
  })

  useGlyphsAhead(glyphLoads, filled)

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

    const heading =
      node.querySelector<HTMLElement>('[data-guide-heading]')?.parentElement
        ?.offsetHeight ?? 0

    node.scrollTop = openingScrollTopOf(
      nowAtOpening.current,
      hourPxIn(node.ownerDocument),
      node.clientHeight - heading,
    )
  }, [])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={openAtNow}
        data-guide-scroll
        data-guide-measured={
          drawn.minutes.from === 0 && drawn.minutes.to === windowHours * 60
            ? ''
            : undefined
        }
        className="min-h-0 flex-1 overflow-auto"
      >
        <div
          key={dayKey}
          className="bg-bg"
          style={{ minWidth: gridMinWidthOf(channels.length) }}
        >
          <div className="sticky top-0 z-10 flex bg-bg">
            <div
              data-guide-gutter
              style={{ flex: GUTTER_FLEX }}
              className="sticky left-0 z-[1] bg-bg"
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
            className="relative flex"
            style={{ height: remOfMinutes(windowHours * 60) }}
          >
            {cameWithTheHtml && nowMin !== undefined && (
              <script
                dangerouslySetInnerHTML={{
                  __html: openingScrollScriptOf(nowMin, HOUR_REM),
                }}
              />
            )}
            <div
              data-guide-gutter
              style={{ flex: GUTTER_FLEX }}
              className="sticky left-0 z-[4] bg-bg"
            >
              {hours.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-start pt-1 pl-1 font-code text-title font-bold text-ink-2"
                  style={{ height: remOfMinutes(60) }}
                >
                  {h % 24}
                  <span className="sr-only">時</span>
                </div>
              ))}
            </div>

            {channels.map((c, nth) => {
              const carried =
                filled && isDrawn(drawn.columns, nth)
                  ? (carriedBy.get(c.id) ?? NOTHING_CARRIED)
                  : undefined

              return (
                <GuideColumn
                  key={c.id}
                  channel={c}
                  joined={newcomers.has(c.id)}
                  filled={filled}
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

            {filled &&
              nowMin !== undefined &&
              (() => {
                return (
                  <div
                    data-now-line
                    className="pointer-events-none absolute right-0 left-0 z-[5] h-0.5 text-accent"
                    style={{
                      top: nowLineTopOf(nowMin, HOUR_REM, windowHours),
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 100 2"
                      preserveAspectRatio="none"
                      className="block h-0.5 w-full"
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
                    <span
                      className={cn(
                        'guide-now-pop absolute left-0 bg-bg py-px pr-0.5 font-code text-micro font-bold text-acc-text',
                        nowMin < NOW_LABEL_BELOW_MIN
                          ? 'top-1'
                          : 'top-1/2 -translate-y-1/2',
                      )}
                    >
                      {nowLabel}
                    </span>
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
                      style={{ left: `${GUTTER_PX}px` }}
                    />
                  </div>
                )
              })()}
          </div>
        </div>
      </div>
    </div>
  )
}
