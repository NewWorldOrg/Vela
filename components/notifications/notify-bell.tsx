'use client'

import { cn } from '@/lib/utils'
import { BellIcon } from '@/components/vela/icons'

export function NotifyBell({
  className,
  label,
}: {
  className?: string
  label?: string
}) {
  return (
    <span
      data-slot="notify-bell"
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center text-warn',
        className,
      )}
    >
      <BellIcon aria-hidden="true" className="size-3.5 [stroke-width:1.9]" />
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
