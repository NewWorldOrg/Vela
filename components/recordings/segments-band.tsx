'use client'

import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

import { cn } from '@/lib/utils'
import {
  STEP_SEC,
  boundaryRange,
  formatSegmentField,
  snapped,
} from '@/lib/segment-edits'
import { BOUNDARY } from '@/lib/segment-terms'
import type { WatchLink } from '@/lib/watch-link'
import type { RecordingSegment } from '@/repository/recording-segments'
import { usePlayhead } from '@/components/recordings/watch-link-seat'

const STEPS: Partial<Record<string, number>> = {
  ArrowLeft: -STEP_SEC,
  ArrowDown: -STEP_SEC,
  ArrowRight: STEP_SEC,
  ArrowUp: STEP_SEC,
}

function share(second: number, lengthSec: number): string {
  return `${(Math.min(lengthSec, Math.max(0, second)) / lengthSec) * 100}%`
}

function Playhead({
  link,
  lengthSec,
}: {
  link: WatchLink | undefined
  lengthSec: number
}) {
  const playhead = usePlayhead(link)

  if (playhead === undefined) {
    return null
  }

  return (
    <span
      data-slot="segments-playhead"
      aria-hidden
      style={{ left: share(playhead, lengthSec) }}
      className="pointer-events-none absolute -inset-y-[calc(3rem/16)] z-10 w-0.5 -translate-x-1/2 rounded-full bg-ink"
    />
  )
}

function BoundaryGrip({
  segments,
  nth,
  lengthSec,
  snaps,
  onGrab,
  onLetGo,
  secondAt,
  onMove,
}: {
  segments: readonly RecordingSegment[]
  nth: number
  lengthSec: number
  snaps: readonly number[]
  onGrab: () => void
  onLetGo: () => void
  secondAt: (clientX: number) => number | undefined
  onMove: (nth: number, second: number) => void
}) {
  const at = segments[nth].startsAtSec
  const range = boundaryRange(segments, nth)

  const grab = (event: PointerEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    event.preventDefault()
    event.currentTarget.focus()
    onGrab()

    const move = (moved: globalThis.PointerEvent) => {
      const second = secondAt(moved.clientX)

      if (second !== undefined) {
        onMove(nth, snapped(second, snaps))
      }
    }

    const letGo = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', letGo)
      window.removeEventListener('pointercancel', letGo)
      onLetGo()
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', letGo)
    window.addEventListener('pointercancel', letGo)
  }

  const step = (event: KeyboardEvent<HTMLSpanElement>) => {
    const by = STEPS[event.key]

    if (by === undefined) {
      return
    }

    event.preventDefault()
    onMove(nth, at + by)
  }

  return (
    <span
      role="slider"
      tabIndex={0}
      aria-label={BOUNDARY}
      aria-valuemin={range?.least ?? at}
      aria-valuemax={range?.most ?? at}
      aria-valuenow={at}
      aria-valuetext={formatSegmentField(at)}
      data-slot="segments-boundary"
      style={{ left: share(at, lengthSec) }}
      onPointerDown={grab}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={step}
      className="tap-target absolute -inset-y-[calc(5rem/16)] z-20 w-[calc(12rem/16)] -translate-x-1/2 cursor-ew-resize touch-none rounded-full border border-edge bg-surface shadow-pop outline-none transition-[box-shadow] duration-150 ease-out hover:shadow-pop-lg focus-visible:shadow-pop-ring"
    />
  )
}

/** The whole recording as a strip, its breaks painted, the playhead drawn across it, and while changing, a grip on every boundary. */
export function SegmentsBand({
  lengthSec,
  segments,
  snaps,
  link,
  follows,
  editing,
  onMove,
}: {
  lengthSec: number
  segments: readonly RecordingSegment[]
  snaps: readonly number[]
  link: WatchLink | undefined
  follows: boolean
  editing: boolean
  onMove: (nth: number, second: number) => void
}) {
  const strip = useRef<HTMLDivElement>(null)
  const grabbed = useRef(false)

  const secondAt = (clientX: number) => {
    const box = strip.current?.getBoundingClientRect()

    if (!box || box.width <= 0) {
      return undefined
    }

    return (
      (Math.min(box.width, Math.max(0, clientX - box.left)) / box.width) *
      lengthSec
    )
  }

  return (
    <div
      ref={strip}
      data-slot="segments-band"
      onClick={(event) => {
        if (grabbed.current) {
          return
        }

        const second = follows ? secondAt(event.clientX) : undefined

        if (second !== undefined) {
          link?.seek(second)
        }
      }}
      className={cn(
        'relative h-7 w-full rounded-md bg-surface-2',
        follows && 'cursor-pointer',
      )}
    >
      <div aria-hidden className="absolute inset-0 overflow-hidden rounded-md">
        {segments.map((one) =>
          one.kind === 'break' ? (
            <span
              key={`${one.startsAtSec}-${one.endsAtSec}`}
              data-slot="segments-break"
              style={{
                left: share(one.startsAtSec, lengthSec),
                width: share(one.endsAtSec - one.startsAtSec, lengthSec),
              }}
              className="absolute inset-y-0 border-x border-lemon-line bg-lemon-soft"
            />
          ) : null,
        )}
      </div>
      <Playhead link={link} lengthSec={lengthSec} />
      {editing &&
        segments.map((one, nth) =>
          nth === 0 ? null : (
            <BoundaryGrip
              key={nth}
              segments={segments}
              nth={nth}
              lengthSec={lengthSec}
              snaps={snaps}
              onGrab={() => {
                grabbed.current = true
              }}
              onLetGo={() => {
                window.setTimeout(() => {
                  grabbed.current = false
                }, 0)
              }}
              secondAt={secondAt}
              onMove={onMove}
            />
          ),
        )}
    </div>
  )
}
