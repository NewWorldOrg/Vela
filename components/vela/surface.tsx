import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { pressable, still, tactile } from '@/components/vela/tactile'

export function Surface({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="surface"
      className={cn('rounded-lg bg-surface px-[18px] py-4', className)}
      {...props}
    />
  )
}

export type TintName =
  'accent' | 'lavender' | 'salmon' | 'butter' | 'sage' | 'sky' | 'blush'

const TINT_CLASS: Record<TintName, string> = {
  accent: 'bg-brand-soft',
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
        'rounded-lg px-[15px] py-[13px] text-ink',
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
      <span className="my-px block font-code text-[20px] leading-none font-medium tabular-nums">
        {value}
      </span>
      {unit && <span className="text-cap text-ink-2">{unit}</span>}
    </>
  )
}

export function Tile({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      data-slot="tile"
      className={cn(
        'min-w-[150px] flex-1 rounded-lg border border-line bg-surface px-[15px] py-[13px] text-left shadow-pop outline-none',
        'hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        'disabled:opacity-45 disabled:shadow-pop-none disabled:hover:shadow-pop-none',
        tactile,
        pressable,
        still,
        className,
      )}
      {...props}
    />
  )
}

export function TileTitle({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('heading block text-ui', className)} {...props} />
}

export function TileMeta({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn('font-code text-note tabular-nums text-ink-3', className)}
      {...props}
    />
  )
}
