import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import {
  SpotIllustration,
  type SpotName,
} from '@/components/vela/spot-illustration'

export function EmptyState({
  spot = 'antenna',
  title,
  titleLevel = 3,
  action,
  className,
  children,
  ...props
}: ComponentProps<'div'> & {
  spot?: SpotName | null
  title?: string
  titleLevel?: 2 | 3
  action?: ReactNode
}) {
  const Title = titleLevel === 2 ? 'h2' : 'h3'
  const said = title !== undefined || children !== undefined

  return (
    <div
      data-slot="empty-state"
      className={cn(
        'mx-auto flex w-full flex-col items-center gap-[calc(13rem/16)] rounded-xl border border-dashed border-line-strong bg-surface px-5 py-[calc(26rem/16)] text-center',
        className,
      )}
      {...props}
    >
      {(spot || said) && (
        <div className="flex flex-col items-center gap-2.5">
          {spot && (
            <SpotIllustration
              name={spot}
              className="drawn size-[calc(78rem/16)] [--stroke-length:200]"
            />
          )}
          {said && (
            <div className="flex flex-col items-center gap-[calc(9rem/16)]">
              {title && <Title className="heading text-h3">{title}</Title>}
              {children && (
                <p className="max-w-[calc(520rem/16)] text-ui text-ink-2">
                  {children}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {action}
    </div>
  )
}
