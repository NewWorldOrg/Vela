'use client'

import { cn } from '@/lib/utils'
import { PauseGlyph, PlayGlyph, VolumeIcon } from '@/components/vela/icons'

/**
 * What a press answered with, in the middle of the picture.
 *
 * `play` and `pause` are the pair every player draws. `volume` is the one
 * YouTube draws and almost nobody else does — and it is the one worth having,
 * because the level lives in a slider on a bar that is not up while the keys
 * are being used, so without this a volume press has no answer at all.
 */
export type PlayerBezel =
  | { was: 'play' | 'pause' }
  /** The level the press moved to, 0-1. Silence and 0% are the same state. */
  | { was: 'volume'; level: number }

/**
 * What the middle of the picture says.
 *
 * Two different things live there and they are not the same thing:
 *
 * `standing` is the mark that stays while the picture is not running. Netflix
 * draws it whenever a title is paused and it is the whole of what a stopped
 * picture looks like there; video.js calls it `vjs-big-play-button` and draws
 * it before the first press. A stopped picture with nothing in the middle of
 * it is indistinguishable from a picture of something that is not moving,
 * which is the state a reader is in every time a still frame is on screen.
 *
 * `bezel` is the mark that answers a press and goes. YouTube blooms one out of
 * the centre on every play, pause, volume step and mute. It exists because the
 * control that was pressed is at the bottom edge — or is a key, and nowhere at
 * all — while the eye is in the middle, and because for a pause the picture's
 * own answer is that it stopped changing, which takes a moment to read as an
 * answer.
 *
 * The measurements are YouTube's shipping `www-player.css`, read from the live
 * build: `.ytp-bezel` is `52px` square, `border-radius:26px`,
 * `background:rgba(0,0,0,.5)`, `animation:ytp-bezel-fadeout .5s linear 1
 * normal forwards` over `0%{opacity:1} to{opacity:0;transform:scale(2)}`, with
 * a `40px` glyph inside it. The number beside a volume press is a second
 * element — `.ytp-bezel-text`, `padding:10px 20px`, `font-size:175%`,
 * `background:rgba(0,0,0,.5)`, `border-radius:3px`, at `top:10%` — and it does
 * not grow with the circle.
 *
 * Seeking is answered somewhere else: see `PlayerSeekFlash`.
 *
 * `standing` is a control and `bezel` is not. That distinction is the whole of
 * this file: a mark answers a press that has already happened, a target takes
 * one. v3.35 said neither should be a control, on the grounds that a second
 * one would be read out twice — and what that produced was a 68px play symbol
 * in the middle of a stopped picture that could not be pressed, while the only
 * thing on screen that could was 40px at the bottom edge. Every player that
 * draws this symbol makes it the largest target it has.
 */
export function PlayerCenter({
  standing,
  onStanding,
  bezel,
  className,
}: {
  /** The target that stays: what the picture would do if it were pressed now. */
  standing?: 'play' | 'pause'
  /** What pressing it does. The same thing the bar's own transport does. */
  onStanding?: () => void
  /**
   * The mark that answers a press. The number changes on every press so that a
   * second press restarts the animation rather than being swallowed by the one
   * still running — the same press twice is two answers, not one.
   */
  bezel?: PlayerBezel & { nth: number }
  className?: string
}) {
  return (
    <div
      data-slot="player-center"
      className={cn(
        'pointer-events-none absolute inset-0 flex items-center justify-center',
        className,
      )}
    >
      {standing && (
        <button
          type="button"
          data-slot="player-center-standing"
          aria-label={standing === 'play' ? '再生' : '一時停止'}
          onClick={onStanding}
          /*
            A press here must not also reach the picture underneath, which
            would run the toggle twice and land back where it started.
          */
          onMouseDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          className="pointer-events-auto flex size-[68px] cursor-pointer items-center justify-center rounded-full bg-black/45 text-white transition-[background-color,scale] duration-150 ease-out hover:bg-black/60 hover:scale-105 active:scale-95 focus-visible:shadow-ring focus-visible:outline-none"
        >
          {standing === 'play' ? (
            <PlayGlyph className="ml-[3px] size-[34px]" />
          ) : (
            <PauseGlyph className="size-[34px]" />
          )}
        </button>
      )}
      {bezel && (
        <span
          aria-hidden="true"
          key={bezel.nth}
          data-slot="player-center-bezel"
        >
          {bezel.was === 'volume' && (
            <span
              data-slot="player-center-bezel-text"
              className="absolute inset-x-0 top-[10%] animate-player-bezel-text text-center"
            >
              <span className="inline-block rounded-[3px] bg-black/50 px-5 py-2.5 font-code text-[22px] leading-none font-medium text-white tabular-nums">
                {Math.floor(bezel.level * 100)}%
              </span>
            </span>
          )}
          <span className="absolute top-1/2 left-1/2 -mt-[26px] -ml-[26px] flex size-[52px] animate-player-burst items-center justify-center rounded-full bg-black/50 text-white">
            {bezel.was === 'volume' ? (
              <VolumeIcon level={bezel.level} className="size-8" />
            ) : bezel.was === 'play' ? (
              <PlayGlyph className="ml-[2px] size-10" />
            ) : (
              <PauseGlyph className="size-10" />
            )}
          </span>
        </span>
      )}
    </div>
  )
}
