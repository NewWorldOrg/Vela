import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export type StatusTone = 'ok' | 'warn' | 'err' | 'off'

const DOT_TONE: Record<StatusTone, string> = {
  ok: 'bg-accent',
  warn: 'bg-warn',
  err: 'bg-rec',
  off: 'bg-ink-3',
}

export function StatusDot({
  tone = 'ok',
  className,
  ...props
}: ComponentProps<'span'> & { tone?: StatusTone }) {
  return (
    <span
      data-slot="status-dot"
      data-tone={tone}
      aria-hidden="true"
      className={cn(
        'inline-block size-[calc(7rem/16)] shrink-0 rounded-full',
        DOT_TONE[tone],
        className,
      )}
      {...props}
    />
  )
}
