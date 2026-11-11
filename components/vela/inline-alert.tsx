'use client'

import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { type BannerTone, TONE_ICON } from '@/components/vela/banner'

/** An alert inside a form or a dialog is small enough to wear its colour as a soft ground. */
const ALERT_CLASS: Record<'warn' | 'danger', string> = {
  warn: 'bg-warn-soft text-warn-text',
  danger: 'bg-rec-soft text-rec-text',
}

export function InlineAlert({
  tone = 'warn',
  className,
  children,
  ...props
}: ComponentProps<'div'> & { tone?: Exclude<BannerTone, 'info' | 'success'> }) {
  const ToneIcon = TONE_ICON[tone]

  return (
    <div
      data-slot="inline-alert"
      data-tone={tone}
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-[calc(9rem/16)] rounded-md px-3 py-2 text-sub',
        ALERT_CLASS[tone],
        className,
      )}
      {...props}
    >
      <ToneIcon className="mt-[calc(3rem/16)] size-[calc(15rem/16)]" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
