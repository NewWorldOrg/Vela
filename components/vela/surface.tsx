import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { pressable, still, tactile } from '@/components/vela/tactile'

/**
 * A plain grouping of information. No border, no shadow — only the surface
 * colour and whitespace separate it from the page. Borders and shadows are
 * reserved for things you can press.
 */
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

/**
 * A pastel panel. Sections are separated by colour rather than by a rule; the
 * text stays ink, and the panel gets neither a border nor a shadow because it
 * is not pressable. Use three or four tints per screen at most, each tied to a
 * meaning.
 */
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

/** The metric shown on a tint panel: label, big code-set value, unit. */
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

/**
 * A pressable tile — the one kind of "card" the system allows. It gets a
 * hairline, a hard offset shadow and the tactile motion precisely because it
 * can be pressed.
 */
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
