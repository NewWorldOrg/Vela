'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { StationLogo } from '@/repository/channels'

const SLOT =
  'box-content inline-flex h-6 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border align-middle'

export function ChannelMark({
  logo,
  no,
  on,
  keepsTheSlot,
  className,
}: {
  logo?: StationLogo
  no?: string
  on?: boolean
  keepsTheSlot?: boolean
  className?: string
}) {
  const [unreachable, setUnreachable] = useState<string>()
  const href =
    logo?.declaration === 'inTheCommonDataTable' ? logo.href : undefined
  const drawn = href !== undefined && href !== unreachable ? href : undefined

  if (drawn === undefined && no === undefined) {
    return keepsTheSlot ? (
      <span
        aria-hidden="true"
        className={cn(SLOT, 'border-transparent', className)}
      />
    ) : null
  }

  if (drawn === undefined) {
    return (
      <span
        className={cn(
          SLOT,
          'border-line bg-surface-2 font-code text-[11px] leading-none font-medium text-ink-2',
          on && 'border-brand-line bg-surface text-brand',
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
        SLOT,
        'border-line bg-logo-plate',
        on && 'border-brand-line',
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
        className="size-full object-contain"
      />
    </span>
  )
}
