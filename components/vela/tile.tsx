import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { pressable, still, tactile } from '@/components/vela/tactile'

export function Tile({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      data-slot="tile"
      className={cn(
        'min-w-[calc(150rem/16)] flex-1 rounded-lg border border-line bg-surface px-[calc(15rem/16)] py-[calc(13rem/16)] text-left shadow-pop outline-none',
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
      className={cn('font-code text-note tabular-nums text-ink-2', className)}
      {...props}
    />
  )
}
