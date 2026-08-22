'use client'

import { useCallback, useRef } from 'react'

import {
  GUTTER_PX,
  gridMinWidthOf,
  openingScrollTopOf,
  unscheduledSpansOf,
} from '@/lib/guide'
import { cn } from '@/lib/utils'
import type { Channel } from '@/repository/channels'
import type { Program } from '@/repository/programs'
import { HOUR_PX } from '@/components/guide/guide-metrics'
import { ProgramCell } from '@/components/guide/program-cell'

/** The hour gutter is the one column of the grid that is not a channel. */
const GUTTER_FLEX = `0 0 ${GUTTER_PX}px`

/**
 * Every channel takes an equal share of the grid, a service that has split
 * among them.
 *
 * The share has no floor of its own, and does not need one: the grid is laid
 * out on a width of at least a column apiece, so the smallest share it can
 * ever be asked to divide is the floor itself. Saying it a second time here,
 * as a flex basis the column may grow from but not shrink below, would be the
 * same arithmetic written twice — and the copy that was never reached is the
 * copy that gets edited to something else.
 */
const COLUMN_FLEX = '1 1 0'

/**
 * The shortest band that can say what it is: four full-width glyphs set down
 * the page at the micro step, each carrying its letter-spacing after it.
 *
 * A run shorter than its own name drops the name and is left to the dashed
 * rules at its ends, the way a cell too short for its description drops that.
 * The label is centred in a band that clips, so what it would otherwise lose
 * is a slice off both ends at once — half a 編 above and half a し below,
 * which reads as a fault in the drawing rather than as a run too short to
 * name. Half an hour between two of a split service's own programmes is an
 * ordinary gap, and it is under this.
 */
const UNSCHEDULED_LABEL_PX = 52

export function GuideGrid({
  channels,
  programs,
  windowStartHour,
  windowHours,
  nowMin,
  nowLabel,
  selectedId,
  onSelect,
}: {
  channels: Channel[]
  programs: Program[]
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
  const openingTop = useRef(openingScrollTopOf(nowMin, HOUR_PX))
  const opened = useRef(false)

  /**
   * The grid is put where it opens as its node is attached, which is before
   * the browser has painted anything, and once. A re-read of the page — the
   * live signal arrives, the panel opens, the reader pages to another day —
   * hands the same node new contents rather than a new node, so the position
   * survives it, and a reader who has scrolled since keeps where they were.
   *
   * It is the ref rather than an effect that carries this: nothing here is
   * state to be kept in step with a prop, and the one thing being read is
   * where the reader is, which only the node knows.
   */
  const openAtNow = useCallback((node: HTMLDivElement | null) => {
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
        className="rounded-lg bg-surface"
        style={{ minWidth: `${gridMinWidthOf(channels.length)}px` }}
      >
        <div className="sticky top-0 z-10 flex rounded-t-lg border-b border-line bg-surface">
          <div
            data-guide-gutter
            style={{ flex: GUTTER_FLEX }}
            className="sticky left-0 z-[1] rounded-tl-lg border-r border-dashed border-line bg-surface"
          />
          {channels.map((c) => (
            <div
              key={c.id}
              data-guide-heading
              style={{ flex: COLUMN_FLEX }}
              className="min-w-0 overflow-hidden border-l border-line px-1.5 py-2 text-center text-sub font-bold text-ellipsis whitespace-nowrap first-of-type:border-l-0"
            >
              {c.no && (
                <span className="mr-[5px] font-code text-[10.5px] font-normal text-ink-3">
                  {c.no}
                </span>
              )}
              {c.name}
            </div>
          ))}
        </div>

        <div
          className="relative flex rounded-b-lg"
          style={{ height: `${windowHours * HOUR_PX}px` }}
        >
          <div
            data-guide-gutter
            style={{ flex: GUTTER_FLEX }}
            className="sticky left-0 z-[4] rounded-bl-lg border-r border-dashed border-line bg-surface"
          >
            {hours.map((h) => (
              <div
                key={h}
                className="flex items-start justify-center pt-1.5 font-code text-[11px] text-ink-3 first:border-t-0 [&+&]:border-t [&+&]:border-dashed [&+&]:border-line"
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

          {channels.map((c) => {
            const carried = programs.filter((p) => p.channelId === c.id)

            return (
              <div
                key={c.id}
                data-guide-column
                style={{ flex: COLUMN_FLEX }}
                className={cn(
                  'relative min-w-0 border-l border-dashed border-line first-of-type:border-l-0',
                  c.sub && 'bg-surface-2',
                )}
              >
                {c.sub &&
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

                {carried.map((p) => (
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
          })}

          {nowMin !== undefined && (
            <div
              data-now-line
              className="pointer-events-none absolute right-0 left-0 z-[5] h-0.5 bg-brand"
              style={{ top: `${(nowMin / 60) * HOUR_PX}px` }}
            >
              <span className="absolute -top-2.5 left-1.5 rounded-full bg-brand px-2 py-px font-code text-[10.5px] font-medium text-on-brand">
                {nowLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
