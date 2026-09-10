'use client'

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { formatPlayhead, formatPlayerTime } from '@/lib/format'
import { videoFrameHref } from '@/repository/video-paths'

const SETTLES = 140

const STEP = 10

const PAGE = 60

export function PlayerSeek({
  id,
  duration,
  position,
  buffered,
  drops,
  onChoose,
  onScrubbing,
  frameHref = videoFrameHref,
}: {
  id: string
  duration: number
  position: number
  buffered?: number
  drops?: number[]
  onChoose: (second: number) => void
  onScrubbing?: (at: number | null) => void
  frameHref?: (id: string, at: number) => string
}) {
  const rail = useRef<HTMLDivElement>(null)
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hover, setHover] = useState<{ pct: number; at: number } | null>(null)
  const [frameAt, setFrameAt] = useState<number | null>(null)
  const [framesGone, setFramesGone] = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)
  const held = useRef<number | null>(null)

  const shown = dragging ?? position
  const playedPct = duration > 0 ? (shown / duration) * 100 : 0
  const loadedPct =
    duration > 0 && buffered !== undefined
      ? Math.min(100, (buffered / duration) * 100)
      : 0

  const secondAt = (clientX: number) => {
    const box = rail.current?.getBoundingClientRect()

    if (!box || box.width === 0) {
      return null
    }

    const share = Math.min(1, Math.max(0, (clientX - box.left) / box.width))

    return { pct: share * 100, at: Math.round(share * duration) }
  }

  const forget = () => {
    if (settling.current) {
      clearTimeout(settling.current)
      settling.current = null
    }
  }

  const follow = (clientX: number) => {
    const found = secondAt(clientX)

    if (!found) {
      return
    }

    setHover(found)
    forget()

    if (!framesGone) {
      settling.current = setTimeout(() => setFrameAt(found.at), SETTLES)
    }
  }

  const leave = () => {
    forget()
    setHover(null)
    setFrameAt(null)
  }

  const choose = (second: number) => {
    onChoose(Math.min(duration, Math.max(0, second)))
  }

  const take = (event: PointerEvent<HTMLDivElement>) => {
    const found = secondAt(event.clientX)

    if (!found) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    held.current = found.at
    setDragging(found.at)
    setHover(found)
    onScrubbing?.(found.at)
  }

  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (held.current === null) {
      follow(event.clientX)

      return
    }

    const found = secondAt(event.clientX)

    if (found) {
      held.current = found.at
      setDragging(found.at)
      setHover(found)
      onScrubbing?.(found.at)
      forget()

      if (!framesGone) {
        settling.current = setTimeout(() => setFrameAt(found.at), SETTLES)
      }
    }
  }

  const letGo = (event: PointerEvent<HTMLDivElement>) => {
    const at = held.current

    if (at === null) {
      return
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId)
    held.current = null
    choose(at)
    setDragging(null)
    onScrubbing?.(null)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowLeft: -STEP,
      ArrowRight: STEP,
      ArrowDown: -STEP,
      ArrowUp: STEP,
      PageDown: -PAGE,
      PageUp: PAGE,
    }

    if (event.key in moves) {
      event.preventDefault()
      choose(position + moves[event.key])

      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      choose(0)

      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      choose(duration)
    }
  }

  const wanted = hover !== null || dragging !== null

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="再生位置"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={`${formatPlayhead(shown)} / ${formatPlayhead(duration)}`}
      data-slot="player-seek"
      data-wanted={wanted ? 'true' : undefined}
      onPointerMove={drag}
      onPointerDown={take}
      onPointerUp={letGo}
      onPointerCancel={letGo}
      onPointerLeave={() => held.current === null && leave()}
      onKeyDown={onKeyDown}
      className="tap-target group relative h-[18px] cursor-pointer focus-visible:outline-none"
    >
      <div
        ref={rail}
        className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/20 transition-[height] duration-100 ease-out group-hover:h-[5px] group-focus-visible:h-[5px] group-data-[wanted]:h-[5px]"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 rounded-full bg-white/40"
          style={{ width: `${loadedPct}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 rounded-full bg-(--pl-accent)"
          style={{ width: `${playedPct}%` }}
        />
      </div>
      {duration > 0 &&
        drops?.map((second) => (
          <span
            key={second}
            aria-hidden="true"
            title="ドロップ発生位置"
            className="absolute top-1/2 -ml-[3px] size-1.5 -translate-y-1/2 rounded-full bg-(--pl-coral)"
            style={{ left: `${Math.min(100, (second / duration) * 100)}%` }}
          />
        ))}
      <span
        aria-hidden="true"
        data-slot="player-seek-knob"
        className="absolute top-1/2 -ml-[6.5px] size-[13px] origin-center -translate-y-1/2 scale-0 rounded-full bg-(--pl-accent) transition-transform duration-100 ease-out group-hover:scale-100 group-focus-visible:scale-100 group-data-[wanted]:scale-100"
        style={{ left: `${playedPct}%` }}
      />
      {hover && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[20px] z-10 -translate-x-1/2"
          style={{ left: `${hover.pct}%` }}
        >
          {!framesGone && frameAt !== null && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={frameHref(id, frameAt)}
              alt=""
              decoding="async"
              onError={() => {
                setFramesGone(true)
                setFrameAt(null)
              }}
              className="h-[70px] w-[124px] rounded-md border border-white/25 bg-(--pl-video) object-cover"
            />
          )}
          <span className="mt-1 block rounded-sm bg-black/80 px-2 py-px text-center font-code text-[12px] font-medium text-white">
            {formatPlayerTime(hover.at)}
          </span>
        </div>
      )}
    </div>
  )
}
