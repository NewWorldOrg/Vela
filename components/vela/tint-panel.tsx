import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export type TintName =
  'accent' | 'lavender' | 'salmon' | 'butter' | 'sage' | 'sky' | 'blush'

export const TINT_CLASS: Record<TintName, string> = {
  accent: 'bg-surface',
  lavender: 'bg-tint-lavender',
  salmon: 'bg-tint-salmon',
  butter: 'bg-tint-butter',
  sage: 'bg-tint-sage',
  sky: 'bg-tint-sky',
  blush: 'bg-tint-blush',
}

export function TintPanel({
  tint = 'lavender',
  className,
  ...props
}: ComponentProps<'div'> & { tint?: TintName }) {
  return (
    <div
      data-slot="tint-panel"
      data-tint={tint}
      className={cn(
        'rounded-lg px-[calc(15rem/16)] py-[calc(13rem/16)] text-ink',
        TINT_CLASS[tint],
        className,
      )}
      {...props}
    />
  )
}

export function TintMetric({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit?: string
}) {
  return (
    <>
      <span className="heading block text-ui">{label}</span>
      <span className="my-px block font-code text-[calc(20rem/16)] leading-none font-medium tabular-nums">
        {value}
      </span>
      {unit && <span className="text-cap text-ink-2">{unit}</span>}
    </>
  )
}
