'use client'

import { cn } from '@/lib/utils'

export function ReserveRing({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-3.5 shrink-0 rounded-full border-2 border-warn',
        className,
      )}
    />
  )
}
