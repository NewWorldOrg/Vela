import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function Surface({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="surface"
      className={cn(
        'rounded-lg bg-surface px-[calc(18rem/16)] py-4',
        className,
      )}
      {...props}
    />
  )
}
