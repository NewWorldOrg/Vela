import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import {
  SpotIllustration,
  type SpotName,
} from '@/components/vela/spot-illustration'

/**
 * Nothing here yet: one small drawing, one line, one way forward. The panel is
 * a surface with a dashed hairline — no shadow.
 */
export function EmptyState({
  spot = 'antenna',
  title,
  titleLevel = 3,
  action,
  className,
  children,
  ...props
}: ComponentProps<'div'> & {
  spot?: SpotName
  title?: string
  /**
   * The heading rank, for pages where the panel is not nested under a section
   * of its own. The look does not change with it.
   */
  titleLevel?: 2 | 3
  action?: ReactNode
}) {
  const Title = titleLevel === 2 ? 'h2' : 'h3'

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
      {title && <Title className="heading mt-2.5 text-h3">{title}</Title>}
      {children && (
        <p className="mx-auto mt-[9px] mb-[13px] max-w-[520px] text-ui text-ink-2">
          {children}
        </p>
      )}
      {action}
    </div>
  )
}
