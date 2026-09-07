'use client'

import { cn } from '@/lib/utils'

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
