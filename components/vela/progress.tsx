import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export type MeterTone = 'brand' | 'ok' | 'warn' | 'err'

const FILL_TONE: Record<MeterTone, string> = {
  brand: 'bg-brand',
  ok: 'bg-mint',
  warn: 'bg-lemon',
  err: 'bg-coral',
}

const TEXT_TONE: Record<MeterTone, string> = {
  brand: 'text-brand',
  ok: 'text-mint',
  warn: 'text-lemon',
  err: 'text-coral',
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

export function SignalMeter({
  channel,
  value,
  status,
  percent,
  tone = 'ok',
  className,
  ...props
}: ComponentProps<'div'> & {
  channel: string
  value: string
  status: string
  percent: number
  tone?: MeterTone
}) {
  return (
    <div data-slot="signal-meter" className={cn('', className)} {...props}>
      <div className="mb-[7px] flex items-baseline justify-between gap-3">
        <span className="truncate text-ui text-ink">{channel}</span>
        <span className="flex shrink-0 items-baseline gap-[9px]">
          <b className="font-code text-ui font-medium tabular-nums">{value}</b>
          <span className={cn('text-note font-medium', TEXT_TONE[tone])}>
            {status}
          </span>
        </span>
      </div>
      <ProgressBar value={percent} tone={tone} label={`${channel} ${value}`} />
    </div>
  )
}

export function Spinner({
  className,
  ...props
}: Omit<ComponentProps<'svg'>, 'children'>) {
  return (
    <svg
      data-slot="spinner"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('size-[17px] shrink-0 animate-spin', className)}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="8.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="40 17"
      />
    </svg>
  )
}
