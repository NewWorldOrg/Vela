'use client'

import { useRef, useState, type KeyboardEvent } from 'react'

import { formatPlayhead } from '@/lib/format'
import type { SeekMarks } from '@/repository/recordings'
import { videoFrameHref } from '@/repository/video-paths'
import type { PlaybackSeeking } from '@/repository/videos'

/** How long the pointer rests before the frame under it is asked for. */
const SETTLES = 140

/** What an arrow key and a page key move by. */
const STEP = 10

const PAGE = 60

/**
 * The bar the recording is followed and chosen along.
 *
 * Where the picture is transcoded as it plays there is no byte range to seek
 * by, so choosing a position is not a scrub: the stream is built again from
 * the second chosen. The bar says so under itself rather than moving a
 * playhead that the transport cannot honour.
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
  drops,
  marks,
  seeking,
  onChoose,
  frameHref = videoFrameHref,
}: {
  id: string
  duration: number
  position: number
  drops?: number[]
  marks?: SeekMarks
  seeking?: PlaybackSeeking
  onChoose: (second: number) => void
  frameHref?: (id: string, at: number) => string
}) {
  const rail = useRef<HTMLDivElement>(null)
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hover, setHover] = useState<{ pct: number; at: number } | null>(null)
  const [frameAt, setFrameAt] = useState<number | null>(null)
  const [framesGone, setFramesGone] = useState(false)

  const playedPct = duration > 0 ? (position / duration) * 100 : 0

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

  return (
    <div className="mt-2">
      <div
        role="slider"
        tabIndex={0}
        aria-label="再生位置"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${formatPlayhead(position)} / ${formatPlayhead(duration)}`}
        onPointerMove={(event) => follow(event.clientX)}
        onPointerLeave={leave}
        onPointerDown={(event) => {
          const found = secondAt(event.clientX)

          if (found) {
            choose(found.at)
          }
        }}
        onKeyDown={onKeyDown}
        className="tap-target relative h-[18px] cursor-pointer focus-visible:shadow-ring focus-visible:outline-none"
      >
        <div
          ref={rail}
          className="absolute top-[7px] right-0 left-0 h-[5px] rounded-full bg-white/15"
        />
        <div
          className="absolute top-[7px] left-0 h-[5px] rounded-full bg-(--pl-accent)"
          style={{ width: `${playedPct}%` }}
        />
        {marks?.cmSpans?.map((span) => (
          <span
            key={span.leftPct}
            className="absolute top-[7px] h-[5px] rounded-full [background:repeating-linear-gradient(115deg,rgba(215,172,94,.62)_0_4px,rgba(215,172,94,.26)_4px_8px)]"
            style={{ left: `${span.leftPct}%`, width: `${span.widthPct}%` }}
          />
        ))}
        {marks?.chapterPcts?.map((pct) => (
          <span
            key={pct}
            className="absolute top-px -ml-px h-[17px] w-0.5 rounded-[1px] bg-(--pl-lemon) opacity-85"
            style={{ left: `${pct}%` }}
          />
        ))}
        {duration > 0 &&
          drops?.map((second) => (
            <span
              key={second}
              className="absolute top-[5px] -ml-1 size-2 rounded-full bg-(--pl-coral)"
              style={{ left: `${Math.min(100, (second / duration) * 100)}%` }}
            />
          ))}
        <span
          className="absolute top-[2.5px] -ml-[7px] size-3.5 rounded-full border-2 border-(--pl-accent) bg-white"
          style={{ left: `${playedPct}%` }}
        />
        {hover && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[22px] z-10 -translate-x-1/2"
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
            <span className="mt-1 block rounded-full bg-black/70 px-2 py-px text-center font-code text-[11px] text-(--pl-ink)">
              {formatPlayhead(hover.at)}
            </span>
          </div>
        )}
      </div>
      {seeking === 'byStartingAgain' && (
        <p className="mt-1 text-[11px] leading-relaxed text-(--pl-ink-3)">
          シークのたびにトランスコーダを立て直すため、シーク後に絵が出るまで数秒かかります。
        </p>
      )}
    </div>
  )
}
