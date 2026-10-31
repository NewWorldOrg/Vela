import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function SectionHeading({
  level = 2,
  className,
  children,
  ...props
}: ComponentProps<'h2'> & {
  level?: 2 | 3 | 4
}) {
  const Tag = `h${level}` as const

  return (
    <Tag
      data-slot="section-heading"
      className={cn(
        'heading mb-3 flex items-baseline gap-2 text-heading text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function PageHeading({
  description,
  action,
  className,
  children,
  ...props
}: ComponentProps<'div'> & {
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div
      data-slot="page-heading"
      className={cn('flex items-start gap-3', className)}
      {...props}
    >
      <div className="min-w-0">
        <h1 className="heading text-heading leading-[1.45] phone:sr-only">
          {children}
        </h1>
        {description && (
          <p className="mt-px text-note text-ink-2">{description}</p>
        )}
      </div>
      {action && (
        <div className="ml-auto shrink-0 pt-[calc(3rem/16)]">{action}</div>
      )}
    </div>
  )
}
