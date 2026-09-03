'use client'

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { formatPlayhead, formatPlayerTime } from '@/lib/format'
import type { SeekMarks } from '@/repository/recordings'
import { videoFrameHref } from '@/repository/video-paths'

/** How long the pointer rests before the frame under it is asked for. */
const SETTLES = 140

/** What an arrow key and a page key move by. */
const STEP = 10

const PAGE = 60

/**
 * The bar the recording is followed and chosen along, laid over the picture.
 *
 * It is a line until it is wanted and a band while it is. Every player draws it
 * this way — video.js grows `.vjs-progress-holder` from `0.3em` to `1.667` times
 * that on `:hover` and holds it grown while `.vjs-scrubbing`; YouTube's is the
 * one everybody has seen go from a hair to a band with a knob on it. The reason
 * is that the bar lies across the bottom of the picture the whole time it is
 * up, and a band that thick over a picture nobody is seeking through is chrome
 * for its own sake, while a hair is not something a hand can catch.
 *
 * The knob follows the same rule: it is not drawn until the bar is wanted. A
 * knob standing on the line at all times is the one part of the bar that cannot
 * be read as part of the picture, and it is drawn at the playhead, which is
 * exactly where a reader is looking at the picture rather than at the bar.
 *
 * What is already loaded is drawn behind what has been played, in the same grey
 * every player uses for it: it says how much of what comes next is here
 * already, which on a route that builds the picture as it plays is the
 * difference between a seek that answers now and one that rebuilds.
 *
 * What choosing a position costs is read under the picture rather than under
 * the bar: where the picture is transcoded as it plays the stream is built
 * again from the second chosen, and that is a thing to know about the
 * recording, not a thing to press.
 *
 * The frame under the pointer is asked for by the second, and only after the
 * pointer rests. A recording the API has no frames for answers 404 for every
 * one of them — the older recordings do — and that is not a fault to draw: the
 * reading stays and the picture is not asked for again.
 */
export function PlayerSeek({
  id,
  duration,
  position,
  buffered,
  drops,
  marks,
  onChoose,
  onScrubbing,
  frameHref = videoFrameHref,
}: {
  id: string
  duration: number
  position: number
  /**
   * How far ahead of the head the picture is already loaded, in seconds.
   *
   * Drawn at `white/40` on a `white/20` track — the pair YouTube ships and
   * media-chrome copies byte for byte (`rgb(255 255 255 / .4)` over
   * `rgb(255 255 255 / .2)`).
   */
  buffered?: number
  drops?: number[]
  marks?: SeekMarks
  onChoose: (second: number) => void
  /**
   * The second being dragged out, or nothing once the hand lets go. The player
   * reads it out beside the transport while it is held, the way every player
   * does: the reading is where a reader looks to find out where a drag has got
   * to, and one that keeps saying where the picture still is, is the screen
   * disagreeing with the hand.
   */
  onScrubbing?: (at: number | null) => void
  frameHref?: (id: string, at: number) => string
}) {
  const rail = useRef<HTMLDivElement>(null)
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hover, setHover] = useState<{ pct: number; at: number } | null>(null)
  const [frameAt, setFrameAt] = useState<number | null>(null)
  const [framesGone, setFramesGone] = useState(false)
  /**
   * The position being dragged out, until the hand lets go of it.
   *
   * Held in a ref beside the state because the moves arrive faster than React
   * draws: read from the state, the first `pointermove` after the press still
   * sees `null` — the render that would have set it has not run — and the drag
   * is read as a hover and dropped. The ref is what the handlers branch on;
   * the state is what the drawing follows.
   */
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

  /**
   * The hand took hold of the bar. The pointer is captured so that a drag that
   * wanders off the bar — which every drag does, because the hand is watching
   * the picture and not the bar — keeps arriving here, and the position is
   * only asked for when the hand lets go: a drag across an hour of recording
   * would otherwise be a hundred requests, and on a route that rebuilds a
   * transcoder, a hundred rebuilds.
   */
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

  /** Whether the bar is being read or moved, and so drawn as a band. */
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
      {/*
        The line the marks and the knob are hung on. Everything inside it is
        positioned against this box and not against the row, so growing the
        band moves the whole bar at once and nothing has to be kept in step.
      */}
      <div
        ref={rail}
        className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/20 transition-[height] duration-100 ease-out group-hover:h-[5px] group-focus-visible:h-[5px] group-data-[wanted]:h-[5px]"
      >
        {/* What is here already but not yet played. */}
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
        {marks?.cmSpans?.map((span) => (
          <span
            key={span.leftPct}
            aria-hidden="true"
            className="absolute inset-y-0 rounded-full [background:repeating-linear-gradient(115deg,rgba(215,172,94,.62)_0_4px,rgba(215,172,94,.26)_4px_8px)]"
            style={{ left: `${span.leftPct}%`, width: `${span.widthPct}%` }}
          />
        ))}
      </div>
      {marks?.chapterPcts?.map((pct) => (
        <span
          key={pct}
          aria-hidden="true"
          className="absolute top-1/2 -ml-px h-[9px] w-0.5 -translate-y-1/2 rounded-[1px] bg-(--pl-lemon) opacity-85 transition-[height] duration-100 ease-out group-hover:h-[11px] group-data-[wanted]:h-[11px]"
          style={{ left: `${pct}%` }}
        />
      ))}
      {duration > 0 &&
        drops?.map((second) => (
          <span
            key={second}
            aria-hidden="true"
            className="absolute top-1/2 -ml-[3px] size-1.5 -translate-y-1/2 rounded-full bg-(--pl-coral)"
            style={{ left: `${Math.min(100, (second / duration) * 100)}%` }}
          />
        ))}
      {/*
        The knob, drawn only while the bar is wanted. `scale` and not
        `display`, so it grows out of the line it was already standing on
        rather than appearing beside it.
      */}
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
            // Behind the session, and a different second every time the
            // pointer rests. Neither is something the optimiser can hold.
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
