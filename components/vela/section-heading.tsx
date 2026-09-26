import type { ComponentProps, ComponentType } from 'react'

import { cn } from '@/lib/utils'
import { MarkStar, type IconProps } from '@/components/vela/icons'

export function SectionHeading({
  mark: Mark = MarkStar,
  level = 2,
  className,
  children,
  ...props
}: ComponentProps<'h2'> & {
  mark?: ComponentType<IconProps>
  level?: 2 | 3 | 4
}) {
  const Tag = `h${level}` as const

  return (
    <Tag
      data-slot="section-heading"
      className={cn(
        'heading mb-[calc(11rem/16)] flex items-center gap-[calc(7rem/16)] text-ui text-ink',
        className,
      )}
      {...props}
    >
      <Mark className="drawn stamps size-[calc(18rem/16)] text-brand [--stroke-length:60]" />
      {children}
      <span
        aria-hidden="true"
        className="h-px flex-1 border-t border-dashed border-line"
      />
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
        <h1 className="heading text-h3 leading-[1.45]">{children}</h1>
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
