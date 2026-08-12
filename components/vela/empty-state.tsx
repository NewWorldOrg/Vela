import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import {
  SpotIllustration,
  type SpotName,
} from '@/components/vela/spot-illustration'

/**
 * Nothing here yet: one small drawing, one line, one way forward. The panel is
 * a tint surface — no border, no shadow.
 */
export function EmptyState({
  spot = 'antenna',
  action,
  className,
  children,
  ...props
}: ComponentProps<'div'> & { spot?: SpotName; action?: ReactNode }) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'rounded-lg bg-tint-lavender px-5 py-[26px] text-center',
        className,
      )}
      {...props}
    >
      <SpotIllustration name={spot} className="mx-auto size-[78px]" />
      <p className="mx-auto mt-[9px] mb-[13px] max-w-[330px] text-ui text-ink-2">
        {children}
      </p>
      {action}
    </div>
  )
}
