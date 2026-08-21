'use client'

import { useCallback, useRef } from 'react'

import { openingScrollTopOf } from '@/lib/guide'
import { cn } from '@/lib/utils'
import type { Channel } from '@/repository/channels'
import type { Program } from '@/repository/programs'
import { HOUR_PX } from '@/components/guide/guide-metrics'
import { ProgramCell } from '@/components/guide/program-cell'

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
      <div className="min-w-[1000px] rounded-lg bg-surface">
        <div className="sticky top-0 z-10 flex rounded-t-lg border-b border-line bg-surface">
          <div className="sticky left-0 z-[1] flex-[0_0_46px] rounded-tl-lg border-r border-dashed border-line bg-surface" />
          {channels.map((c) => (
            <div
              key={c.id}
              className={cn(
                'flex-1 border-l border-line px-1.5 py-2 text-center text-sub font-bold whitespace-nowrap first-of-type:border-l-0',
                c.sub &&
                  'flex-[0_0_78px] text-[11px] leading-tight whitespace-normal',
              )}
            >
              {c.no && (
                <span
                  className={cn(
                    'mr-[5px] font-code text-[10.5px] font-normal text-ink-3',
                    c.sub && 'mr-0 block',
                  )}
                >
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
          <div className="sticky left-0 z-[4] flex-[0_0_46px] rounded-bl-lg border-r border-dashed border-line bg-surface">
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
            className="pointer-events-none absolute top-0 right-0 bottom-0 left-[46px] z-0"
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

          {channels.map((c) => (
            <div
              key={c.id}
              className={cn(
                'relative min-w-0 flex-1 border-l border-dashed border-line first-of-type:border-l-0',
                c.sub && 'flex-[0_0_78px] bg-surface-2',
              )}
            >
              {programs
                .filter((p) => p.channelId === c.id)
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
          ))}

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
