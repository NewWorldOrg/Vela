'use client'

import { cn } from '@/lib/utils'
import { PauseGlyph, PlayGlyph, VolumeIcon } from '@/components/vela/icons'

export type PlayerBezel =
  { was: 'play' | 'pause' } | { was: 'volume'; level: number }

export function PlayerCenter({
  standing,
  onStanding,
  bezel,
  className,
}: {
  standing?: 'play' | 'pause'
  onStanding?: () => void
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
