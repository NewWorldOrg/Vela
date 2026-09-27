'use client'

import { cn } from '@/lib/utils'
import { SeekArrowGlyph } from '@/components/vela/icons'

export interface SeekFlash {
  way: 'back' | 'forward'
  seconds: number
  nth: number
}

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
        'pointer-events-none absolute top-1/2 flex size-[calc(110rem/16)] -translate-y-1/2 animate-player-seek-flash flex-col items-center justify-center gap-1.5 rounded-full bg-black/60',
        back ? 'left-[10%]' : 'right-[10%]',
      )}
    >
      <span className={cn('flex', back && 'rotate-180')}>
        {[0, 1, 2].map((nth) => (
          <SeekArrowGlyph
            key={nth}
            className="-mx-px animate-player-seek-arrow text-white"
            style={{ animationDelay: `${(back ? 2 - nth : nth) * 67}ms` }}
          />
        ))}
      </span>
      <span className="font-code text-sub leading-none font-medium text-white tabular-nums">
        {flash.seconds}秒
      </span>
    </div>
  )
}
