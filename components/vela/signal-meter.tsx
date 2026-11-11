import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { InFull } from '@/components/vela/in-full'
import { type MeterTone, ProgressBar } from '@/components/vela/progress'

const TEXT_TONE: Record<MeterTone, string> = {
  brand: 'text-brand',
  ok: 'text-acc-text',
  warn: 'text-lemon',
  err: 'text-coral',
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
      <div className="mb-[calc(7rem/16)] flex items-baseline justify-between gap-3">
        <InFull says={channel} wraps="truncate text-ui text-ink">
          {channel}
        </InFull>
        <span className="flex shrink-0 items-baseline gap-[calc(9rem/16)]">
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
