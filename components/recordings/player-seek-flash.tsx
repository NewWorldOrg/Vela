'use client'

import { cn } from '@/lib/utils'

/** Which way the picture moved, and how far the run of presses has moved it. */
export interface SeekFlash {
  way: 'back' | 'forward'
  /** Seconds, adding up while the answer is still on the picture. */
  seconds: number
  /** Changes on every press so a second press restarts the animation. */
  nth: number
}

/**
 * What a seek press answers with: a mark at the side the picture went towards.
 *
 * Not the centre bezel. Measured on YouTube's live build, the arrow keys and
 * J / L do not reach `.ytp-bezel` at all — the handler is
 * `this.D ? this.D.SC(-1,5) : H6(this.kX, <svg>)` and `this.D` is always
 * present on desktop web, so the centre mark is dead code there. What actually
 * appears is `ytp-doubletap-ui-legacy`: a 110px circle at
 * `background-color:rgba(0,0,0,.6)`, placed at `left:.1*W-15px` or
 * `left:.8*W-30px`, hidden by `new g.DQ(this.hide,700,this)`, carrying three
 * arrows on staggered keyframes and a label reading `10秒`.
 *
 * Chromium's own `<video>` controls draw the same thing for a double tap —
 * three SVG arrows, `animation:700ms arrow-pulse`, delays 67ms and 134ms,
 * `kNumberOfSecondsToJump = 10` — which is two implementations arriving at the
 * same mark without copying each other's numbers. Shaka has a left/right
 * variant too. Nobody puts a seek in the middle.
 *
 * The two sides are placed symmetrically here. YouTube's are not (its back
 * mark centres near 13% of the width and its forward mark near 82%), and there
 * is no reading of that asymmetry that says anything: it is 15px of arithmetic
 * on one side and 30px on the other.
 *
 * The count adds up while the mark is still on the picture, as YouTube's does
 * (`a.C = b===a.K ? a.C+c : c`): four presses is one answer reading 40秒, not
 * four answers each reading 10秒.
 */
export function PlayerSeekFlash({ flash }: { flash?: SeekFlash }) {
  if (!flash) {
    return null
  }

  const back = flash.way === 'back'

  return (
    <div
      key={flash.nth}
      aria-hidden="true"
      data-slot="player-seek-flash"
      data-way={flash.way}
      className={cn(
        'pointer-events-none absolute top-1/2 flex size-[110px] -translate-y-1/2 animate-player-seek-flash flex-col items-center justify-center gap-1.5 rounded-full bg-black/60',
        back ? 'left-[10%]' : 'right-[10%]',
      )}
    >
      <span className={cn('flex', back && 'rotate-180')}>
        {[0, 1, 2].map((nth) => (
          <Arrow key={nth} nth={back ? 2 - nth : nth} />
        ))}
      </span>
      <span className="font-code text-[12px] leading-none font-medium text-white tabular-nums">
        {flash.seconds}秒
      </span>
    </div>
  )
}

/**
 * One of the three. A solid triangle rather than a stroked chevron: YouTube's
 * is built out of `border` on a zero-sized box and Chromium's is a filled
 * path, and at 8px a 1.6 stroke is most of the shape.
 */
function Arrow({ nth }: { nth: number }) {
  return (
    <svg
      viewBox="0 0 11 20"
      fill="currentColor"
      className="-mx-px h-5 w-[11px] animate-player-seek-arrow text-white"
      style={{ animationDelay: `${nth * 67}ms` }}
    >
      <path d="M0.6 0.4 10.4 10 0.6 19.6Z" />
    </svg>
  )
}
