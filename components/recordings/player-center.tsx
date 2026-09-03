'use client'

import { cn } from '@/lib/utils'
import { PauseGlyph, PlayGlyph } from '@/components/vela/icons'

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
 * `burst` is the mark that answers a press and goes. YouTube blooms one out of
 * the centre on every play and pause. It exists because the control that was
 * pressed is at the bottom edge — or is a key, and nowhere at all — while the
 * eye is in the middle, and because for a pause the picture's own answer is
 * that it stopped changing, which takes a moment to read as an answer.
 *
 * Neither is a control. The play button on the bar is the one that has a name
 * and a place in the tab order; a second one here would be read out twice and
 * would have to be tabbed past to reach anything. The press area under it is
 * the picture's, and it is what carries the press through.
 */
export function PlayerCenter({
  standing,
  burst,
  className,
}: {
  /** The mark that stays: what the picture would do if it were pressed now. */
  standing?: 'play' | 'pause'
  /**
   * The mark that answers a press. The number changes on every press so that a
   * second press restarts the animation rather than being swallowed by the one
   * still running — the same press twice is two answers, not one.
   */
  burst?: { was: 'play' | 'pause'; nth: number }
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      data-slot="player-center"
      className={cn(
        'pointer-events-none absolute inset-0 flex items-center justify-center',
        className,
      )}
    >
      {standing && (
        <span
          data-slot="player-center-standing"
          className="flex size-[68px] items-center justify-center rounded-full bg-black/45 text-white"
        >
          {standing === 'play' ? (
            <PlayGlyph className="ml-[3px] size-[34px]" />
          ) : (
            <PauseGlyph className="size-[34px]" />
          )}
        </span>
      )}
      {burst && (
        <span
          key={burst.nth}
          data-slot="player-center-burst"
          className="absolute flex size-[54px] animate-player-burst items-center justify-center rounded-full bg-black/50 text-white"
        >
          {burst.was === 'play' ? (
            <PlayGlyph className="ml-[2px] size-10" />
          ) : (
            <PauseGlyph className="size-10" />
          )}
        </span>
      )}
    </div>
  )
}
