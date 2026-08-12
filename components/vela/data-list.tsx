import type { ComponentProps, CSSProperties } from 'react'

import { cn } from '@/lib/utils'
import { tactileQuiet } from '@/components/vela/tactile'

type ListVars = CSSProperties & {
  '--data-list-cols'?: string
  '--data-list-min'?: string
}

/**
 * A list that is not boxed in. The outer frame is dropped entirely: the header
 * row gets `surface-2`, rows are separated by a dashed rule, and when the
 * columns need more room the list scrolls inside itself instead of pushing the
 * page sideways.
 *
 * `columns` is any `grid-template-columns` value and is shared by the header
 * and every row.
 */
export function DataList({
  columns,
  minWidth,
  className,
  style,
  ...props
}: ComponentProps<'div'> & { columns: string; minWidth?: number }) {
  return (
    <div
      data-slot="data-list"
      className={cn('overflow-x-auto', className)}
      style={
        {
          ...style,
          '--data-list-cols': columns,
          '--data-list-min': minWidth ? `${minWidth}px` : '0px',
        } as ListVars
      }
      {...props}
    />
  )
}

const GRID =
  'grid min-w-[var(--data-list-min)] grid-cols-[var(--data-list-cols)] gap-2'

export function DataListHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="data-list-header"
      className={cn(
        GRID,
        'items-center rounded-md bg-surface-2 px-[13px] py-[7px] text-micro font-bold tracking-[0.04em] text-ink-3',
        className,
      )}
      {...props}
    />
  )
}

export function DataListRow({
  className,
  muted,
  ...props
}: ComponentProps<'div'> & { muted?: boolean }) {
  return (
    <div
      data-slot="data-list-row"
      data-muted={muted ? '' : undefined}
      className={cn(
        GRID,
        'items-center border-b border-dashed border-line px-[13px] py-3 text-ui last:border-b-0',
        'hover:rounded-md hover:bg-surface-2',
        tactileQuiet,
        muted && 'text-ink-3',
        className,
      )}
      {...props}
    />
  )
}

/** The panel revealed under an expanded row — a tint surface, indented. */
export function DataListExpansion({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="data-list-expansion"
      className={cn(
        'border-b border-dashed border-line pt-0.5 pr-1 pb-3 pl-[42px]',
        className,
      )}
      {...props}
    />
  )
}
