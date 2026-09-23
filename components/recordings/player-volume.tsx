'use client'

import type { CSSProperties } from 'react'

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
      className={cn('relative block w-[calc(68rem/16)] shrink-0', className)}
    >
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={played}
        aria-label="音量"
        aria-valuetext={`${played}%`}
        onChange={(event) => onChoose(Number(event.currentTarget.value) / 100)}
        style={{ '--volume-ratio': played / 100 } as CSSProperties}
        className="volume-range relative block w-full cursor-pointer outline-none focus-visible:rounded-full focus-visible:shadow-ring"
      />
    </label>
  )
}
