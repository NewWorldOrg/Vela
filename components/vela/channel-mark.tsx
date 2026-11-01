'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { StationLogo } from '@/repository/channels'

/** How large the mark stands: the chip beside a name, the square beside a programme's title under the picture, or the badge as tall as a line that leads the channel's line in a row of the live column. */
export type ChannelMarkShape = 'chip' | 'square' | 'tile'

const SLOT: Record<ChannelMarkShape, string> = {
  chip: 'box-content inline-flex h-6 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border align-middle',
  square:
    'inline-flex size-[calc(52rem/16)] shrink-0 items-center justify-center overflow-hidden rounded-md align-middle',
  tile: 'inline-flex h-5 w-[calc(34rem/16)] shrink-0 items-center justify-center overflow-hidden rounded-[6px] align-middle',
}

const NUMBER: Record<ChannelMarkShape, string> = {
  chip: 'border-line bg-surface-2 font-code text-cap leading-none font-medium text-ink-2',
  square: 'bg-surface-2 font-code text-section leading-none font-bold text-ink',
  tile: 'bg-surface-2 font-code text-cap leading-none font-bold text-ink-2',
}

const PICTURE: Record<ChannelMarkShape, string> = {
  chip: 'size-[88%]',
  square: 'size-[82%]',
  tile: 'h-[80%] w-[86%]',
}

export function ChannelMark({
  logo,
  no,
  on,
  keepsTheSlot,
  shape = 'chip',
  className,
}: {
  logo?: StationLogo
  no?: string
  on?: boolean
  keepsTheSlot?: boolean
  shape?: ChannelMarkShape
  className?: string
}) {
  const [unreachable, setUnreachable] = useState<string>()
  const href =
    logo?.declaration === 'inTheCommonDataTable' ? logo.href : undefined
  const drawn = href !== undefined && href !== unreachable ? href : undefined
  const chip = shape === 'chip'

  if (drawn === undefined && no === undefined) {
    return keepsTheSlot ? (
      <span
        aria-hidden="true"
        className={cn(
          SLOT[shape],
          chip ? 'border-transparent' : 'bg-surface-2',
          className,
        )}
      />
    ) : null
  }

  if (drawn === undefined) {
    return (
      <span
        className={cn(
          SLOT[shape],
          NUMBER[shape],
          chip && on && 'border-brand-line bg-surface text-brand',
          className,
        )}
      >
        {no}
      </span>
    )
  }

  return (
    <span
      className={cn(
        SLOT[shape],
        chip ? 'border-line bg-logo-plate' : 'bg-logo-plate',
        shape === 'tile' && 'shadow-[inset_0_0_0_1px_var(--hair)]',
        chip && on && 'border-brand-line',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={drawn}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setUnreachable(drawn)}
        className={cn(PICTURE[shape], 'object-contain')}
      />
    </span>
  )
}
