import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function Crumb({ className, children, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="crumb"
      className={cn(
        'mb-[calc(5rem/16)] text-cap text-ink-2 phone:hidden',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  )
}

export function CrumbCurrent({ className, ...props }: ComponentProps<'b'>) {
  return <b className={cn('font-medium text-ink-2', className)} {...props} />
}
