import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export type StatusTone = 'ok' | 'warn' | 'err' | 'off'

const DOT_TONE: Record<StatusTone, string> = {
  ok: 'bg-mint',
  warn: 'bg-lemon',
  err: 'bg-coral',
  off: 'bg-ink-3',
}

/**
 * The base form for state: a 7px dot plus text. The dot is decorative — the
 * text always carries the meaning, and nothing blinks.
 */
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
        'inline-block size-[7px] shrink-0 rounded-full',
        DOT_TONE[tone],
        className,
      )}
      {...props}
    />
  )
}

export function StatusText({
  tone = 'ok',
  className,
  children,
  ...props
}: ComponentProps<'span'> & { tone?: StatusTone }) {
  return (
    <span
      data-slot="status-text"
      className={cn(
        'inline-flex items-center gap-[7px] text-sub whitespace-nowrap text-ink-2',
        className,
      )}
      {...props}
    >
      <StatusDot tone={tone} />
      {children}
    </span>
  )
}

/** The dot that sits inside a chip; it inherits the chip's text colour. */
export function ChipDot({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden="true"
      className={cn('size-1.5 shrink-0 rounded-full bg-current', className)}
      {...props}
    />
  )
}
