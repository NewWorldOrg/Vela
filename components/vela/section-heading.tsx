import type { ComponentProps, ComponentType } from 'react'

import { cn } from '@/lib/utils'
import { MarkStar, type IconProps } from '@/components/vela/icons'

/** A section's heading: a star drawn in and stamped as it arrives, the words, and a dotted rule to the edge. */
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
        'heading mb-3 flex items-center gap-[calc(7rem/16)] text-heading text-ink',
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
