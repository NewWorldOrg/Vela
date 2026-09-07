'use client'

import { cn } from '@/lib/utils'

export function PlayerVolume({
  level,
  onChoose,
  className,
}: {
  level: number
  onChoose: (next: number) => void
  className?: string
}) {
  const played = Math.round(level * 100)

  return (
    <label
      data-slot="input-area"
      className={cn('relative block w-[68px] shrink-0', className)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/30"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full bg-white"
        style={{ width: `${played}%` }}
      />
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={played}
        aria-label="音量"
        aria-valuetext={`${played}%`}
        onChange={(event) => onChoose(Number(event.currentTarget.value) / 100)}
        className={cn(
          'relative block h-11 w-full cursor-pointer appearance-none bg-transparent outline-none',
          'focus-visible:shadow-ring focus-visible:rounded-full',
          '[&::-webkit-slider-runnable-track]:h-11 [&::-webkit-slider-runnable-track]:bg-transparent',
          '[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:mt-[16px]',
          '[&::-moz-range-track]:h-11 [&::-moz-range-track]:bg-transparent',
          '[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white',
        )}
      />
    </label>
  )
}
