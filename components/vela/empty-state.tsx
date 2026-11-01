import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Nothing to show: the words on a quiet face, and what to do next under them. */
export function EmptyState({
  title,
  titleLevel = 3,
  action,
  className,
  children,
  ...props
}: ComponentProps<'div'> & {
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
        'mx-auto flex w-full flex-col items-center gap-3.5 rounded-lg bg-surface px-6 py-8 text-center',
        className,
      )}
      {...props}
    >
      {said && (
        <div className="flex flex-col items-center gap-1.5">
          {title && <Title className="heading text-heading">{title}</Title>}
          {children && (
            <p className="max-w-[calc(520rem/16)] text-ui text-ink-2">
              {children}
            </p>
          )}
        </div>
      )}
      {action}
    </div>
  )
}
