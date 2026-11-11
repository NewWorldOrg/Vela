import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function OptionGroup({
  title,
  className,
  children,
  ...props
}: ComponentProps<'div'> & { title: string }) {
  return (
    <div
      data-slot="option-group"
      role="group"
      aria-label={title}
      className={cn(
        'flex flex-col items-start gap-[calc(26rem/16)] rounded-lg px-[calc(15rem/16)] py-[calc(13rem/16)]',
        className,
      )}
      {...props}
    >
      <span className="heading text-sub text-ink">{title}</span>
      {children}
    </div>
  )
}
