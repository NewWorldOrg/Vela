'use client'

import { useCallback, useState } from 'react'

/**
 * The channel list beside the picture, folding away and coming back.
 *
 * The fold itself is the canon's: the list is out of the page or it is not,
 * and the column it sits in changes width in one step so the picture beside it
 * is laid out once and not once a frame. What moves is what is inside that
 * column — the panel is wiped across by a clip whose near edge travels from
 * the side the list folds into, and the parts behind it arrive one after
 * another, the last of them close enough behind the first to read as one
 * gesture rather than a queue.
 *
 * Nothing here touches a length the page is measured from. The clip, the slide
 * and the fade are all the compositor's, so a fold running beside a picture
 * that is playing costs the picture nothing.
 *
 * The width still changes in one step, but it now waits for the fold that is
 * shutting: the column is held open until the panel has left it, so the
 * picture widens once, at the end, rather than into a panel still on its way
 * out. Opening is the other way round — the column is given its width at the
 * press and the panel arrives into it.
 */

/** Where a fold is: at rest, or on its way one way or the other. */
export type FoldPhase = 'still' | 'opening' | 'closing'

/** How the list is folding, for the parts of it that have to draw the fold. */
export interface FoldMotion {
  /** Whether the body of the list is on the page at all. */
  shown: boolean
  phase: FoldPhase
  /** Whether the parts arrive one behind another, or all at once. */
  staggered: boolean
  /** Said when nothing is moving any more. */
  onSettle: () => void
}

const AT_REST: { phase: FoldPhase; staggered: boolean } = {
  phase: 'still',
  staggered: true,
}

/** How far apart in time two neighbouring parts of the panel arrive. */
const STEP_MS = 26

/**
 * How many steps the cascade is allowed to run for, however many rows there
 * are. Past this the rows all move together, which is what a reader sees
 * anyway: the panel shows eight or nine of them at a time and the rest are
 * below its edge. Without the cap a line-up of twenty-seven — which is what a
 * full aerial gives — would still be arriving half a second after the press.
 */
const LAST_STEP = 9

/**
 * Whether the fold happens in one step. A reader who has asked for less motion
 * is given the list taken away on the press, so nothing is left waiting on a
 * transition that is never going to run.
 */
function atOnce(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * The fold, with the run it is in the middle of.
 *
 * The stored flag is what the list is; the phase is only how it is getting
 * there, and it is set by the press and by nothing else. A screen that opens
 * on a fold made yesterday — or one whose stored value arrives a moment after
 * the first paint, which is what reading the browser's store from a render
 * costs — therefore draws that fold without moving, because no press was made.
 *
 * Pressing again in the middle of a run reverses it rather than queueing a
 * second one: the phase turns round, the transitions retarget from wherever
 * they had got to, and the cascade is dropped for that run — a part waiting
 * out its delay while the run it belongs to has already been called off is a
 * part that appears to be stuck.
 */
export function useFoldingChannels(
  folded: boolean,
  onFold: (folded: boolean) => void,
): { motion: FoldMotion; fold: (next: boolean) => void } {
  const [run, setRun] = useState(AT_REST)

  const onSettle = useCallback(() => setRun(AT_REST), [])

  const fold = useCallback(
    (next: boolean) => {
      onFold(next)
      setRun((held) =>
        atOnce()
          ? AT_REST
          : {
              phase: next ? 'closing' : 'opening',
              staggered: held.phase === 'still',
            },
      )
    },
    [onFold],
  )

  return {
    motion: {
      shown: !folded || run.phase === 'closing',
      phase: run.phase,
      staggered: run.staggered,
      onSettle,
    },
    fold,
  }
}

/**
 * The panel as one object: its own box, grown on every side so that the ring
 * around a focused row is not cut off by the very clip that wipes the panel
 * in, with the clip's near edge run all the way across when there is to be
 * nothing left. The box is on the panel at rest as well as while it moves,
 * because a clip cannot be interpolated out of `none`.
 *
 * Open, the near edge travels in from the side the list folds into on a curve
 * that leaves fast and arrives slowly; shut, it travels back on a curve that
 * does the opposite, held back long enough for the rows to be most of the way
 * out before the panel closes over them.
 *
 * Every one of these is written out whole. A class assembled out of pieces is
 * a class the stylesheet is never built for: what is scanned is the text of
 * this file, not what the text comes to at run time.
 */
export function foldPanel(motion: FoldMotion | undefined): string {
  if (motion === undefined) {
    return ''
  }

  if (motion.phase === 'opening') {
    return '[clip-path:inset(-14px_-14px_-14px_-14px)] starting:[clip-path:inset(-14px_-14px_-14px_100%)] transition-[clip-path] duration-400 ease-unfurl motion-reduce:transition-none'
  }

  if (motion.phase === 'closing') {
    return motion.staggered
      ? '[clip-path:inset(-14px_-14px_-14px_100%)] transition-[clip-path] delay-110 duration-300 ease-furl motion-reduce:transition-none'
      : '[clip-path:inset(-14px_-14px_-14px_100%)] transition-[clip-path] duration-300 ease-furl motion-reduce:transition-none'
  }

  return '[clip-path:inset(-14px_-14px_-14px_-14px)]'
}

/**
 * One part behind the clip. It comes in from the side the panel folds into and
 * settles on the toy easing, so it overshoots its place by a pixel or two and
 * comes back — the same overshoot the knobs and the checks have. Leaving is
 * shorter and accelerates away, because a reader who has pressed to close is
 * waiting for the picture and not for the list.
 */
export function foldPart(motion: FoldMotion | undefined): string {
  if (motion === undefined || motion.phase === 'still') {
    return 'translate-x-0 opacity-100'
  }

  if (motion.phase === 'opening') {
    return 'translate-x-0 opacity-100 starting:translate-x-[22px] starting:opacity-0 transition-[translate,opacity] duration-300 ease-toy motion-reduce:transition-none'
  }

  return 'translate-x-[14px] opacity-0 transition-[translate,opacity] duration-170 ease-furl motion-reduce:transition-none'
}

/**
 * When one part moves, counted from the press. Opening, the part at the top
 * goes first and each one behind it follows a step later; closing, the order
 * turns round, so the panel empties from the bottom of what can be read
 * upwards. Both are capped at the same step, so a fold takes the same time
 * whether the aerial found nine channels or forty.
 */
export function foldPartDelay(
  index: number,
  motion: FoldMotion | undefined,
): string | undefined {
  if (motion === undefined || motion.phase === 'still' || !motion.staggered) {
    return undefined
  }

  const step = Math.min(index, LAST_STEP)

  return `${(motion.phase === 'closing' ? LAST_STEP - step : step) * STEP_MS}ms`
}
