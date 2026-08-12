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
  title,
  action,
  className,
  children,
  ...props
}: ComponentProps<'div'> & {
  spot?: SpotName
  title?: string
  action?: ReactNode
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'rounded-xl border border-dashed border-line-strong bg-surface px-5 py-[26px] text-center',
        className,
      )}
      {...props}
    >
      <SpotIllustration name={spot} className="mx-auto size-[78px]" />
      {title && <h3 className="heading mt-2.5 text-h3">{title}</h3>}
      <p className="mx-auto mt-[9px] mb-[13px] max-w-[520px] text-ui text-ink-2">
        {children}
      </p>
      {action}
    </div>
  )
}
