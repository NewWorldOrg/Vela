import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export type MeterTone = 'brand' | 'ok' | 'warn' | 'err'

const FILL_TONE: Record<MeterTone, string> = {
  brand: 'bg-accent',
  ok: 'bg-accent',
  warn: 'bg-lemon',
  err: 'bg-coral',
}

export function ProgressBar({
  value,
  tone = 'brand',
  label,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  value: number
  tone?: MeterTone
  label?: string
}) {
  return (
    <div
      data-slot="progress-bar"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-1 overflow-hidden rounded-full bg-surface-3', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-150 ease-out',
          FILL_TONE[tone],
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
