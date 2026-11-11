import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import type { StateTone } from '@/components/recordings/status-cell'

const SAY_TONE: Record<StateTone, string> = {
  ok: 'text-acc-text',
  warn: 'text-warn-text',
  err: 'text-rec-text',
  info: 'text-ink',
  mute: 'text-ink-2',
}

export function StateSay({
  tone = 'mute',
  bold = false,
  dot = true,
  className,
  children,
  ...props
}: ComponentProps<'span'> & {
  tone?: StateTone
  bold?: boolean
  dot?: boolean
}) {
  return (
    <span
      data-slot="state-say"
      data-state-say=""
      data-tone={tone}
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 text-ui whitespace-nowrap',
        SAY_TONE[tone],
        bold && 'font-bold',
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      )}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}
