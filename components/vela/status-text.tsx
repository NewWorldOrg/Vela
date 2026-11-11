import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { type StatusTone, StatusDot } from '@/components/vela/status'

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
        'inline-flex items-center gap-[calc(7rem/16)] text-sub whitespace-nowrap text-ink-2',
        className,
      )}
      {...props}
    >
      <StatusDot tone={tone} />
      {children}
    </span>
  )
}
