import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function ChipDot({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden="true"
      className={cn('size-1.5 shrink-0 rounded-full bg-current', className)}
      {...props}
    />
  )
}
